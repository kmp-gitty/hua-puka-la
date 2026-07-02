#!/usr/bin/env node
// classify-pieces — the seal-time Reveal Piece classification pass (Build Spec §5).
// Batch, offline, one-time. Judges each extracted candidate piece as Tier 1 /
// Tier 2 / reject via the Anthropic API (Opus 4.8), using the Batch API (~50%
// cheaper, async). The model classifies REAL pieces only — it never invents a
// piece or a meaning.
//
//   input:  data/piece-candidates.json  (from extract-pieces.mjs)
//   output: data/piece-verdicts.json    (all raw verdicts — audit + Learn v2 seed)
//           data/pieces.json            (selected best piece per word, for seal-week)
//           data/.batch-id              (in-flight batch id, for resume)
//
// Run:  node --env-file=.env scripts/classify-pieces.mjs        (ANTHROPIC_API_KEY in .env)
//   or: ANTHROPIC_API_KEY=... node scripts/classify-pieces.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CANDIDATES = join(ROOT, "data/piece-candidates.json");
const VERDICTS = join(ROOT, "data/piece-verdicts.json");
const PIECES = join(ROOT, "data/pieces.json");
const BATCH_ID_FILE = join(ROOT, "data/.batch-id");

const MODEL = "claude-opus-4-8";

const SYSTEM = `You classify whether a smaller Hawaiian word embedded inside a larger Hawaiian word is a genuine "piece" that teaches something about the larger word — for a language-learning word game. You are given the larger word, its senses, and a list of REAL embedded words (each already verified to be a real dictionary word). Classify each candidate. Never invent a piece or a meaning; judge only what you are given.

For each candidate assign exactly one verdict:
- "tier1": the piece's meaning LITERALLY appears in the larger word's definition. Example: kaualani → "ua" (rain); the word means "the rain of the heavens", so rain literally appears.
- "tier2": the piece meaningfully RELATES as a hint, using the piece's contextually-relevant sense. Example: hāhā (a plant) → "hā" (leaf stalk) — a real botanical relationship via that sense of the polysemous hā.
- "reject": grammatical particles (e.g. ʻo, ia, kā, ke, ka, na, no, ma, i, e, a used as a function word), coincidental substrings with no real relationship (e.g. akua → "ua" rain is coincidental — reject), or ambiguous/misleading links.

Be conservative: when in doubt between tier2 and reject, reject. A good piece should make a player go "ah, that makes sense" — not mislead them.

For each candidate also return:
- relevant_piece_sense: the specific sense/definition of the piece you judged by (for tier1/tier2), or "" for reject.
- word_sense_index: the 0-based index into the larger word's listed senses that the piece best pairs with (for tier1/tier2), or -1 for reject.
- rationale: one short human-readable line justifying the verdict (shown to an operator; also seeds a future morpheme-breakdown feature).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["piece_word", "verdict", "relevant_piece_sense", "word_sense_index", "rationale"],
        properties: {
          piece_word: { type: "string" },
          verdict: { type: "string", enum: ["tier1", "tier2", "reject"] },
          relevant_piece_sense: { type: "string" },
          word_sense_index: { type: "integer" },
          rationale: { type: "string" },
        },
      },
    },
  },
};

function userContent(entry) {
  const senses = entry.meanings.map((m, i) => `  [${i}] ${m}`).join("\n");
  const cands = entry.candidates
    .map((c) => `  - "${c.piece_word}": ${c.meanings.slice(0, 4).join("; ")}`)
    .join("\n");
  return `Larger word: ${entry.word}\nIts senses:\n${senses}\n\nEmbedded candidate pieces to classify:\n${cands}`;
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const entries = JSON.parse(readFileSync(CANDIDATES, "utf8"));
// custom_id must be simple ascii; index into entries, map back after.
const idFor = (i) => `w${i}`;
const indexFromId = (id) => Number(id.slice(1));

async function submitBatch() {
  const requests = entries.map((entry, i) => ({
    custom_id: idFor(i),
    params: {
      model: MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: userContent(entry) }],
    },
  }));
  console.log(`Submitting batch: ${requests.length} requests (${MODEL})...`);
  const batch = await client.messages.batches.create({ requests });
  writeFileSync(BATCH_ID_FILE, batch.id);
  console.log(`  batch id: ${batch.id} (saved to data/.batch-id)`);
  return batch.id;
}

async function waitForBatch(id) {
  let delay = 5000;
  for (;;) {
    const batch = await client.messages.batches.retrieve(id);
    const c = batch.request_counts;
    process.stdout.write(
      `\r  status=${batch.processing_status}  processing=${c.processing} succeeded=${c.succeeded} errored=${c.errored}   `,
    );
    if (batch.processing_status === "ended") {
      process.stdout.write("\n");
      return;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 30000);
  }
}

function parseVerdicts(message) {
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) return null;
  try {
    return JSON.parse(textBlock.text).verdicts ?? [];
  } catch {
    return null;
  }
}

// Choose the best surviving piece for a word: Tier 1 over Tier 2; within a tier,
// the candidate order is already shortest-then-rightmost.
function selectPiece(entry, verdictsByPiece) {
  for (const tier of ["tier1", "tier2"]) {
    for (const cand of entry.candidates) {
      const v = verdictsByPiece.get(cand.piece_word);
      if (v && v.verdict === tier) {
        const senseIdx =
          v.word_sense_index >= 0 && v.word_sense_index < entry.meanings.length
            ? v.word_sense_index
            : 0;
        return {
          piece_word: cand.piece_word,
          piece_def: v.relevant_piece_sense || cand.meanings[0],
          tier: tier === "tier1" ? 1 : 2,
          rationale: v.rationale,
          word_sense_index: senseIdx,
        };
      }
    }
  }
  return null;
}

async function main() {
  let batchId = existsSync(BATCH_ID_FILE) ? readFileSync(BATCH_ID_FILE, "utf8").trim() : null;
  if (batchId) {
    console.log(`Resuming existing batch ${batchId} (delete data/.batch-id to start fresh).`);
  } else {
    batchId = await submitBatch();
  }

  await waitForBatch(batchId);

  console.log("Collecting results...");
  const rawByWord = {};
  const pieces = {};
  let ok = 0, failed = 0, tier1 = 0, tier2 = 0, none = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const entry = entries[indexFromId(result.custom_id)];
    if (result.result.type !== "succeeded") {
      failed++;
      continue;
    }
    const verdicts = parseVerdicts(result.result.message);
    if (!verdicts) {
      failed++;
      continue;
    }
    ok++;
    rawByWord[entry.word] = verdicts;
    const byPiece = new Map(verdicts.map((v) => [v.piece_word, v]));
    const piece = selectPiece(entry, byPiece);
    pieces[entry.word] = piece;
    if (!piece) none++;
    else if (piece.tier === 1) tier1++;
    else tier2++;
  }

  writeFileSync(VERDICTS, JSON.stringify(rawByWord));
  writeFileSync(PIECES, JSON.stringify(pieces));

  console.log(`\nclassify-pieces done:`);
  console.log(`  results ok:      ${ok}   failed: ${failed}`);
  console.log(`  words with piece: ${tier1 + tier2}  (tier1=${tier1}, tier2=${tier2})`);
  console.log(`  no usable piece:  ${none}`);
  console.log(`  wrote ${PIECES}`);
  console.log(`  wrote ${VERDICTS}`);
  console.log(`\nNext: re-seal so weeks pick up real pieces →  node scripts/seal-week.mjs --weeks 4 --reseal`);
}

main().catch((e) => {
  console.error("\nclassify-pieces failed:", e.message);
  process.exit(1);
});
