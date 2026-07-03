// Top app bar: ? (rules) left · centered title + day · stats right.

export default function AppBar({ title, subtitle, onRules, onStats, onToggleTheme, theme }) {
  return (
    <header className="w-full max-w-[600px] mx-auto flex items-center justify-between px-4 py-3">
      <button
        onClick={onRules}
        aria-label="Pehea e pāʻani ai (How to play)"
        className="w-9 h-9 grid place-items-center rounded-full text-lg font-bold"
        style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
      >
        ?
      </button>
      <div className="text-center leading-tight">
        <div className="font-extrabold text-[19px]" style={{ color: "var(--sun)" }}>
          Hua Puka Lā
        </div>
        {title && <div className="text-[12px] text-ink-soft">{title}</div>}
        {subtitle && <div className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{subtitle}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 grid place-items-center rounded-full"
          style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          {/* show the mode you'll switch TO */}
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          onClick={onStats}
          aria-label="Stats"
          className="w-9 h-9 grid place-items-center rounded-full"
          style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          ▤
        </button>
      </div>
    </header>
  );
}
