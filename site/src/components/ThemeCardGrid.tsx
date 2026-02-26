import { useNavigate } from "react-router-dom";

const themes = [
  { slug: "ai", title: "AI", description: "AI platform and model leaders." },
  { slug: "semiconductors", title: "Semiconductors", description: "Chips powering AI." },
  { slug: "energy", title: "Energy", description: "Infrastructure and power." },
  { slug: "us-politics", title: "US Politics", description: "Policy impact on markets." },
];

export default function ThemeCardGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {themes.map((t) => (
        <button
          key={t.slug}
          type="button"
          onClick={() => navigate(`/theme/${t.slug}`)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-left transition hover:bg-[var(--muted)]"
        >
          <h3 className="text-lg font-semibold">{t.title}</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {t.description}
          </p>
        </button>
      ))}
    </div>
  );
}