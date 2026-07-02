import { useEffect } from "react";
import Board from "../components/Board.jsx";
import Keyboard from "../components/Keyboard.jsx";
import HintBand from "../components/HintBand.jsx";
import RevealPanel from "../components/RevealPanel.jsx";
import { ConfirmSheet } from "../components/Sheet.jsx";
import AppBar from "../components/AppBar.jsx";
import WinReveal from "./WinReveal.jsx";
import LossReveal from "./LossReveal.jsx";
import { useGame } from "../game/useGame.js";
import { KEY_ROWS } from "../game/constants.js";

const TYPEABLE = new Set([...KEY_ROWS.consonants, ...KEY_ROWS.plainVowels, ...KEY_ROWS.macronVowels]);

export default function DailyPuzzle({ puzzle, acceptSet, dateKey, dayTitle, onRules, onStats, onToggleTheme, theme, onDone }) {
  const { state, dispatch, derived } = useGame(puzzle, acceptSet, dateKey);

  // physical keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (state.gameOver || state.pendingHint || state.openPanel) return;
      if (e.key === "Enter") dispatch({ type: "SUBMIT" });
      else if (e.key === "Backspace") dispatch({ type: "DELETE" });
      else if (TYPEABLE.has(e.key)) dispatch({ type: "TYPE", glyph: e.key });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.gameOver, state.pendingHint, state.openPanel, dispatch]);

  if (state.gameOver && state.won) {
    return <WinReveal puzzle={puzzle} state={state} onDone={onDone} />;
  }
  if (state.gameOver && !state.won) {
    return <LossReveal puzzle={puzzle} state={state} onDone={onDone} />;
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <AppBar title={dayTitle} onRules={onRules} onStats={onStats} onToggleTheme={onToggleTheme} theme={theme} />
      <div className="flex-1 flex justify-center px-2 py-2 min-h-0">
        <div className="w-full max-w-[600px] h-full">
          <Board puzzle={puzzle} state={state} derived={derived} />
        </div>
      </div>
      <HintBand state={state} derived={derived} onHint={(h) => dispatch({ type: "REQUEST_HINT", hint: h })} />
      <div className="pb-4">
        <Keyboard
          keyStatus={state.keyStatus}
          onKey={(g) => dispatch({ type: "TYPE", glyph: g })}
          onEnter={() => dispatch({ type: "SUBMIT" })}
          onDelete={() => dispatch({ type: "DELETE" })}
          disabled={state.gameOver}
        />
      </div>

      {state.invalidMsg && (
        <div className="fixed left-1/2 -translate-x-1/2 top-20 z-30 rounded-full px-4 py-2 text-sm font-semibold shadow"
             style={{ background: "var(--ink)", color: "var(--bg)" }}>
          {state.invalidMsg}
        </div>
      )}

      {state.openPanel && (
        <RevealPanel which={state.openPanel} puzzle={puzzle} onClose={() => dispatch({ type: "CLOSE_PANEL" })} />
      )}
      {state.pendingHint && (
        <ConfirmSheet
          onConfirm={() => dispatch({ type: "CONFIRM_HINT" })}
          onCancel={() => dispatch({ type: "CANCEL_HINT" })}
        />
      )}
    </div>
  );
}
