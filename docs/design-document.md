# AI Stocks News Dashboard — Master Design + UI Scaffold Document

This document contains:

- UI/UX architecture
- Dark-only theme system
- Component inventory
- Hash routing structure
- Core component scaffolds
- Guardrails
- File structure

This document is intended to be AI-ready and implementation-ready.

---

# 1. Project Structure (Recommended)

```
ai-stocks-news-dashboard/
└── site/
    ├── src/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── shape-landing-hero.tsx
    │   │   │   ├── interactive-hover-button.tsx
    │   │   │   ├── loader-one.tsx
    │   │   ├── ThemeCardGrid.tsx
    │   │   ├── StockDrawer.tsx
    │   │   ├── EventClustersAccordion.tsx
    │   │   ├── LearningGlossary.tsx
    │   │   ├── StockChart.tsx
    │   ├── pages/
    │   │   ├── Landing.tsx
    │   │   ├── ThemeDashboard.tsx
    │   ├── styles/
    │   │   ├── theme.css
    │   ├── App.tsx
    │   ├── main.tsx
    ├── index.html
```

---

# 2. Dark Theme CSS (Dark Only)

`site/src/styles/theme.css`

```css
html {
  background: #171717;
  color: #e5e5e5;
}

.dark {
  --card: #262626;
  --ring: #f59e0b;
  --input: #404040;
  --muted: #262626;
  --accent: #92400e;
  --border: #404040;
  --radius: 0.375rem;

  --chart-1: #fbbf24;
  --chart-2: #d97706;
  --chart-3: #92400e;

  --popover: #262626;
  --primary: #f59e0b;
  --background: #171717;
  --foreground: #e5e5e5;

  --muted-foreground: #a3a3a3;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
}
```

Ensure `<html class="dark">`.

---

# 3. Hash Routing (App.tsx)

Use React Router HashRouter.

```tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import ThemeDashboard from "./pages/ThemeDashboard";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/theme/:slug" element={<ThemeDashboard />} />
      </Routes>
    </HashRouter>
  );
}
```

---

# 4. HeroGeometric (Amber Restyled)

`shape-landing-hero.tsx`

Replace gradient colors with amber tones and reduce glow.

```tsx
"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";

export function HeroGeometric() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-br from-[#92400e]/10 via-transparent to-[#f59e0b]/10 blur-3xl" />

      <div className="relative z-10 text-center max-w-3xl px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border mb-8">
          <Circle className="h-2 w-2 fill-[#f59e0b]" />
          <span className="text-sm text-muted-foreground">
            Educational Insights
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Learn How News Moves
          <br />
          <span className="text-[#f59e0b]">AI-Related Stocks</span>
        </h1>

        <p className="text-lg text-muted-foreground mb-8">
          Daily theme-based digest, event clusters, and price snapshots.
          Educational only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
```

---

# 5. Theme Card Grid (Clean, Non-Gimmicky)

`ThemeCardGrid.tsx`

```tsx
import { useNavigate } from "react-router-dom";

const themes = [
  { slug: "ai", title: "AI", description: "AI platform and model leaders." },
  { slug: "semiconductors", title: "Semiconductors", description: "Chips powering AI." },
  { slug: "energy", title: "Energy", description: "Infrastructure & power." },
  { slug: "us-politics", title: "US Politics", description: "Policy impact on markets." },
];

export default function ThemeCardGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {themes.map((theme) => (
        <div
          key={theme.slug}
          onClick={() => navigate(`/theme/${theme.slug}`)}
          className="cursor-pointer border border-border rounded-lg p-6 bg-card hover:bg-muted transition"
        >
          <h3 className="text-xl font-semibold mb-2">{theme.title}</h3>
          <p className="text-muted-foreground text-sm">
            {theme.description}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

# 6. Loader (Primary Color)

`loader-one.tsx`

```tsx
import { motion } from "framer-motion";

export default function LoaderOne() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-3 w-3 rounded-full bg-primary"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
```

---

# 7. Stock Drawer (Right Side)

`StockDrawer.tsx`

```tsx
import { useState } from "react";
import StockChart from "./StockChart";

export default function StockDrawer({ stock }) {
  if (!stock) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-card border-l border-border p-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">
        {stock.ticker}
      </h2>

      <StockChart data={stock.chartData} />

      <div className="mt-6 text-sm text-muted-foreground">
        {stock.explanation}
      </div>
    </div>
  );
}
```

---

# 8. Recharts Minimal Chart

Install:

```
npm install recharts
```

`StockChart.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function StockChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#a3a3a3" />
          <YAxis stroke="#a3a3a3" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

# 9. Event Clusters Accordion

Use shadcn Accordion.

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function EventClustersAccordion({ clusters }) {
  return (
    <Accordion type="single" collapsible>
      {clusters.map((cluster, idx) => (
        <AccordionItem key={idx} value={`item-${idx}`}>
          <AccordionTrigger>{cluster.title}</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-3">
              {cluster.summary}
            </p>
            {cluster.articles.slice(0, 3).map((a, i) => (
              <a key={i} href={a.url} target="_blank" className="block text-primary text-sm">
                {a.title}
              </a>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
```

---

# 10. Learning Glossary

```tsx
export default function LearningGlossary({ terms }) {
  return (
    <div className="space-y-4 mt-12">
      <h2 className="text-xl font-semibold">Learn the Terms</h2>
      {terms.map((term, i) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <h3 className="font-medium">{term.term}</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {term.definition}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

# 11. Anti-Vibecoded Guardrails

DO:
- Use consistent spacing
- Use only amber accent family
- Keep charts minimal
- Provide methodology text

DON’T:
- Add extra gradients beyond hero
- Add neon glow
- Add multiple animation layers
- Over-round corners
- Overuse hover animations

---

# 12. Data Display Rules

Digest:
- Max 5 bullets
- Max 3 insights

Clusters:
- 3–5 clusters
- Show top 3 articles

Stocks:
- 5 stocks max
- Drawer for details

Learning:
- Always visible near bottom

---

END OF MASTER DESIGN + UI SCAFFOLD