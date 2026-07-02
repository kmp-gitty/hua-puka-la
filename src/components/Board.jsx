import { useLayoutEffect, useRef, useState } from "react";
import Tile from "./Tile.jsx";
import { TOTAL_GUESSES } from "../game/constants.js";

// Dynamic tile-sizing (design README) with the v1 responsive refinement:
// target board width W tracks the container, so desktop keeps in-tile icons on
// long words. Narrow phones fall back to ~340px (icons may hide on 15 tiles).
const W_MIN = 300;
const W_CAP = 620; // wide enough that 15 tiles clear the 34px icon threshold
const SIZE_FLOOR = 18; // hard legibility floor set by the Hawaiian glyphs
const SIZE_CAP = 66; // comfortable cap

function gapFor(n) {
  return n <= 8 ? 7 : n <= 12 ? 5 : 3;
}

function tileSize(n, W) {
  const gap = gapFor(n);
  const raw = (W - (n - 1) * gap) / n;
  return Math.max(SIZE_FLOOR, Math.min(Math.floor(raw), SIZE_CAP));
}

export default function Board({ puzzle, state, derived }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ w: 360, h: 560 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = puzzle.length;
  const gap = gapFor(n);
  const W = Math.max(W_MIN, Math.min(box.w, W_CAP));
  // Size from width AND height: 8 rows + gaps must fit the allotted height, so
  // short words don't balloon and push the keyboard below the fold.
  const sizeByWidth = tileSize(n, W);
  const sizeByHeight = Math.floor((box.h - (TOTAL_GUESSES - 1) * gap) / TOTAL_GUESSES);
  const size = Math.max(SIZE_FLOOR, Math.min(sizeByWidth, sizeByHeight, SIZE_CAP));
  const { activeRow, rowsAvailable } = derived;

  const rows = [];
  for (let r = 0; r < TOTAL_GUESSES; r++) {
    const submitted = state.guesses[r];
    const isActive = r === activeRow && !state.gameOver;
    const burned = r >= rowsAvailable; // a hint ate this row
    const cells = [];
    for (let c = 0; c < n; c++) {
      let glyph = "";
      let cellState = null;
      let locked = false;
      let filled = false;
      if (submitted) {
        glyph = submitted.glyphs[c];
        cellState = submitted.states[c];
      } else if (isActive) {
        glyph = state.currentRow[c] ?? "";
        locked = c in state.locked;
        filled = glyph !== "" && !locked;
      }
      cells.push(
        <Tile
          key={c}
          glyph={glyph}
          state={cellState}
          size={size}
          filled={filled}
          locked={locked && isActive}
          reveal={!!submitted}
          bounce={state.won && submitted}
          bounceDelay={c * 80}
        />,
      );
    }
    rows.push(
      <div
        // remount the active row on each invalid submit so the shake replays
        key={isActive ? `${r}-shake${state.shakeToken}` : r}
        className={`flex justify-center ${isActive && state.shakeToken ? "animate-shake" : ""} ${
          burned ? "opacity-40" : ""
        }`}
        style={{ gap }}
      >
        {cells}
      </div>,
    );
  }

  return (
    <div ref={wrapRef} className="w-full h-full flex flex-col items-center justify-center" style={{ gap }}>
      {rows}
    </div>
  );
}
