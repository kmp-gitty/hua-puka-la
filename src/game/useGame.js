// useGame — the per-game reducer (Build Spec §8). Owns the guess loop, the
// four-state scoring wiring, hints (which burn guess rows), Reveal Letter
// locking, key status, win/loss, and local persistence + analytics.

import { useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { scoreGuess, STATE, keyStatusFor, mergeKeyStatus } from "./scoring.js";
import { TOTAL_GUESSES, HINTS } from "./constants.js";
import { saveGame, loadGame, saveResult } from "./persistence.js";
import { track, EVENTS } from "./analytics.js";

function emptyRow(length, locked) {
  const row = new Array(length).fill("");
  for (const [i, g] of Object.entries(locked)) row[Number(i)] = g;
  return row;
}

function makeInitial(puzzle, persisted) {
  const answer = puzzle.glyphs;
  const base = {
    guesses: [], // [{ glyphs, states }]
    locked: {}, // index -> glyph (Reveal Letter)
    keyStatus: {}, // glyph -> correct|present|absent
    hintsUsed: 0,
    usedHints: { [HINTS.DEFINITION]: false, [HINTS.PIECE]: false },
    firstHintConfirmed: false,
    gameOver: false,
    won: false,
  };
  const restored = persisted ? { ...base, ...persisted } : base;
  return {
    ...restored,
    currentRow: emptyRow(answer.length, restored.locked),
    // transient UI state (never persisted)
    shakeToken: 0,
    invalidMsg: null,
    openPanel: null, // 'definition' | 'piece' | null
    pendingHint: null, // hint awaiting first-use confirm
  };
}

// positions known to be correct (from submitted guesses or Reveal Letter locks)
function knownPositions(state, answer) {
  const known = new Set(Object.keys(state.locked).map(Number));
  for (const g of state.guesses) {
    g.states.forEach((s, i) => {
      if (s === STATE.CORRECT) known.add(i);
    });
  }
  return known;
}

function reducer(state, action) {
  const { answer, acceptSet } = action.ctx;
  switch (action.type) {
    case "TYPE": {
      if (state.gameOver) return state;
      const row = [...state.currentRow];
      const i = row.findIndex((g, idx) => g === "" && !(idx in state.locked));
      if (i === -1) return state; // row full
      row[i] = action.glyph;
      return { ...state, currentRow: row, invalidMsg: null };
    }
    case "DELETE": {
      if (state.gameOver) return state;
      const row = [...state.currentRow];
      for (let i = row.length - 1; i >= 0; i--) {
        if (i in state.locked) continue;
        if (row[i] !== "") {
          row[i] = "";
          return { ...state, currentRow: row, invalidMsg: null };
        }
      }
      return state;
    }
    case "SUBMIT": {
      if (state.gameOver) return state;
      const row = state.currentRow;
      if (row.some((g) => g === "")) {
        return { ...state, shakeToken: state.shakeToken + 1, invalidMsg: "Piha ʻole (incomplete)" };
      }
      const guessWord = row.join("").normalize("NFC");
      if (!acceptSet.has(guessWord)) {
        // invalid: rejected, shake, NO guess consumed
        return { ...state, shakeToken: state.shakeToken + 1, invalidMsg: "ʻAʻole i loaʻa (not in word list)" };
      }
      const states = scoreGuess(row, answer);
      const guesses = [...state.guesses, { glyphs: row, states }];
      // key status
      const keyStatus = { ...state.keyStatus };
      row.forEach((g, i) => {
        const ks = keyStatusFor(states[i]);
        keyStatus[g] = mergeKeyStatus(keyStatus[g], ks);
      });
      const won = states.every((s) => s === STATE.CORRECT);
      const guessesLeft = TOTAL_GUESSES - guesses.length - state.hintsUsed;
      const gameOver = won || guessesLeft <= 0;

      track(EVENTS.GUESS_SUBMITTED, {
        guessIndex: guesses.length,
        correct: states.filter((s) => s === STATE.CORRECT).length,
        present: states.filter((s) => s === STATE.PRESENT).length,
        wrongMark: states.filter((s) => s === STATE.WRONG_MARK).length,
        absent: states.filter((s) => s === STATE.ABSENT).length,
      });

      return {
        ...state,
        guesses,
        keyStatus,
        won,
        gameOver,
        currentRow: gameOver ? state.currentRow : emptyRow(answer.length, state.locked),
      };
    }
    case "REQUEST_HINT": {
      // first hint of the game requires confirm; silent thereafter
      if (!state.firstHintConfirmed) return { ...state, pendingHint: action.hint };
      return reducer(state, { type: "APPLY_HINT", hint: action.hint, ctx: action.ctx });
    }
    case "CONFIRM_HINT": {
      const hint = state.pendingHint;
      if (!hint) return state;
      const confirmed = { ...state, firstHintConfirmed: true, pendingHint: null };
      return reducer(confirmed, { type: "APPLY_HINT", hint, ctx: action.ctx });
    }
    case "CANCEL_HINT":
      return { ...state, pendingHint: null };
    case "GIVE_UP": {
      if (state.gameOver) return state;
      return { ...state, gameOver: true, won: false, openPanel: null, pendingHint: null };
    }
    case "APPLY_HINT": {
      // Reopening an already-viewed Definition/Piece is ALWAYS free — allowed
      // even on the final guess. Check this before the guess-consuming guard.
      if (
        (action.hint === HINTS.DEFINITION || action.hint === HINTS.PIECE) &&
        state.usedHints[action.hint]
      ) {
        track(action.hint === HINTS.DEFINITION ? EVENTS.DEFINITION_VIEWED : EVENTS.PIECE_VIEWED, { reopen: true });
        return { ...state, openPanel: action.hint };
      }

      const guessesLeft = TOTAL_GUESSES - state.guesses.length - state.hintsUsed;
      if (guessesLeft <= 1) return state; // no NEW hint on the final guess

      if (action.hint === HINTS.LETTER) {
        const known = knownPositions(state, answer);
        const unknown = answer.map((_, i) => i).filter((i) => !known.has(i));
        if (unknown.length < 2) return state; // never reveal the last unknown
        // pick a pseudo-random unknown position
        const pick = unknown[Math.floor(Math.random() * unknown.length)];
        const locked = { ...state.locked, [pick]: answer[pick] };
        const row = [...state.currentRow];
        row[pick] = answer[pick];
        const hintsUsed = state.hintsUsed + 1;
        track(EVENTS.HINT_USED, { hint: HINTS.LETTER });
        // burning a row can end the game if it exhausts the budget
        const left = TOTAL_GUESSES - state.guesses.length - hintsUsed;
        return { ...state, locked, currentRow: row, hintsUsed, gameOver: left <= 0 ? state.gameOver : state.gameOver };
      }

      // Definition / Piece: first use spends a guess (reopen handled above).
      const usedHints = { ...state.usedHints, [action.hint]: true };
      const hintsUsed = state.hintsUsed + 1;
      track(EVENTS.HINT_USED, { hint: action.hint });
      track(action.hint === HINTS.DEFINITION ? EVENTS.DEFINITION_VIEWED : EVENTS.PIECE_VIEWED, { reopen: false });
      return { ...state, usedHints, hintsUsed, openPanel: action.hint };
    }
    case "OPEN_PANEL":
      return { ...state, openPanel: action.panel };
    case "CLOSE_PANEL":
      return { ...state, openPanel: null };
    default:
      return state;
  }
}

export function useGame(puzzle, acceptSet, dateKey) {
  const [state, rawDispatch] = useReducer(
    reducer,
    undefined,
    () => makeInitial(puzzle, loadGame(dateKey)),
  );
  const ctx = useMemo(
    () => ({ answer: puzzle.glyphs, acceptSet: acceptSet ?? new Set() }),
    [puzzle, acceptSet],
  );
  const dispatch = useCallback((action) => rawDispatch({ ...action, ctx }), [ctx]);

  // announce puzzle start once
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current && state.guesses.length === 0 && !state.gameOver) {
      startedRef.current = true;
      track(EVENTS.PUZZLE_STARTED, { slot: puzzle.dayMeta?.slot, length: puzzle.length });
    }
  }, [state.guesses.length, state.gameOver, puzzle]);

  // persist game progress (only durable fields)
  useEffect(() => {
    const { guesses, locked, keyStatus, hintsUsed, usedHints, firstHintConfirmed, gameOver, won } = state;
    saveGame(dateKey, { guesses, locked, keyStatus, hintsUsed, usedHints, firstHintConfirmed, gameOver, won });
  }, [state, dateKey]);

  // record result + fire solved/failed exactly once when the game ends
  const endedRef = useRef(false);
  useEffect(() => {
    if (state.gameOver && !endedRef.current) {
      endedRef.current = true;
      // Total guess rows consumed = submitted word guesses + burned hint rows.
      const guessesUsed = state.guesses.length + state.hintsUsed;
      saveResult(dateKey, {
        won: state.won,
        guessesUsed,
        hintsUsed: state.hintsUsed,
        word: puzzle.word,
        slot: puzzle.dayMeta?.slot,
      });
      track(state.won ? EVENTS.SOLVED : EVENTS.FAILED, { guessesUsed, hintsUsed: state.hintsUsed });
    }
  }, [state.gameOver, state.won, state.guesses.length, state.hintsUsed, dateKey, puzzle]);

  const derived = useMemo(() => {
    const guessesLeft = TOTAL_GUESSES - state.guesses.length - state.hintsUsed;
    const activeRow = state.guesses.length;
    const rowsAvailable = TOTAL_GUESSES - state.hintsUsed; // rows not burned
    const known = knownPositions(state, puzzle.glyphs);
    const unknownCount = puzzle.glyphs.length - known.size;
    return {
      guessesLeft,
      activeRow,
      rowsAvailable,
      canHint: guessesLeft > 1 && !state.gameOver,
      canRevealLetter: guessesLeft > 1 && !state.gameOver && unknownCount >= 2,
      pieceAvailable: puzzle.piece != null,
      defAvailable: puzzle.defHint != null,
    };
  }, [state, puzzle]);

  return { state, dispatch, derived };
}
