// Corrected attribution (Build Spec §10). Honors CC BY-SA / share-alike.
// Do NOT credit wehewehe.org — a different, copyrighted corpus we don't use.

export default function Attribution() {
  return (
    <p className="text-[11px] text-faint leading-relaxed mt-6">
      Definitions from{" "}
      <a
        href="https://kaikki.org"
        target="_blank"
        rel="noreferrer"
        className="underline"
        style={{ color: "var(--faint)" }}
      >
        Wiktionary (via kaikki.org / wiktextract)
      </a>
      , used under{" "}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noreferrer"
        className="underline"
        style={{ color: "var(--faint)" }}
      >
        CC BY-SA
      </a>
      .
    </p>
  );
}
