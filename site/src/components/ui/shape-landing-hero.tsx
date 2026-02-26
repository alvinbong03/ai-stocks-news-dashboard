"use client";

import { Circle } from "lucide-react";

export function HeroGeometric() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#92400e]/10 via-transparent to-[#f59e0b]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-28">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1">
            <Circle className="h-2 w-2 fill-[#f59e0b]" />
            <span className="text-sm text-[var(--muted-foreground)]">
              Educational Insights
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1">
            <Circle className="h-2 w-2 fill-blue-400" />
            <span className="text-sm text-[var(--muted-foreground)]">
              Investments
            </span>
          </div>
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
          Learn How News Moves
          <br />
          <span className="text-[#f59e0b]">And How It Impacts AI Stocks</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-[var(--muted-foreground)]">
          Daily news digest and clusters for specific fields with related stock price snapshots. 
          Ever wonder how AI news and policies affects stock prices? 
        </p>


        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Educational only. Not financial advice.
        </p>
      </div>
    </section>
  );
}