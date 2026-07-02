// Meanings block for the win/loss reveals. Leads with the featured sense
// (the one today's puzzle was built around), then lists the rest. Full,
// unstripped meanings — the learning payoff.

export default function MeaningsReveal({ puzzle }) {
  const featured = puzzle.featuredSense ?? puzzle.meanings[0];
  const idx = puzzle.meanings.indexOf(featured);
  const others = puzzle.meanings.filter((_, i) => i !== idx);

  return (
    <div className="text-left rounded-panel p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <div className="text-[11px] uppercase tracking-wide text-faint mb-1">Ka wehewehe o kēia lā · Today's Definition</div>
      <p className="text-ink text-[16px] font-medium">{featured}</p>

      {others.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-faint mt-4 mb-1">Nā wehewehe ʻē aʻe · Other Definitions</div>
          <ol className="list-decimal pl-5 space-y-1.5 text-ink-soft text-[15px]">
            {others.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
