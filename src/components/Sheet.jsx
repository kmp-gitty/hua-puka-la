// Reusable slide-up sheet (reveal panels + the first-hint confirm). Dismissible.

export function Sheet({ children, onClose, dismissible = true }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        className="relative z-10 w-full sm:max-w-md animate-slideup rounded-t-panel sm:rounded-panel p-5 m-0 sm:mb-0"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmSheet({ onConfirm, onCancel }) {
  return (
    <Sheet onClose={onCancel}>
      <h3 className="text-lg font-extrabold text-ink mb-1">E hoʻohana i kōkua? (Use a hint?)</h3>
      <p className="text-sm text-ink-soft mb-4">
        This spends one of your 8 guesses.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-btn py-2.5 font-semibold"
          style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          ʻAʻole (Cancel)
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-btn py-2.5 font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          ʻAe (Yes)
        </button>
      </div>
    </Sheet>
  );
}
