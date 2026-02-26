const terms = [
  {
    term: "Event cluster",
    definition:
      "A group of related news stories that describe the same market-moving narrative.",
  },
  {
    term: "Sentiment",
    definition:
      "A rough measure of how positive, neutral, or negative the news tone is.",
  },
  {
    term: "7d vs 30d",
    definition:
      "A short vs medium window of price movement to compare recent momentum.",
  },
];

export default function LearningGlossary() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-xl font-semibold mb-4">Learning glossary</h2>

      <dl className="space-y-4">
        {terms.map((t) => (
          <div key={t.term}>
            <dt className="font-medium">{t.term}</dt>
            <dd className="text-sm text-[var(--muted-foreground)] mt-1">
              {t.definition}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}