import Tile from "../components/Tile.jsx";
import { STATE } from "../game/scoring.js";

// Onboarding / rules (Pehea e pāʻani ai). Auto-shown once per device; also
// reachable via ? in the app bar. Hawaiian-first, grouped copy.

const EXAMPLE = [
  { glyph: "a", state: STATE.CORRECT, name: "Kūpono", en: "right letter, right spot" },
  { glyph: "l", state: STATE.PRESENT, name: "Aia", en: "right letter, wrong spot" },
  { glyph: "o", state: STATE.WRONG_MARK, name: "Kahakō hewa", en: "right vowel, fix the kahakō" },
  { glyph: "h", state: STATE.ABSENT, name: "ʻAʻohe", en: "not in the word" },
];

function Section({ title, en, children }) {
  return (
    <section className="mb-3.5">
      <h3 className="font-extrabold text-ink text-[15px]">
        {title} <span className="text-faint font-medium">({en})</span>
      </h3>
      <div className="mt-1.5 text-[14px] text-ink-soft leading-snug">{children}</div>
    </section>
  );
}

export default function Onboarding({ onStart }) {
  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-[520px] mx-auto px-5 py-4">
        <div className="flex items-baseline gap-2.5 flex-wrap mb-4">
          <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-ink leading-none">
            Pehea e pāʻani ai
          </h1>
          <span className="text-faint">How to play</span>
        </div>

        <Section title="Nā Kānāwai" en="Rules">
          <ul className="list-disc pl-5 space-y-1">
            <li>Koho i ka huaʻōlelo Hawaiʻi huna — guess the hidden Hawaiian word in 8 tries or less.</li>
            <li>Ma hope o kēlā me kēia koho, kala nā kīʻaha — after each submitted guess the tiles change color to show how close you are.</li>
            <li>Loaʻa nō ka wehewehe ke lanakila a eo paha — win or lose, the definition(s) will be revealed.</li>
          </ul>
          <div className="mt-3 flex gap-1.5">
            {EXAMPLE.map((e, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 w-[74px]">
                <Tile glyph={e.glyph} state={e.state} size={42} reveal />
                <div className="text-[11px] font-bold text-ink text-center leading-tight">{e.name}</div>
                <div className="text-[10px] text-faint text-center leading-tight">{e.en}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="ʻŌlelo hoʻohani" en="Hints">
          <p>ʻEkolu kōkua: <b>Wehewehe</b> (reveal definition — you can use this only once), <b>ʻĀpana</b> (reveal a piece — this won't be available every day), <b>Hua</b> (reveal a letter — you cannot use this for the last letter of the word). Each hint spends one of your 8 guesses — and you can't use a hint on your final guess.</p>
        </Section>

        <Section title="Hoʻomanaʻo" en="Remember">
          <p>The ʻokina (ʻ) takes its own tile — it is a letter. A vowel's kahakō must match exactly: <b>a</b> and <b>ā</b> are different letters.</p>
        </Section>

        <Section title="Manaʻo" en="Thoughts">
          <p>8 guesses — one for each main island. Difficulty rises Monday → Friday; weekends have no new word. Words refresh at midnight Hawaiʻi Time.</p>
        </Section>

        <button
          onClick={onStart}
          className="w-full rounded-btn py-2.5 font-bold text-[16px] mt-1"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          E hoʻomaka (Start playing)
        </button>
      </div>
    </div>
  );
}
