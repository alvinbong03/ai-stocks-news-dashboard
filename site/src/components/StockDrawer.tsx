import StockChart from "@/components/StockChart";

type SentimentDirection = "Positive" | "Neutral" | "Negative";

type PricePoint = { date: string; close: number };

type StockLike = {
  ticker: string;
  price_history: PricePoint[];
  ai_explanation?: string;
  sentiment_direction?: SentimentDirection;
  sentiment?: { category?: string };
};

function normalizeSentimentDirection(value: unknown): SentimentDirection {
  return value === "Positive" || value === "Neutral" || value === "Negative" ? value : "Neutral";
}

function badgeClass(direction: SentimentDirection) {
  if (direction === "Positive") return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (direction === "Negative") return "border border-red-500/40 bg-red-500/10 text-red-300";
  return "border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]";
}

export default function StockDrawer({
  stock,
  isOpen,
  onClose,
  windowMode,
  onChangeWindow,
}: {
  stock: StockLike | null;
  isOpen: boolean;
  onClose: () => void;
  windowMode: "7d" | "30d";
  onChangeWindow: (m: "7d" | "30d") => void;
}) {
  if (!isOpen || !stock) return null;

  const direction = normalizeSentimentDirection(stock.sentiment_direction ?? stock.sentiment?.category);

  const points =
    windowMode === "7d" ? stock.price_history.slice(-7) : stock.price_history.slice(-30);

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        aria-label="Close drawer"
      />

      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-[var(--card)] border-l border-[var(--border)] p-6 overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{stock.ticker}</h2>
              <span className={`text-xs px-2 py-1 rounded ${badgeClass(direction)}`}>
                {direction}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {stock.ai_explanation ?? ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold">Price chart</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChangeWindow("7d")}
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
                onClick={() => onChangeWindow("30d")}
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

          <StockChart title="Close price" points={points} />
        </div>

        <p className="mt-6 text-xs text-[var(--muted-foreground)]">
          Educational use only. Not financial advice.
        </p>
      </aside>
    </div>
  );
}