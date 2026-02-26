import { Link } from "react-router-dom";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-[var(--muted-foreground)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function Methodology() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/" className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Back to themes
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold">Methodology & Disclaimer</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            This page explains where the data comes from, how the daily pipeline works, and what the AI outputs mean.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <Section title="What this site does">
            <p>
              Each day, the project generates one JSON file per theme in <code>/data/YYYY-MM-DD/</code>.
              The dashboard reads those static JSON files and renders:
              a daily digest, clustered narratives, and a stock snapshot.
            </p>
          </Section>

          <Section title="Data sources">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-[var(--foreground)]">News</span>: pulled from NewsAPI (headlines and metadata like source + publish time).
              </li>
              <li>
                <span className="font-semibold text-[var(--foreground)]">Stock prices</span>: daily closing prices from Stooq (used for 7-day and 30-day charts).
              </li>
            </ul>
          </Section>

          <Section title="Daily pipeline (high level)">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Fetch news articles for each theme.</li>
              <li>Generate a short daily digest (bullets + simple insights).</li>
              <li>Cluster related articles into a few “event narratives”.</li>
              <li>Fetch stock price history for the theme’s tickers (7d/30d).</li>
              <li>Write JSON outputs into <code>/data/YYYY-MM-DD/</code> and update <code>/data/manifest.json</code>.</li>
              <li>Deploy the static site so the frontend can read <code>/data/…</code> directly.</li>
            </ol>
          </Section>

          <Section title="What the AI outputs mean (and what they do not mean)">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-semibold text-[var(--foreground)]">Daily digest</span> is a short summary of major narratives in the theme’s news for that day.
              </li>
              <li>
                <span className="font-semibold text-[var(--foreground)]">Event clusters</span> group articles that appear to describe the same story.
              </li>
              <li>
                <span className="font-semibold text-[var(--foreground)]">Sentiment direction</span> is an educational label (Positive / Neutral / Negative)
                based on the day’s news context. It is not a prediction and it does not imply a statistical relationship to stock returns.
              </li>
            </ul>
          </Section>

          <Section title="Reliability and failure handling">
            <p>
              This project is designed to be robust for a static site. If an API call fails or an AI call returns invalid output,
              the pipeline falls back to simpler rule-based output so the site still renders.
              In other words: a missing AI response should not break the build or the dashboard.
            </p>
          </Section>

          <Section title="Privacy and security">
            <ul className="list-disc pl-5 space-y-2">
              <li>No user accounts, no authentication, no cookies required.</li>
              <li>API keys are stored in GitHub Actions secrets and are never exposed to the browser.</li>
              <li>The frontend is fully static and reads generated JSON from <code>/data/</code>.</li>
            </ul>
          </Section>

          <Section title="Disclaimer">
            <p className="text-[var(--foreground)] font-semibold">
              Educational purposes only. Not financial advice.
            </p>
            <p className="mt-2">
              Nothing on this site should be used as a recommendation to buy, sell, or hold any security.
              The content may be incomplete, delayed, or incorrect.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}