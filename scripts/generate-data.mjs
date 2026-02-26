import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function todayUtcDateString() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed ${res.status} for ${url}\n${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchNews(theme, newsApiKey) {
  // Very simple query. We will improve later.
  const q = encodeURIComponent(theme);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=20&sortBy=publishedAt&apiKey=${newsApiKey}`;
  const data = await fetchJson(url);

  // Normalize to only what we need
  const articles = (data.articles ?? []).map((a) => ({
    title: a.title ?? "",
    url: a.url ?? "",
    source: a.source?.name ?? "",
    publishedAt: a.publishedAt ?? "",
    description: a.description ?? ""
  }));

  return articles.filter((a) => a.title && a.url);
}

async function fetchFinnhubCandles(ticker, finnhubKey) {
  // Fetch ~30 days of daily candles
  const nowSec = Math.floor(Date.now() / 1000);
  const fromSec = nowSec - 60 * 60 * 24 * 35;

  const url =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}` +
    `&resolution=D&from=${fromSec}&to=${nowSec}&token=${encodeURIComponent(finnhubKey)}`;

  const data = await fetchJson(url);

  if (data.s !== "ok") {
    // finnhub returns { s: "no_data" } sometimes
    return [];
  }

  // data.t is unix timestamps; data.c is close prices
  const points = [];
  for (let i = 0; i < data.t.length; i++) {
    const dt = new Date(data.t[i] * 1000);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    points.push({ date: `${yyyy}-${mm}-${dd}`, close: data.c[i] });
  }
  return points;
}

function buildDigest(articles) {
  // MVP: use top 5 titles as bullets
  const bullets = articles.slice(0, 5).map((a) => a.title);

  // MVP: a couple simple “insights”
  const insights = [];
  if (articles.length >= 8) insights.push("Coverage volume is elevated, suggesting an active news cycle.");
  insights.push("Digest is rule-based for MVP; AI summarisation will be added later.");

  return { bullets, insights: insights.slice(0, 3) };
}

function buildClusters(articles) {
  // MVP clustering: group by source (simple and deterministic)
  const bySource = new Map();
  for (const a of articles) {
    const key = a.source || "Unknown";
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(a);
  }

  const clusters = [];
  const entries = Array.from(bySource.entries()).slice(0, 4);
  for (const [source, list] of entries) {
    const urls = list.slice(0, 3).map((x) => x.url);
    clusters.push({
      title: `${source} coverage`,
      summary: `Top recent stories from ${source}. (MVP grouping by source)`,
      article_urls: urls
    });
  }

  return clusters;
}

async function main() {
  // Load env (simple, no dependency)
  // You must run this script with env vars available (via .env loader or shell env)
  const newsApiKey = requireEnv("NEWSAPI_KEY");
  const finnhubKey = requireEnv("FINNHUB_API_KEY");

  const repoRoot = process.cwd();
  const tickersPath = path.join(repoRoot, "themeTickers.json");
  const tickersByTheme = readJson(tickersPath);

  const date = todayUtcDateString();
  const outDir = path.join(repoRoot, "data", date);

  const themes = Object.keys(tickersByTheme);

  for (const theme of themes) {
    const tickers = tickersByTheme[theme] ?? [];
    const articles = await fetchNews(theme, newsApiKey);

    const digest = buildDigest(articles);
    const clusters = buildClusters(articles);

    const stocks = [];
    for (const ticker of tickers.slice(0, 5)) {
      const price_history = await fetchFinnhubCandles(ticker, finnhubKey);
      stocks.push({
        ticker,
        price_history,
        sentiment: { category: "Neutral", score: 0, magnitude: 0 }
      });
    }

    const themeJson = {
      theme,
      date,
      digest,
      clusters,
      stocks,
      disclaimer: "Educational use only. Not financial advice."
    };

    writeJson(path.join(outDir, `${theme}.json`), themeJson);
    console.log(`Wrote ${date}/${theme}.json`);
  }

  // Update manifest.json
  const manifestPath = path.join(repoRoot, "data", "manifest.json");
  const manifest = {
    generated_at_utc: new Date().toISOString(),
    themes: {}
  };

  for (const theme of themes) {
    manifest.themes[theme] = { latest_date: date };
  }

  writeJson(manifestPath, manifest);
  console.log("Updated data/manifest.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});