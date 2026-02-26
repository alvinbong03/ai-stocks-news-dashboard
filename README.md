# AI Stocks News Dashboard

A static, automated dashboard that generates a daily AI-assisted digest of market narratives across AI, semiconductors, energy, and US politics, and connects them to real stock price data. The main project goal is to help beginner investors learn to read and observe AI-related news and observe market movements while I practice web development. This was an issue I wished to solve when I started learning investing.

All data is generated once per day via GitHub Actions and served as static JSON to a TypeScript React frontend.

---

## What This Project Does

- Fetches daily news headlines
- Clusters related stories into event narratives
- Generates structured summaries using Hugging Face
- Fetches real stock price history from Stooq
- Labels sentiment direction (Positive / Neutral / Negative)
- Displays interactive charts and stock drill-down drawer
- Deploys automatically via CI/CD

---

## Architecture Overview

This project uses a static architecture to avoid runtime failures and secret exposure.

### Daily Pipeline Flow

1. GitHub Actions runs on schedule
2. Fetch news (NewsAPI)
3. Fetch stock prices (Stooq)
4. Generate:
   - Daily digest bullets
   - Event clusters
   - Sentiment direction
5. Validate AI JSON output
6. Write structured files to:

   ```
   /data/YYYY-MM-DD/theme.json
   ```

7. Update `manifest.json`
8. Deploy static site to GitHub Pages

The frontend only reads generated JSON.  
There is no backend server in production.

---

## Tech Stack

### Frontend
- React
- TypeScript
- React Router
- Tailwind CSS
- Recharts

### Data & AI
- NewsAPI
- Stooq
- Hugging Face Inference API

### DevOps
- GitHub Actions
- GitHub Pages
- Environment-based secret management

---

## Key Technical Skills 

### 1. Automated Data Pipelines
- Scheduled CI jobs
- API orchestration
- Structured JSON generation

### 2. AI Integration with Validation
- Prompt-controlled structured outputs
- Strict JSON parsing
- Retry logic with exponential backoff

### 3. Safe Secret Handling
- Secrets stored in GitHub repository settings
- No API keys exposed to the client
- Static site architecture prevents runtime leaks

### 4. Frontend Engineering
- Typed data contracts with TypeScript
- Conditional rendering and loading states
- Dynamic theme routing
- Interactive stock drawer
- Window-based chart switching (7d / 30d)
- Sentiment-based visual styling

### 5. Clear Separation of Concerns
- Data generation layer (`/scripts`)
- Static data layer (`/data`)
- Presentation layer (`/site`)
- CI orchestration (`.github/workflows`)

---

## How to Run Locally

### 1. Install dependencies

```
npm install --prefix site
```

### 2. Create `.env` in project root

```
NEWSAPI_KEY=your_key
HUGGINGFACE_API_KEY=your_key
HUGGINGFACE_MODEL=your_model
```

### 3. Generate data

```
node scripts/generate-data.mjs
```

### 4. Run frontend

```
npm --prefix site run dev
```

---

## Disclaimer

This project is for educational purposes only.  
It does not provide financial advice.

---

Built as a portfolio project to demonstrate full-stack integration, AI-assisted data processing, CI/CD automation, and production-safe static deployment architecture.
