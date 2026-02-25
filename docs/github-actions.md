# GitHub Actions Data Pipeline Spec (NewsAPI → HF Summaries/Clusters → Google NLP Sentiment → Stock Data → JSON → Commit)

This document specifies the daily data pipeline that runs on GitHub Actions and generates static JSON files committed into the repository for the GitHub Pages frontend to read.

This is designed to be:
- Low risk (no backend server)
- Secrets kept in GitHub Actions only
- Deterministic output saved as versioned JSON
- Robust to partial failures (fallback to last available data)

---

## 1. High-Level Flow

Schedule: daily (e.g., 06:00 UTC)

Steps:
1. Determine "today" in UTC.
2. For each theme (ai, semiconductors, energy, us-politics):
   - Fetch top news articles from NewsAPI for that theme.
   - Fetch stock price history (7d + 30d) for top 5 theme tickers.
   - Call Hugging Face for:
     - Daily digest summary (max 5 bullets)
     - Event clusters (3–5 clusters; each cluster includes article indices or URLs)
   - Call Google Cloud Natural Language for sentiment:
     - Inputs: theme summary + cluster summaries (combined)
     - Output: sentiment category for each stock (Positive/Neutral/Negative) and score/magnitude
   - Produce a single JSON file per theme for today.
3. Update a manifest index JSON for the frontend:
   - Latest available date per theme
   - List of dates available per theme (optional)
4. Commit and push changes into `data/` folder.

---

## 2. Repository Layout for Pipeline Outputs

Output directory (committed to main branch):

```
data/
  manifest.json
  2026-02-25/
    ai.json
    semiconductors.json
    energy.json
    us-politics.json
```

Why:
- Easy for frontend to load by date and theme
- Keeps commits organized
- Supports fallback to newest available date

---

## 3. Required Secrets (GitHub → Repo Settings → Secrets and variables → Actions)

### Secrets
- `NEWSAPI_KEY`  
- `HUGGINGFACE_API_KEY`
- `GOOGLE_CLOUD_NLP_API_KEY` (if using API key) OR service account JSON (preferred below)
- `ALPHAVANTAGE_API_KEY` or `FINNHUB_API_KEY` (choose one stock source)

### Preferred for Google NLP (lower risk / more standard)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (service account JSON content)

Notes:
- Do NOT store secrets in repo files.
- Do NOT expose secrets to frontend build.

---

## 4. Dependencies and Runtime

Pipeline implementation language: **Node.js (TypeScript)** (suggested for easiest integration with React project and JSON handling)

Action runtime:
- `node-version: 20`

Libraries (suggested):
- HTTP: `node-fetch` or `axios`
- Date: native `Intl` + simple formatting
- Schema validation: `zod` (optional but recommended)
- Google NLP: `@google-cloud/language` (recommended when using service account)

---

## 5. Themes and Static Ticker Mapping

Store mapping in repo as:
`site/src/data/themeTickers.json` OR `scripts/themeTickers.json`

Example:

```json
{
  "ai": ["NVDA", "MSFT", "GOOGL", "AMD", "META"],
  "semiconductors": ["NVDA", "TSM", "AMD", "INTC", "AVGO"],
  "energy": ["XOM", "CVX", "COP", "SLB", "BP"],
  "us-politics": ["LMT", "NOC", "RTX", "NVDA", "XOM"]
}
```

Pipeline reads this mapping to know which tickers to fetch.

---

## 6. NewsAPI Spec

Base endpoint:
- `https://newsapi.org/v2/everything`

For each theme:
- Build a query string with keywords
- Use `language=en`
- Use `sortBy=publishedAt`
- Use `pageSize=20`

Example keyword sets (editable):
- ai: `("artificial intelligence" OR "AI" OR "OpenAI" OR "LLM" OR "data center")`
- semiconductors: `("semiconductor" OR "chips" OR "TSMC" OR "NVIDIA" OR "export controls")`
- energy: `("oil" OR "gas" OR "OPEC" OR "energy prices" OR "power grid")`
- us-politics: `("US policy" OR "regulation" OR "Congress" OR "White House" OR "export controls")`

Data to extract per article:
- `title`
- `source.name`
- `publishedAt`
- `url`
- `description` (if exists)

Sanitization:
- Drop articles with missing `url` or missing `title`.
- Deduplicate by URL.

---

## 7. Stock Price Data Spec (7d + 30d)

Choose ONE provider for MVP (pipeline should support only one for simplicity):
- Alpha Vantage OR Finnhub

Output requirement per ticker:
- Date series with daily closing price
- At least last 30 trading days
- Frontend can slice last 7 for 7d view

Normalize output format:

```json
[
  { "date": "2026-02-20", "close": 123.45 },
  { "date": "2026-02-21", "close": 127.12 }
]
```

Notes:
- Some APIs include weekends. Filter to trading days only if needed.
- Ensure dates are ISO strings.

---

## 8) Hugging Face Inference API (Summaries + Clusters)

### Inputs
A compact prompt built from:
- Theme name
- Top N headlines + descriptions (N up to 20)
- Output requirements

### Output requirements (MVP)
1) `digest_bullets`: array length <= 5
2) `insights`: array length <= 3
3) `clusters`: array length 3–5
   - cluster title
   - cluster summary 1–2 paragraphs
   - list of article URLs (or indices referencing fetched articles)

### Strong recommendation: force JSON output
Prompt should demand strict JSON output. If output is invalid JSON:
- Retry once with a “fix JSON only” prompt
- If still invalid: fallback to a simple rule-based digest (first 5 headlines) and clusters empty

Example target JSON shape:

```json
{
  "digest_bullets": ["...", "..."],
  "insights": ["...", "..."],
  "clusters": [
    {
      "title": "Export controls tighten",
      "summary": "...",
      "article_urls": ["https://...", "https://..."]
    }
  ]
}
```

---

## 9. Google Cloud Natural Language (Sentiment)

Sentiment inputs per theme:
- Combine:
  - digest bullets
  - cluster summaries
- For each ticker, create a small text context:
  - `"Theme: AI. Ticker: NVDA. Summary: <combined theme summary>"`

Run Google NLP sentiment analysis and map to categories:

Mapping suggestion:
- score > 0.15 → Positive
- score < -0.15 → Negative
- else → Neutral

Store:
- `sentiment_category`
- `sentiment_score`
- `sentiment_magnitude`

Important:
- This is not prediction, only sentiment of text.
- Display disclaimer in frontend.

---

## 10. Output JSON Schema (Per Theme, Per Date)

File: `data/YYYY-MM-DD/<theme>.json`

```json
{
  "theme": "ai",
  "date": "YYYY-MM-DD",
  "last_updated_utc": "YYYY-MM-DDTHH:mm:ssZ",
  "news": [
    {
      "title": "...",
      "source": "...",
      "publishedAt": "...",
      "url": "...",
      "description": "..."
    }
  ],
  "digest": {
    "bullets": ["..."],
    "insights": ["..."]
  },
  "clusters": [
    {
      "title": "...",
      "summary": "...",
      "article_urls": ["..."]
    }
  ],
  "stocks": [
    {
      "ticker": "NVDA",
      "price_history": [
        { "date": "YYYY-MM-DD", "close": 0 }
      ],
      "sentiment": {
        "category": "Positive",
        "score": 0.0,
        "magnitude": 0.0
      },
      "ai_explanation": "1–2 sentence explanation derived from digest/clusters (optional in MVP)."
    }
  ],
  "disclaimer": "Educational use only. Not financial advice."
}
```

MVP simplification:
- `ai_explanation` can be omitted initially to reduce calls.
- Frontend can show sentiment badge + digest/clusters.

---

## 11. Manifest File

File: `data/manifest.json`

```json
{
  "generated_at_utc": "YYYY-MM-DDTHH:mm:ssZ",
  "themes": {
    "ai": {
      "latest_date": "YYYY-MM-DD",
      "available_dates": ["YYYY-MM-DD", "YYYY-MM-DD"]
    },
    "semiconductors": {
      "latest_date": "YYYY-MM-DD",
      "available_dates": ["YYYY-MM-DD"]
    }
  }
}
```

MVP can omit `available_dates` to reduce file size:
- Keep only `latest_date`.

---

## 12. Failure Handling Policy (Low Risk)

Per theme:
- If NewsAPI fails:
  - Do not overwrite existing theme JSON for latest date
  - Log error, continue other themes
- If Stock API fails for one ticker:
  - Keep ticker but set `price_history: []` and add `stock_error: true`
- If Hugging Face fails:
  - Fallback digest = first 5 headlines
  - clusters = []
- If Google NLP fails:
  - sentiment category = Neutral with score 0 and magnitude 0

Manifest update:
- Only update `latest_date` for theme if that theme’s JSON file was successfully written.

---

## 13. GitHub Actions Workflow Requirements

Workflow file:
`.github/workflows/generate-data.yml`

Triggers:
- schedule (cron)
- manual dispatch (`workflow_dispatch`)
- optional push trigger for script changes

Permissions:
- `contents: write` (needed to commit generated JSON)

Environment:
- Node 20
- install dependencies
- run script
- commit if changes exist
- push to main

Commit message format:
- `data: generate YYYY-MM-DD digest`

---

## 14. Minimal Workflow YAML (Spec)

This section describes what the YAML must include:

1) Checkout repository
2) Setup Node
3) Install deps in `site` (or in root if scripts are root)
4) Run generator script (example: `node scripts/generate.js`)
5) Configure git author
6) Commit and push if git diff exists

---

## 15) Generator Script Spec (Entry Point)

Script location suggestion:
- `site/scripts/generate-data.ts` OR `scripts/generate-data.ts`

Responsibilities:
- Read theme tickers mapping
- Compute date folder
- Run per-theme pipeline
- Write JSON files
- Update manifest
- Exit with non-zero only for catastrophic failure (so partial failures still commit other theme outputs)

Logging requirements:
- Print per-theme summary:
  - # articles fetched
  - tickers processed
  - HF success/fallback
  - NLP success/fallback
  - files written

---

## 16) “If combo fails” note (Fallback to OpenAI)

If Hugging Face summarisation quality or reliability is insufficient:
- Replace Hugging Face summarisation+clustering calls with OpenAI API
- Keep the JSON output contract unchanged
- Keep Google NLP sentiment unchanged (or optionally replace with OpenAI-based sentiment classification later)

---

## 17) What You Need to Decide (Pipeline)

To finalize implementation:
1) Stock data provider: Alpha Vantage or Finnhub
2) Exact cron time (UTC)
3) Whether to store `available_dates` array in manifest (nice-to-have)
4) Whether `ai_explanation` per stock is generated (extra call) or omitted in MVP

---
END