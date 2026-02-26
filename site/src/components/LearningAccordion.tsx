import { useState } from "react";
import type { LearningItem } from "@/lib/learningContent";

export default function LearningAccordion({ items }: { items: LearningItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Beginner learning</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Short explanations to help you understand today’s news and market moves.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={`${idx}-${it.title}`} className="rounded-md border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <span className="font-semibold">{it.title}</span>
                <span className="text-sm text-[var(--muted-foreground)]">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
                  {it.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}