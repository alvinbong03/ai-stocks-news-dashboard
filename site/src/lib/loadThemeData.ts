export type ThemeSlug = "ai" | "semiconductors" | "energy" | "us-politics";

export type Sentiment = {
  category: "Positive" | "Neutral" | "Negative";
  score: number;
  magnitude: number;
};

export type PricePoint = {
  date: string;
  close: number;
};

export type ThemeData = {
  theme: ThemeSlug;
  date: string;
  digest: {
    bullets: string[];
    insights: string[];
  };
  clusters: {
    title: string;
    summary: string;
    article_urls: string[];
  }[];
  stocks: {
    ticker: string;
    price_history: PricePoint[];
    sentiment?: Sentiment;
  }[];
  disclaimer: string;
};

type Manifest = {
  generated_at_utc: string;
  themes: Record<ThemeSlug, { latest_date: string; available_dates?: string[] }>;
};

async function loadManifest(): Promise<Manifest> {
  const baseUrl = import.meta.env.BASE_URL; // "/" locally, "/<repo-name>/" on GitHub Pages
  const res = await fetch(`${baseUrl}data/manifest.json`); // fetch manifest to find latest data date for each theme
  if (!res.ok) {
    throw new Error("Failed to load data/manifest.json");
  }
  return res.json();
}

export async function loadThemeData(slug: ThemeSlug): Promise<ThemeData> {
  const manifest = await loadManifest();
  const latestDate = manifest.themes[slug]?.latest_date;

  if (!latestDate) {
    throw new Error(`No latest_date found in manifest for theme: ${slug}`);
  }

  const baseUrl = import.meta.env.BASE_URL; // "/" locally, "/<repo-name>/" on GitHub Pages
  const res = await fetch(`${baseUrl}data/${latestDate}/${slug}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load theme data for ${slug} at ${latestDate}`);
  }

  return res.json();
}