import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import StockChart from "@/components/StockChart";
import EventClustersAccordion from "@/components/EventClustersAccordion";
import LearningGlossary from "@/components/LearningGlossary";
import { loadThemeData, type ThemeData, type ThemeSlug } from "@/lib/loadThemeData";
import StockDrawer from "@/components/StockDrawer";

type SentimentDirection = "Positive" | "Neutral" | "Negative";

type StockWithExtras = ThemeData["stocks"][number] & {
  ai_explanation?: string;
  sentiment_direction?: SentimentDirection;
};

function isThemeSlug(value: string): value is ThemeSlug {
  return value === "ai" || value === "semiconductors" || value === "energy" || value === "us-politics";
}

function formatUtcLabel(iso: string) {
  // Example output: 2026-02-26 18:12 UTC
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm} UTC`;
}

function normalizeSentimentDirection(value: unknown): SentimentDirection {
  return value === "Positive" || value === "Neutral" || value === "Negative"
    ? value
    : "Neutral";
}

function sentimentBadgeClass(direction: SentimentDirection) {
  if (direction === "Positive") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
  if (direction === "Negative") {
    return "border border-red-500/40 bg-red-500/10 text-red-300";
  }
  return "border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]";
}

function sentimentPriceClass(direction: SentimentDirection) {
  if (direction === "Positive") return "text-emerald-300";
  if (direction === "Negative") return "text-red-300";
  return "text-[var(--foreground)]";
}

export default function ThemeDashboard() {
  const { slug } = useParams(); // reads from URL path /theme/:slug
  const themeSlug = useMemo(() => (slug && isThemeSlug(slug) ? slug : "ai"), [slug]);

  // Stores state for theme data, loading, and error
  const [data, setData] = useState<ThemeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [windowMode, setWindowMode] = useState<"7d" | "30d">("7d");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    setSelectedTicker(null);

    loadThemeData(themeSlug)
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No data generated yet for this theme. Check back later.");
      });
  }, [themeSlug]);

  const stock = data?.stocks[0];
  const selectedStock = data?.stocks.find((s) => s.ticker === selectedTicker) ?? null;
  const points = useMemo(() => {
    if (!stock) return [];
    if (windowMode === "7d") return stock.price_history.slice(-7);
    return stock.price_history.slice(-30);
  }, [stock, windowMode]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/"
          className="text-sm text-[var(--muted-foreground)] hover:underline"
        >
          ← Back to themes
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold capitalize">Theme: {themeSlug}</h1>

          <p className="text-[var(--muted-foreground)] mt-2">
            Built from a daily digest and clustered news narratives.
          </p>

          {data?.last_updated_utc && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Last updated (UTC):{" "}
              <span className="text-[var(--foreground)]">
                {formatUtcLabel(data.last_updated_utc)}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          </div>
        )}

        {!data && !error && ( // no data but not error == loading
          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-6">
            {/* Digest */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Daily Digest</h2>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    A quick, beginner-friendly summary of the most important news narratives today.
                  </p>
                </div>

                <span className="shrink-0 text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)]">
                  Max 5 bullets
                </span>
              </div>

              <ul className="list-disc pl-5 space-y-2">
                {data.digest.bullets.slice(0, 5).map((b, idx) => (
                  <li key={`${idx}-${b}`} className="text-[var(--foreground)] leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>

              {data.digest.insights.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[var(--border)]">
                  <h3 className="text-lg font-semibold mb-3">Key insights</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {data.digest.insights.slice(0, 3).map((i, idx) => (
                      <li key={`${idx}-${i}`} className="text-[var(--foreground)]/90 leading-relaxed">
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Clusters */}
            <EventClustersAccordion clusters={data.clusters} />

            {/* Stocks list */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Stocks</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Top tickers for this theme with AI-generated sentiment direction.
                </p>
              </div>

              <div className="space-y-3">
                {data.stocks.slice(0, 5).map((s) => {
                  const sWithExtras = s as StockWithExtras;
                  const direction = normalizeSentimentDirection(sWithExtras.sentiment_direction ?? sWithExtras.sentiment?.category);

                  const latest = s.price_history[s.price_history.length - 1];
                  const prev =
                    s.price_history.length >= 2
                      ? s.price_history[s.price_history.length - 2]
                      : null;

                  const latestClose = typeof latest?.close === "number" ? latest.close : null;
                  const prevClose = typeof prev?.close === "number" ? prev.close : null;

                  let delta: number | null = null;
                  let deltaPct: number | null = null;

                  if (latestClose !== null && prevClose !== null) {
                    delta = latestClose - prevClose;
                    if (prevClose !== 0) {
                      deltaPct = (delta / prevClose) * 100;
                    }
                  }

                  return (
                    <div
                      key={s.ticker}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTicker(s.ticker)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedTicker(s.ticker);
                      }}
                      className="flex items-start justify-between gap-4 rounded-md border border-[var(--border)] px-4 py-3 cursor-pointer hover:border-[#f59e0b]/60"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold tracking-wide">{s.ticker}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded ${sentimentBadgeClass(direction)}`}
                            title="AI-generated sentiment direction (educational only)"
                          >
                            {direction}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                          {sWithExtras.ai_explanation ?? ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-[var(--muted-foreground)]">Latest close</p>
                        <p className={`text-lg font-semibold ${sentimentPriceClass(direction)}`}>
                            {latestClose !== null ? latestClose.toFixed(2) : "—"}
                        </p>
                        <p className={`text-xs ${sentimentPriceClass(direction)}`}>
                          {delta !== null && deltaPct !== null
                            ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%)`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                Sentiment direction is AI-generated from the day’s news context and is for educational use only.
              </p>
            </div>

            {/* Chart */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold">
                  Stock snapshot {stock ? `(${stock.ticker})` : ""}
                </h2>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWindowMode("7d")}
                    className={`px-3 py-1 rounded border ${
                      windowMode === "7d"
                        ? "border-[#f59e0b] text-[#f59e0b]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    7d
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindowMode("30d")}
                    className={`px-3 py-1 rounded border ${
                      windowMode === "30d"
                        ? "border-[#f59e0b] text-[#f59e0b]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    30d
                  </button>
                </div>
              </div>

              {stock ? (
                <StockChart title="Close price" points={points} />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No stock data available.
                </p>
              )}
            </div>

            {/* Glossary */}
            <LearningGlossary />

            {/* Disclaimer */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                {data.disclaimer}
              </p>
            </div>
          </div>
        )}
      </div>
      <StockDrawer
        stock={selectedStock as any}
        isOpen={Boolean(selectedStock)}
        onClose={() => setSelectedTicker(null)}
        windowMode={windowMode}
        onChangeWindow={setWindowMode}
      />
    </main>
  );
}