import "dotenv/config";
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfterHeader) {
  if (!retryAfterHeader) return null;

  // Retry-After can be seconds or an HTTP-date
  const asSeconds = Number(retryAfterHeader);
  if (!Number.isNaN(asSeconds) && asSeconds > 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfterHeader);
  if (!Number.isNaN(asDate)) {
    const delta = asDate - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

function shouldRetryStatus(status) {
  // Retry on rate limit and transient server/network issues
  return (
    status === 429 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function fetchJson(url, options = {}) {
  const {
    label = "request",
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    minSpacingMs = 250
  } = options;

  let attempt = 1;
  let lastError = null;

  while (attempt <= maxAttempts) {
    // Basic pacing to reduce burstiness (especially important on free tiers)
    await sleep(minSpacingMs);

    try {
      const res = await fetch(url);

      if (res.ok) {
        return res.json();
      }

      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
      const isRetryable = shouldRetryStatus(res.status);

      const bodyText = await res.text();
      const snippet = bodyText.slice(0, 200);

      if (!isRetryable) {
        throw new Error(`[${label}] Fetch failed ${res.status} for ${url}\n${snippet}`);
      }

      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = retryAfterMs !== null ? retryAfterMs : expDelay + jitter;

      console.warn(
        `[${label}] Attempt ${attempt}/${maxAttempts} failed (${res.status}). Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts) break;

      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = expDelay + jitter;

      console.warn(
        `[${label}] Attempt ${attempt}/${maxAttempts} threw an error. Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }

    attempt += 1;
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`[${label}] Fetch failed after ${maxAttempts} attempts for ${url}`);
}

async function fetchStooqDailyCloses(ticker) {
  const symbol = `${ticker.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;

  const res = await fetch(url);

  if (!res.ok) {
    console.warn(`[stooq:${ticker}] HTTP ${res.status}.`);
    return [];
  }

  const csv = await res.text();

  // Split safely on both \r\n and \n
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    console.warn(`[stooq:${ticker}] No CSV data.`);
    return [];
  }

  const out = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");

    if (cols.length < 5) continue;

    const date = cols[0].trim();
    const closeStr = cols[4].trim();
    const close = Number(closeStr);

    if (!date || Number.isNaN(close)) continue;

    out.push({ date, close });
  }

  // Keep last 35 points
  return out.slice(-35);
}

async function fetchNews(theme, newsApiKey) {
  // Very simple query 
  const q = encodeURIComponent(theme);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=20&sortBy=publishedAt&apiKey=${newsApiKey}`;
  const data = await fetchJson(url, { label: `news:${theme}` });

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

function buildDigest(articles) {
  // MVP: use top 5 titles as bullets
  const bullets = articles.slice(0, 5).map((a) => a.title);

  // MVP: a couple simple “insights”
  const insights = [];
  if (articles.length >= 8) insights.push("Coverage volume is elevated, suggesting an active news cycle.");
  insights.push("Digest is rule-based for MVP; AI summarisation can be added later.");

  return { bullets, insights: insights.slice(0, 3) };
}

function tokenize(text) {
  // Lowercase and replace punctuation with spaces
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  // Split on whitespace and filter out junk
  return cleaned
    .split(/\s+/) // split into an array, using whitespace as separators: \s = any whitespace; + = one or more of them
    .map((t) => t.trim()) // for each token t, we run t.trim()
    .filter((t) => t.length >= 3); // only keep tokens with length >= 3 to reduce noise
}

function buildClusters(articles) {
  // Common stopwords: do not want as “keywords”
  const stopwords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "are", "was", "were",
    "into", "over", "will", "just", "than", "then", "they", "their", "about",
    "after", "before", "today", "says", "said", "into", "onto", "have", "has",
    "had", "you", "your", "its", "also", "not", "but", "new", "more", "most",
    "can", "could", "would", "should", "may", "might", "than", "when", "what",
    "why", "how", "who", "where", "which", "market", "stocks", "stock"
  ]);

  // 1) Build tokens per article and a global keyword frequency map
  const perArticleTokens = [];
  const freq = new Map(); // keyword -> count

  for (const a of articles) {
    const combined = `${a.title ?? ""} ${a.description ?? ""}`; // combine title and description for better keyword extraction
    const tokens = tokenize(combined).filter((t) => !stopwords.has(t));

    perArticleTokens.push({ article: a, tokens });

    // Count keyword frequency (unique per article helps reduce spammy repetition)
    const unique = new Set(tokens); // only count each keyword once per article to avoid over-weighting articles with repeated words
    for (const word of unique) {
      freq.set(word, (freq.get(word) ?? 0) + 1); 
    }
  }

  // If not enough data, return a single fallback cluster
  if (articles.length === 0) {
    return [];
  }

  // 2) Choose top keywords as cluster labels
  // Rules:
  // - keyword must appear in at least 2 articles (filters noise)
  // - take top N
  const MIN_ARTICLE_COUNT = 2;
  const MAX_LABELS = 4;

  const sortedKeywords = Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_ARTICLE_COUNT)
    .sort((a, b) => b[1] - a[1]) // descending by count
    .map(([word]) => word);

  const labels = sortedKeywords.slice(0, MAX_LABELS);

  // If nothing qualifies, fall back to 1 label to avoid empty UI
  const finalLabels = labels.length > 0 ? labels : ["updates"];

  // 3) Create buckets: label -> articles (create an empty array for each cluster label)
  const buckets = new Map();
  for (const label of finalLabels) {
    buckets.set(label, []);
  }
  buckets.set("other", []);

  // 4) Assign each article to the first label it matches
  for (const item of perArticleTokens) {
    const { article, tokens } = item;

    let assigned = false;
    for (const label of finalLabels) { // loop through cluster labels in priority order
      if (tokens.includes(label)) {
        buckets.get(label).push(article);
        assigned = true;
        break; // assign to first matching label only to create more distinct clusters; if an article matches multiple labels, it will go into the first one in the list
      }
    }

    if (!assigned) {
      buckets.get("other").push(article);
    }
  }

  // 5) Convert buckets into the final clusters array
  const clusters = [];

  for (const label of finalLabels) {
    const list = buckets.get(label);

    // Skip empty clusters
    if (!list || list.length === 0) continue;

    const urls = list
      .slice(0, 3)
      .map((x) => x.url)
      .filter(Boolean);

    clusters.push({
      title: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      summary: `Grouped stories where "${label}" appears frequently in titles/descriptions. (Keyword-based MVP)`,
      article_urls: urls,
    });
  }

  // Optional “Other” cluster if it has at least 2 articles
  const otherList = buckets.get("other") ?? [];
  if (otherList.length >= 2 && clusters.length < 5) {
    clusters.push({
      title: "Other",
      summary: "Stories that did not match the main keywords. (Keyword-based MVP)",
      article_urls: otherList.slice(0, 3).map((x) => x.url).filter(Boolean),
    });
  }

  return clusters.slice(0, 5);
}

async function main() {
  // Load env (simple, no dependency)
  // Take raw external data (NewsAPI + Stooq) → transform it → output structured JSON files → update manifest → frontend reads them.
  console.log(`[generate-data] START ${new Date().toISOString()}`);
  const newsApiKey = requireEnv("NEWSAPI_KEY");

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
      const price_history = await fetchStooqDailyCloses(ticker);
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
  console.log(`[generate-data] DONE ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});