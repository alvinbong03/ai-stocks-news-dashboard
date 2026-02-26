import { HeroGeometric } from "../components/ui/shape-landing-hero.tsx";
import ThemeCardGrid from "../components/ThemeCardGrid.tsx";

export default function Landing() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <HeroGeometric />
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold mb-3">Choose a theme</h2>
        <p className="text-[var(--muted-foreground)] mb-8">
          Explore how macro news themes can influence related stocks. Educational only.
        </p>
        <ThemeCardGrid />
      </section>
    </main>
  );
}