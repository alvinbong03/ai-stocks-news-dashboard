# AI Stocks News Dashboard  
## Product Requirements Document (PRD)

---

# 1. Product Overview

**AI Stocks News Dashboard** is a static web application designed to help beginner and retail investors understand how macro news themes (AI, Semiconductors, Energy, US Politics) influence related US stocks.

The application:

- Aggregates daily theme-based news
- Generates AI-powered daily summaries
- Clusters major events by topic
- Performs sentiment direction analysis per stock
- Displays 7-day and 30-day stock price charts
- Provides beginner-friendly explanations of financial concepts
- Is fully static and hosted via GitHub Pages
- Uses GitHub Actions as a daily data pipeline

The system prioritizes:

- Low cybersecurity risk
- Minimal backend complexity
- Strong frontend UI/UX
- Clean architecture suitable for portfolio demonstration

---

# 2. Goals

## 2.1 Primary Goals

1. Demonstrate API integration (NewsAPI + stock API)
2. Showcase frontend dashboard UI and data visualization
3. Demonstrate scheduled data processing via GitHub Actions
4. Integrate AI summarisation and sentiment classification
5. Provide an educational investing interface

## 2.2 Non-Goals

- Real-time trading
- Financial advice
- User accounts or authentication
- Storing personal user data
- Real-time streaming updates

---

# 3. Target Users

Beginner and retail investors who:

- Want to understand how AI and macro news affect stocks
- Prefer structured summaries over raw headlines
- Want simple explanations of financial terms
- Do not require accounts or personalization

---

# 4. Themes (MVP)

Users select one theme at a time.

Themes:

1. Artificial Intelligence
2. Semiconductors
3. Energy
4. US Politics (macro influences affecting AI-related stocks)

---

# 5. Functional Requirements

---

## 5.1 Theme Selection

Users can:

- Select one theme
- View:
  - Daily theme digest
  - Event clusters
  - Top related stocks
  - 7-day and 30-day price charts
  - AI-generated sentiment direction per stock
  - Beginner learning section

---

## 5.2 Top Stocks Per Theme

Stocks will be predefined and stored in static JSON.

### Example Mapping

**AI**
- NVDA
- MSFT
- GOOGL
- AMD
- META

**Semiconductors**
- NVDA
- TSM
- AMD
- INTC
- AVGO

**Energy**
- XOM
- CVX
- COP
- SLB
- BP

**US Politics Influence**
- Defense and semiconductor related firms
- Energy majors

Rationale:
- Avoid screener API complexity
- Ensure predictable, stable output
- Reduce API rate risk

---

## 5.3 News Aggregation

API: **NewsAPI.org**

Daily GitHub Actions workflow will:

- Query news by theme keywords
- Filter for:
  - US region
  - English language
- Limit to 15–20 top articles

Stored data:

- Title
- Source
- Published date
- URL
- Short description

---

## 5.4 AI Summarisation (Primary: Hugging Face Inference API)

Input:
- Headlines + short descriptions

Output:
- 5-bullet theme digest
- 2–3 macro insights

Stored as structured JSON:

```json
{
  "summary": "Text summary...",
  "insights": ["Insight 1", "Insight 2"]
}

## 5.5 Event Clustering

The AI system groups news articles into 3–5 major event clusters per theme.

Purpose:
- Help users understand dominant narratives.
- Avoid overwhelming users with raw headlines.
- Provide structured macro insights.

### Input
- Headlines
- Short descriptions
- Publication timestamps

### Output Format

```json
[
  {
    "topic": "Export Restrictions",
    "summary": "Summary of this topic",
    "articles": ["url1", "url2"]
  }
]
```

### Display Requirements

- Each cluster rendered as a card
- Expandable view to show related articles
- Clear topic title
- 1–2 paragraph AI summary
- Links open in new tab

---

## 5.6 Sentiment Direction (Google Cloud Natural Language API)

For each stock associated with the selected theme:

### Input
- Theme-level summary
- Stock ticker
- Stock name

### Output
- Sentiment score
- Magnitude value

Mapped to three categories:

- Positive  
- Neutral  
- Negative  

### Display Example

> "Current AI-related news suggests moderate positive pressure on NVDA due to strong enterprise demand."

### Notes

- No numeric correlation is calculated in MVP.
- Sentiment is directional and educational.
- Must include disclaimer that analysis is not financial advice.

---

## 5.7 Stock Data

### Data Source Options
- Alpha Vantage API
- Finnhub API

### Required Data
- Daily closing prices
- Last 30 days minimum

### Frontend Requirements

- Toggle between:
  - 7-day view
  - 30-day view
- Responsive line chart
- Tooltip with date and closing price
- Clear labeling

---

## 5.8 Beginner Learning Mode

Each theme includes an educational section.

### Content Includes

- What is CPI?
- What is interest rate hike?
- What are export controls?
- How inflation affects growth stocks?
- Why geopolitical risk impacts semiconductors?

### Generation Method

- AI-generated weekly
- Stored as JSON
- Displayed below main dashboard

### UI Requirements

- Collapsible sections
- Clean typography
- Beginner-friendly tone

---

# 6. Non-Functional Requirements

- Fully static frontend
- No user authentication
- No cookies required
- API keys stored only in GitHub Secrets
- Secrets never exposed to client
- Graceful fallback if APIs fail
- Clear disclaimer:

  > Educational purposes only. Not financial advice.

- Site must load under 3 seconds on standard broadband
- Mobile responsive

---

# 7. Technical Architecture

## 7.1 Frontend

- React (Vite)
- TailwindCSS
- Chart.js or Recharts
- Hosted on GitHub Pages

Reads static JSON from `/data/`.

---

## 7.2 Data Pipeline (GitHub Actions)

Scheduled daily workflow:

1. Fetch news via NewsAPI
2. Fetch stock history via stock API
3. Send data to Hugging Face for:
   - Theme summary
   - Event clustering
4. Send summary to Google NLP for:
   - Sentiment classification
5. Save JSON output to:

   `/data/YYYY-MM-DD/theme-ai.json`

6. Commit updated JSON to repo

---

## 7.3 AI API Strategy

Primary:
- Hugging Face Inference API
- Google Cloud Natural Language API

Fallback:
- OpenAI API if:
  - Hugging Face summarization quality is insufficient
  - API reliability issues occur
  - Integration complexity becomes excessive

---

# 8. Data Structure Example

```json
{
  "theme": "AI",
  "date": "2026-02-20",
  "digest": {
    "summary": "Summary text...",
    "insights": ["Insight 1", "Insight 2"]
  },
  "clusters": [],
  "stocks": [
    {
      "ticker": "NVDA",
      "price_history": [],
      "sentiment": "Positive",
      "analysis": "Explanation..."
    }
  ]
}
```

---

# 9. Security Considerations

- No backend server
- No database
- No user data
- API keys stored in GitHub Actions secrets
- Static JSON only
- Public GitHub repository
- No sensitive data exposure

---

# 10. UI Pages

1. Landing Page (Theme Selection)
2. Theme Dashboard
3. Stock Chart Component
4. Event Cluster Section
5. Beginner Learning Section
6. Methodology & Disclaimer Page

---

# 11. Optional Phase 2

## Impact Matrix

Grid view:

- Rows: Event clusters
- Columns: Stocks
- Cells: Sentiment direction

Not included in MVP.

---

# 12. Tech Stack Summary

Frontend:
- React + Vite
- TailwindCSS
- Chart.js or Recharts

APIs:
- NewsAPI.org
- Alpha Vantage or Finnhub
- Hugging Face Inference API
- Google Cloud Natural Language API

Fallback:
- OpenAI API

Deployment:
- GitHub Pages
- GitHub Actions

---

# 13. Implementation Phases

## Phase 1
- Frontend shell
- Theme selector
- Mock JSON

## Phase 2
- NewsAPI integration
- Stock API integration

## Phase 3
- Hugging Face summarisation
- Google NLP sentiment

## Phase 4
- Learning mode content generation