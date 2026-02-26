export type ThemeSlug = "ai" | "semiconductors" | "energy" | "us-politics";

export type LearningItem = {
  title: string;
  body: string;
};

export const learningByTheme: Record<ThemeSlug, LearningItem[]> = {
  ai: [
    {
      title: "What is a 'growth stock' and why does AI news affect it?",
      body:
        "Growth stocks are companies expected to grow earnings faster than average. AI news can change investors’ expectations about future growth, which can move prices quickly.",
    },
    {
      title: "What are export controls and why do they matter?",
      body:
        "Export controls are rules that restrict selling certain advanced technologies to other countries. They can affect chip supply chains and demand, especially for GPUs and advanced semiconductors.",
    },
  ],
  semiconductors: [
    {
      title: "Why do interest rates matter for semiconductor stocks?",
      body:
        "Higher rates can reduce how much investors are willing to pay for future earnings. Semiconductor firms are often priced based on long-term growth, so rate expectations can move the sector.",
    },
    {
      title: "What is a supply chain 'constraint'?",
      body:
        "A constraint is a bottleneck that limits production or delivery, like limited chip packaging capacity. Constraints can increase lead times and influence revenue timing.",
    },
  ],
  energy: [
    {
      title: "What is oil price sensitivity?",
      body:
        "Energy companies’ revenue can rise or fall with oil and gas prices. Big moves in commodity prices can quickly change profit expectations for the sector.",
    },
    {
      title: "What is geopolitical risk in energy markets?",
      body:
        "Geopolitical events can disrupt supply routes or production. Even the risk of disruption can change prices because markets price uncertainty.",
    },
  ],
  "us-politics": [
    {
      title: "Why do elections and policy headlines move markets?",
      body:
        "Policy can change regulations, taxes, subsidies, and government spending. That can affect company costs and demand, especially in defense, energy, and strategic tech sectors.",
    },
    {
      title: "What is 'macro risk'?",
      body:
        "Macro risk is economy-wide risk such as inflation, recession, or major policy shifts. It affects many industries at once, so it can move whole market sectors together.",
    },
  ],
};