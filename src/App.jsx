import { useEffect, useState, useCallback } from "react";
import DailyPuzzle from "./screens/DailyPuzzle.jsx";
import WeekendPicker from "./screens/WeekendPicker.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import Countdown from "./screens/Countdown.jsx";
import Stats from "./screens/Stats.jsx";
import Admin from "./screens/Admin.jsx";
import { loadCurrentWeek, loadAcceptSet } from "./game/weekData.js";
import { weekdaySlot, dateKeyForSlot } from "./game/hstTime.js";
import { hasSeenRules, markRulesSeen, loadTheme, saveTheme, loadResult, clearAll } from "./game/persistence.js";

// Testing helper: visiting /?reset wipes local state (game, results, rules seen).
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("reset")) {
  clearAll();
  window.history.replaceState(null, "", window.location.pathname);
}

// Mode seam for phase 2 — the shell is not hard-coded to Solve only.
// eslint-disable-next-line no-unused-vars
const MODE = "solve";

function isDark(theme) {
  return theme === "dark" || (theme == null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", isDark(theme));
}

export default function App() {
  const [data, setData] = useState(null); // { week, isCurrent }
  const [acceptSet, setAcceptSet] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => loadTheme());
  const [view, setView] = useState("loading"); // loading|onboarding|play|weekend|countdown|stats
  const [prevView, setPrevView] = useState("play");
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [fromWeekend, setFromWeekend] = useState(false);
  const [returnTo, setReturnTo] = useState(null); // where a previewed day returns to

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadCurrentWeek(), loadAcceptSet()])
      .then(([weekResult, accept]) => {
        if (!alive) return;
        setData(weekResult);
        setAcceptSet(accept);
        // Admin/preview overrides (dev): ?admin panel, or ?slot=0..4 direct.
        const params = new URLSearchParams(window.location.search);
        const todaySlot = weekdaySlot();
        if (params.has("admin")) {
          setView("admin");
        } else if (params.has("slot")) {
          const s = Math.max(0, Math.min(4, Number(params.get("slot")) || 0));
          setSelectedSlot(s);
          setReturnTo("admin");
          setView("play");
        } else if (!hasSeenRules()) {
          setView("onboarding");
        } else if (todaySlot === -1) {
          setView("weekend");
        } else {
          setSelectedSlot(todaySlot);
          setView("play");
        }
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = isDark(t) ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  const goStats = useCallback(() => {
    setPrevView((v) => (v === "stats" || view === "stats" ? v : view));
    setView("stats");
  }, [view]);
  const goRules = useCallback(() => {
    setPrevView((v) => (view === "onboarding" ? v : view));
    setView("onboarding");
  }, [view]);

  if (error) {
    return <div className="min-h-full grid place-items-center p-8 text-center text-ink-soft">Hoʻopau ʻia: {error}</div>;
  }
  if (view === "loading" || !data) {
    return <div className="min-h-full grid place-items-center text-faint">…</div>;
  }

  const { week } = data;
  const todaySlot = weekdaySlot();

  if (view === "onboarding") {
    return (
      <Onboarding
        onStart={() => {
          markRulesSeen();
          if (prevView && prevView !== "onboarding") {
            setView(prevView);
          } else if (todaySlot === -1) {
            setView("weekend");
          } else {
            setSelectedSlot(todaySlot);
            setView("play");
          }
        }}
      />
    );
  }

  if (view === "admin") {
    return (
      <Admin
        week={week}
        onPlaySlot={(slot) => {
          setSelectedSlot(slot);
          setReturnTo("admin");
          setView("play");
        }}
        onScreen={(v) => {
          setReturnTo("admin");
          if (v === "onboarding") setPrevView("admin");
          setView(v);
        }}
      />
    );
  }

  if (view === "stats") {
    return <Stats onBack={() => setView(returnTo || prevView || (todaySlot === -1 ? "weekend" : "play"))} />;
  }

  if (view === "countdown") {
    return <Countdown onStats={goStats} />;
  }

  if (view === "weekend") {
    const results = week.puzzles.map((_, slot) => loadResult(dateKeyForSlot(new Date(), slot)));
    return (
      <WeekendPicker
        puzzles={week.puzzles}
        results={results}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRules={goRules}
        onStats={goStats}
        onPick={(slot) => {
          setSelectedSlot(slot);
          setFromWeekend(true);
          setView("play");
        }}
      />
    );
  }

  // view === "play"
  const puzzle = week.puzzles[selectedSlot];
  const dateKey = dateKeyForSlot(new Date(), selectedSlot);
  const dayTitle = `${puzzle.dayMeta.hawaiian} · ${puzzle.dayMeta.english}`;

  return (
    <DailyPuzzle
      key={dateKey}
      puzzle={puzzle}
      acceptSet={acceptSet}
      dateKey={dateKey}
      dayTitle={dayTitle}
      theme={theme}
      onToggleTheme={toggleTheme}
      onRules={goRules}
      onStats={goStats}
      onDone={() => {
        if (returnTo === "admin") {
          setReturnTo(null);
          setView("admin");
        } else if (fromWeekend) {
          setFromWeekend(false);
          setView("weekend");
        } else {
          setView("countdown");
        }
      }}
    />
  );
}
