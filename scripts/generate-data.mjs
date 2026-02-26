import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    return readJson(filePath);
  } catch {
    return fallbackValue;
  }
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

function normalizeText(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function canonicalizeUrl(raw) {
  try {
    const u = new URL(String(raw));

    // Remove common tracking params to reduce duplicates
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
      "igshid"
    ]);

    for (const k of [...u.searchParams.keys()]) {
      if (drop.has(k.toLowerCase())) u.searchParams.delete(k);
    }

    // Normalise trivial differences
    u.hash = "";
    if (u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);

    return u.toString();
  } catch {
    return String(raw ?? "").trim();
  }
}

function uniqueStrings(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = normalizeText(item);
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}

// Deduplicate NewsAPI articles by canonical URL (preferred) or title+source.
function dedupeArticles(articles) {
  const seen = new Set();
  const out = [];

  for (const a of articles) {
    const url = canonicalizeUrl(a?.url);
    const titleKey = normalizeText(a?.title);
    const sourceKey = normalizeText(a?.source?.name);

    const key = url
      ? `url:${url}`
      : titleKey
        ? `t:${titleKey}|s:${sourceKey}`
        : null;

    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);

    out.push({
      ...a,
      url
    });
  }

  return out;
}

async function fetchWithRetry(url, options = {}) {
  const {
    label = "request",
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    minSpacingMs = 1100,
    parse = "json", // "json" | "text"
    fetchInit = undefined
  } = options;

  let attempt = 1;
  let lastError = null;

  while (attempt <= maxAttempts) {
    // Basic pacing to reduce burstiness (especially important on free tiers)
    await sleep(minSpacingMs);

    try {
      const res = await fetch(url, fetchInit);

      if (res.ok) {
        if (parse === "text") return res.text();
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

async function fetchJson(url, options = {}) {
  return fetchWithRetry(url, { ...options, parse: "json" });
}

async function fetchText(url, options = {}) {
  return fetchWithRetry(url, { ...options, parse: "text" });
}

async function fetchStooqDailyCloses(ticker) {
  const symbol = `${ticker.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;

  let csv = "";
  try {
    csv = await fetchText(url, { label: `stooq:${ticker}`, minSpacingMs: 1100 });
  } catch (e) {
    console.warn(`[stooq:${ticker}] Failed after retries.`);
    return [];
  }

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

  // Keep last ~35 points to keep JSON small
  return out.slice(-35);
}

function buildNewsQuery(theme) {
  // Theme-specific queries (MVP). Keep them simple and readable.
  // NewsAPI query syntax supports AND/OR, quotes, and negative terms with a leading minus.
  const queryByTheme = {
    ai: [
      '"artificial intelligence"',
      '"generative AI"',
      '"machine learning"',
      "LLM",
      '"large language model"',
      "ChatGPT",
      "OpenAI",
      "Anthropic",
      "Claude",
      "Gemini",
      "DeepMind",
      "NVIDIA",
      "GPU",
      '"AI chip"',
      '"data center"',
      '"model safety"',
      "regulation"
    ].join(" OR "),

    semiconductors: [
      "semiconductor",
      "chip",
      "chips",
      "GPU",
      "NVIDIA",
      "TSMC",
      "Intel",
      "AMD",
      "ASML",
      '"foundry"',
      '"export controls"',
      '"supply chain"'
    ].join(" OR "),

    energy: [
      "energy",
      "oil",
      "gas",
      "OPEC",
      "renewables",
      "solar",
      "wind",
      "LNG",
      '"power grid"',
      '"electricity prices"',
      '"energy transition"'
    ].join(" OR "),

    "us-politics": [
      '"United States"',
      '"White House"',
      "Congress",
      "Senate",
      "House",
      "Biden",
      "Trump",
      "election",
      "campaign",
      "policy",
      "tariffs",
      "sanctions",
      '"federal government"'
    ].join(" OR ")
  };

  const rawQuery = queryByTheme[theme] ?? theme;

  // Slightly tighten the AI theme by excluding common false positives.
  // Keep this minimal so we do not accidentally exclude real AI coverage.
  if (theme === "ai") {
    return `${rawQuery} -pypi -package -wordpress -dev -release`;
  }

  return rawQuery;
}

async function fetchNews(theme, newsApiKey) {
  // Better query + slightly tighter matching: title/description only
  const finalQuery = buildNewsQuery(theme);
  const q = encodeURIComponent(finalQuery);

  const baseParams =
    `&language=en` +
    `&pageSize=50` +
    `&sortBy=publishedAt` +
    `&apiKey=${newsApiKey}`;

  // For AI, use qInTitle for higher precision. For others, keep broader searchIn.
  const url =
    theme === "ai"
      ? `https://newsapi.org/v2/everything?qInTitle=${q}${baseParams}`
      : `https://newsapi.org/v2/everything?q=${q}&searchIn=title,description${baseParams}`;

  const data = await fetchJson(url, { label: `news:${theme}` });

  // Remove obvious low-quality / irrelevant sources for our educational dashboard (MVP denylist)
  const blockedHosts = new Set([
    "pypi.org",
    "alltoc.com"
  ]);

  const rawArticles = Array.isArray(data.articles) ? data.articles : [];

  // 1) Domain/URL quality filter (denylist)
  const domainFiltered = rawArticles.filter((a) => {
    const urlStr = a?.url;
    if (!urlStr) return false;

    try {
      const host = new URL(urlStr).hostname.replace(/^www\./, "");
      return !blockedHosts.has(host);
    } catch {
      // If URL parsing fails, drop it
      return false;
    }
  });

  // 2) AI relevance filter (AI theme only)
  // New approach: relevance scoring. Require multiple AI signals to avoid random articles.
  function aiRelevanceScore(title, description) {
    const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();

    // Common false positives where "AI" does not mean artificial intelligence.
    const falsePositivePhrases = ["air india", "all india", "aiadmk", "aiims"];
    for (const p of falsePositivePhrases) {
      if (text.includes(p)) return 0;
    }

    // Signals are grouped. We want at least 2 points for a "good" AI article.
    const phraseSignals = [
      "artificial intelligence",
      "generative ai",
      "machine learning",
      "deep learning",
      "large language model",
      "language model",
      "foundation model",
      "ai safety",
      "model safety",
      "ai regulation",
      "data center",
      "datacenter",
      "ai chip"
    ];

    const tokenSignals = [
      "llm",
      "gpt",
      "chatgpt",
      "openai",
      "anthropic",
      "claude",
      "gemini",
      "deepmind",
      "nvidia",
      "gpu",
      "inference",
      "training",
      "transformer",
      "neural",
      "cuda"
    ];

    let score = 0;

    for (const p of phraseSignals) {
      if (text.includes(p)) score += 1;
    }

    for (const t of tokenSignals) {
      const re = new RegExp(`\\b${t}\\b`, "i");
      if (re.test(text)) score += 1;
    }

    // The bare token "ai" is weak. Count it only if we already have other context.
    if (score > 0 && /\bai\b/i.test(text)) score += 1;

    return score;
  }

  let filtered = domainFiltered;

  if (theme === "ai") {
    const scored = domainFiltered
      .map((a) => ({
        a,
        score: aiRelevanceScore(a?.title ?? "", a?.description ?? "")
      }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);

    // Primary rule: keep only articles with at least 2 AI signals.
    const strong = scored.filter((x) => x.score >= 2).map((x) => x.a);

    // Fallback rule: if the day is quiet, allow score >= 1 but keep it small.
    const weak = scored.filter((x) => x.score >= 1).map((x) => x.a).slice(0, 15);

    filtered = strong.length >= 6 ? strong : weak;
  }

  filtered = dedupeArticles(filtered);

  // Map into our stable shape after filtering
  const articles = filtered.map((a) => ({
    title: a.title ?? "",
    description: a.description ?? "",
    url: canonicalizeUrl(a.url ?? ""),
    source: a.source?.name ?? "Unknown",
    publishedAt: a.publishedAt ?? ""
  }));

  return articles;
}

function buildDigest(articles) {
  // MVP: use top 5 unique titles as bullets
  const bullets = uniqueStrings(
    articles
      .map((a) => a.title)
      .filter(Boolean)
  ).slice(0, 5);

  // MVP: a couple simple “insights”
  const insights = [];
  if (articles.length >= 8) {
    insights.push("Coverage volume is elevated, suggesting an active news cycle.");
  }
  insights.push("Digest is rule-based for MVP; AI summarisation can be added later.");

  return { bullets, insights: insights.slice(0, 3) };
}

function tokenize(text) {
  // Lowercase and replace punctuation with spaces
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

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

  if (articles.length === 0) {
    return [];
  }

  // 2) Choose top keywords as cluster labels
  const MIN_ARTICLE_COUNT = 2;
  const MAX_LABELS = 4;

  const sortedKeywords = Array.from(freq.entries())
    .filter(([, count]) => count >= MIN_ARTICLE_COUNT)
    .sort((a, b) => b[1] - a[1]) // descending by count
    .map(([word]) => word);

  const labels = sortedKeywords.slice(0, MAX_LABELS);

  // If nothing qualifies, fall back to 1 label to avoid empty UI
  const finalLabels = labels.length > 0 ? labels : ["updates"];

  // 3) Create buckets: label -> articles
  const buckets = new Map();
  for (const label of finalLabels) {
    buckets.set(label, []);
  }
  buckets.set("other", []);

  // 4) Assign each article to the first label it matches
  for (const item of perArticleTokens) {
    const { article, tokens } = item;

    let assigned = false;
    for (const label of finalLabels) {
      if (tokens.includes(label)) {
        buckets.get(label).push(article);
        assigned = true;
        break;
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
    if (!list || list.length === 0) continue;

    const urls = uniqueStrings(
      list
        .map((x) => canonicalizeUrl(x.url))
        .filter(Boolean)
    ).slice(0, 3);

    clusters.push({
      title: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      summary: `Grouped stories where "${label}" appears frequently in titles/descriptions. (Keyword-based MVP)`,
      article_urls: urls
    });
  }

  // Optional “Other” cluster if it has at least 2 articles
  const otherList = buckets.get("other") ?? [];
  if (otherList.length >= 2 && clusters.length < 5) {
    clusters.push({
      title: "Other",
      summary: "Stories that did not match the main keywords. (Keyword-based MVP)",
      article_urls: uniqueStrings(
        otherList
          .map((x) => canonicalizeUrl(x.url))
          .filter(Boolean)
      ).slice(0, 3)
    });
  }

  return clusters.slice(0, 5);
}

function extractJsonBlock(text) {
  const s = String(text ?? "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function validateHfPayload(payload, allowedTickers) {
  if (!isPlainObject(payload)) return { ok: false, reason: "HF output is not an object" };

  const digestBullets = payload.digest_bullets;
  const insights = payload.insights;
  const clusters = payload.clusters;

  if (!Array.isArray(digestBullets)) return { ok: false, reason: "digest_bullets must be an array" };
  if (!Array.isArray(insights)) return { ok: false, reason: "insights must be an array" };
  if (!Array.isArray(clusters)) return { ok: false, reason: "clusters must be an array" };

  if (!digestBullets.every((x) => typeof x === "string")) return { ok: false, reason: "digest_bullets must be strings" };
  if (!insights.every((x) => typeof x === "string")) return { ok: false, reason: "insights must be strings" };

  // Hard limits from the pipeline spec
  if (digestBullets.length > 5) return { ok: false, reason: "digest_bullets too long" };
  if (insights.length > 3) return { ok: false, reason: "insights too long" };
  if (clusters.length > 5) return { ok: false, reason: "clusters too many" };

  for (const c of clusters) {
    if (!isPlainObject(c)) return { ok: false, reason: "cluster entry must be an object" };
    if (typeof c.title !== "string") return { ok: false, reason: "cluster.title must be a string" };
    if (typeof c.summary !== "string") return { ok: false, reason: "cluster.summary must be a string" };
    if (!Array.isArray(c.article_urls)) return { ok: false, reason: "cluster.article_urls must be an array" };
    if (!c.article_urls.every((u) => typeof u === "string")) return { ok: false, reason: "cluster.article_urls must be strings" };
  }

  let tickerExplanations = {};
  if (payload.ticker_explanations !== undefined) {
    if (!isPlainObject(payload.ticker_explanations)) {
      return { ok: false, reason: "ticker_explanations must be an object if present" };
    }
    tickerExplanations = payload.ticker_explanations;
    for (const [k, v] of Object.entries(tickerExplanations)) {
      if (!allowedTickers.includes(k)) return { ok: false, reason: `ticker_explanations contains unknown ticker: ${k}` };
      if (typeof v !== "string") return { ok: false, reason: `ticker_explanations[${k}] must be a string` };
    }
  }

  // --- New: Validate ticker_sentiment ---
  let tickerSentiment = {};
  if (payload.ticker_sentiment !== undefined) {
    if (!isPlainObject(payload.ticker_sentiment)) {
      return { ok: false, reason: "ticker_sentiment must be an object if present" };
    }
    tickerSentiment = payload.ticker_sentiment;
    for (const [k, v] of Object.entries(tickerSentiment)) {
      if (!allowedTickers.includes(k)) return { ok: false, reason: `ticker_sentiment contains unknown ticker: ${k}` };
      if (typeof v !== "string") return { ok: false, reason: `ticker_sentiment[${k}] must be a string` };
      if (v !== "Positive" && v !== "Neutral" && v !== "Negative") {
        return { ok: false, reason: `ticker_sentiment[${k}] must be Positive/Neutral/Negative` };
      }
    }
  }

  return {
    ok: true,
    value: {
      digest: { bullets: digestBullets, insights },
      clusters: clusters.map((c) => ({
        title: c.title,
        summary: c.summary,
        article_urls: c.article_urls.slice(0, 3)
      })),
      ticker_explanations: tickerExplanations,
      ticker_sentiment: tickerSentiment
    }
  };
}

function buildHfPrompt(theme, articles, tickers) {
  const top = articles
    .slice(0, 20)
    .map((a, i) => {
      const title = (a.title ?? "").replace(/\s+/g, " ").trim();
      const desc = (a.description ?? "").replace(/\s+/g, " ").trim();
      const src = a.source ?? "Unknown";
      const date = a.publishedAt ?? "";
      const url = a.url ?? "";
      return `${i + 1}. ${title}\n   source: ${src}\n   publishedAt: ${date}\n   url: ${url}\n   description: ${desc}`;
    })
    .join("\n\n");

  return `You are generating content for an educational dashboard. Not financial advice.

Theme: ${theme}
Tickers: ${tickers.join(", ")}

Articles:
${top}

Return STRICT JSON ONLY with this schema (no markdown, no extra text):

{
  "digest_bullets": ["... up to 5 strings ..."],
  "insights": ["... up to 3 strings ..."],
  "clusters": [
    {
      "title": "short title",
      "summary": "1 short paragraph",
      "article_urls": ["... up to 5 urls from the list above ..."]
    }
  ],
  "ticker_explanations": {
    ${tickers.map((t) => `"${t}": "1–2 educational sentences linking the theme to this ticker"`).join(",\n    ")}
  },
  "ticker_sentiment": {
    ${tickers.map((t) => `"${t}": "Neutral"`).join(",\n    ")}
  }
}

Rules:
- digest_bullets max 5
- insights max 3
- clusters between 3 and 5 if possible, otherwise fewer
- Use only URLs from the Articles list
- Keep ticker_explanations to only the given tickers
- ticker_sentiment values must be exactly one of: Positive, Neutral, Negative`;
}

async function callHuggingFaceStructured(theme, articles, tickers, hfApiKey, hfModel) {
  const endpoint = "https://router.huggingface.co/v1/chat/completions";
  const routedModel = hfModel.includes(":") ? hfModel : `${hfModel}:hf-inference`;

  async function runOnce(prompt, attemptLabel) {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        digest_bullets: {
          type: "array",
          items: { type: "string" },
          minItems: 0,
          maxItems: 5
        },
        insights: {
          type: "array",
          items: { type: "string" },
          minItems: 0,
          maxItems: 3
        },
        clusters: {
          type: "array",
          minItems: 0,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              article_urls: {
                type: "array",
                items: { type: "string" },
                minItems: 0,
                maxItems: 5
              }
            },
            required: ["title", "summary", "article_urls"]
          }
        },
        ticker_explanations: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        ticker_sentiment: {
          type: "object",
          additionalProperties: { type: "string", enum: ["Positive", "Neutral", "Negative"] }
        }
      },
      required: ["digest_bullets", "insights", "clusters"]
    };

    const body = JSON.stringify({
      model: routedModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 900,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "theme_digest",
          description: "Theme digest bullets, insights, clusters, and optional ticker explanations.",
          strict: true,
          schema
        }
      }
    });

    const res = await fetchJson(endpoint, {
      label: `hf:${theme}:${attemptLabel}`,
      minSpacingMs: 1300,
      fetchInit: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          "Content-Type": "application/json"
        },
        body
      }
    });

    // HF often returns: [{ generated_text: "..." }]
    const text =
      res?.choices?.[0]?.message?.content ??
      res?.choices?.[0]?.text ??
      "";

    let parsed;

    // With response_format=json_schema, the model should return a pure JSON string.
    try {
      parsed = JSON.parse(String(text).trim());
    } catch {
      // Fallback: try extracting the largest {...} block
      const block = extractJsonBlock(text);
      if (!block) return { ok: false, reason: "No JSON block found" };

      try {
        parsed = JSON.parse(block);
      } catch {
        const preview = String(text).slice(0, 300);
        return { ok: false, reason: `JSON.parse failed. Preview: ${preview}` };
      }
    }

    const v = validateHfPayload(parsed, tickers);
    if (!v.ok) return { ok: false, reason: v.reason };
    return { ok: true, value: v.value };
  }

  const prompt1 = buildHfPrompt(theme, articles, tickers);
  const a1 = await runOnce(prompt1, "a1");
  if (a1.ok) return a1.value;

  // Option A: one retry with an even stricter instruction
  const prompt2 = `Return ONLY valid JSON matching the schema exactly. No extra text.\n\n${prompt1}`;
  const a2 = await runOnce(prompt2, "a2");
  if (a2.ok) return a2.value;

  throw new Error(`[hf:${theme}] invalid output after retry: ${a1.reason} / ${a2.reason}`);
}

async function main() {
  // Take raw external data (NewsAPI + Stooq) → transform it → output structured JSON files → update manifest → frontend reads them.
  console.log(`[generate-data] START ${new Date().toISOString()}`);

  const newsApiKey = requireEnv("NEWSAPI_KEY");

  const repoRoot = process.cwd();
  const tickersPath = path.join(repoRoot, "themeTickers.json");
  const tickersByTheme = readJson(tickersPath);

  const date = todayUtcDateString();
  const outDir = path.join(repoRoot, "data", date);

  const themes = Object.keys(tickersByTheme);

  const successfulThemes = [];

  for (const theme of themes) {
    try {
      const tickers = tickersByTheme[theme] ?? [];
      const articles = await fetchNews(theme, newsApiKey);

      let digest = buildDigest(articles);
      let clusters = buildClusters(articles);
      let ticker_explanations = {};
      let ticker_sentiment = {};

      const hfApiKey = process.env.HUGGINGFACE_API_KEY;
      const hfModel = process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
      console.log(`[hf:${theme}] env present: ${Boolean(hfApiKey)} model: ${hfModel}`);

      if (hfApiKey) {
        try {
          const hf = await callHuggingFaceStructured(
            theme,
            articles,
            tickers.slice(0, 5),
            hfApiKey,
            hfModel
          );

          digest = hf.digest;
          clusters = hf.clusters;
          ticker_explanations = hf.ticker_explanations ?? {};
          ticker_sentiment = hf.ticker_sentiment ?? {};

          console.log(`[hf:${theme}] OK (validated JSON)`);
        } catch (e) {
          console.warn(`[hf:${theme}] FAILED, using rule-based fallback`);
          console.warn(e);
        }
      } else {
        console.warn(`[hf:${theme}] HUGGINGFACE_API_KEY missing, using rule-based fallback`);
      }

      const stocks = [];

      const topBullet = digest.bullets[0] ?? "";
      const topClusterTitle = clusters[0]?.title ?? "";

      for (const ticker of tickers.slice(0, 5)) {
        const price_history = await fetchStooqDailyCloses(ticker);
        const hfExplain = ticker_explanations?.[ticker];
        const hfSentiment = ticker_sentiment?.[ticker];

        const ai_explanationParts = [];
        if (topBullet) ai_explanationParts.push(`Top headline signal: ${topBullet}`);
        if (topClusterTitle) ai_explanationParts.push(`Main topic cluster: ${topClusterTitle}`);

        const ai_explanation =
          typeof hfExplain === "string" && hfExplain.trim().length > 0
            ? `${hfExplain.trim()} This is an educational summary, not financial advice.`
            : ai_explanationParts.length > 0
              ? `${ai_explanationParts.join(". ")}. This is an educational summary, not financial advice.`
              : "Educational summary unavailable for this theme today. Not financial advice.";

        const sentiment_direction =
          hfSentiment === "Positive" || hfSentiment === "Neutral" || hfSentiment === "Negative"
            ? hfSentiment
            : "Neutral";

        stocks.push({
          ticker,
          price_history,
          sentiment_direction,
          sentiment: { category: sentiment_direction, score: 0, magnitude: 0 },
          ai_explanation
        });
      }

      const themeJson = {
        theme,
        date,
        last_updated_utc: new Date().toISOString(),
        news: articles,
        digest,
        clusters,
        stocks,
        disclaimer: "Educational use only. Not financial advice."
      };

      writeJson(path.join(outDir, `${theme}.json`), themeJson);
      successfulThemes.push(theme);
      console.log(`Wrote ${date}/${theme}.json`);
    } catch (e) {
      console.warn(`[generate-data] Theme failed: ${theme}`);
      console.warn(e);
    }
  }

  // Update manifest.json (only for themes that actually wrote data)
  const manifestPath = path.join(repoRoot, "data", "manifest.json");
  const previousManifest = readJsonIfExists(manifestPath, { generated_at_utc: "", themes: {} });

  const manifest = {
    generated_at_utc: new Date().toISOString(),
    themes: { ...(previousManifest.themes ?? {}) }
  };

  for (const theme of successfulThemes) {
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