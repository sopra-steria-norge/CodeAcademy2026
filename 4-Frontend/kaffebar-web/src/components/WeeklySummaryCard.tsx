"use client";

import { useWeeklySummary } from "@/hooks/useRatings";
import type { CoffeeRating } from "@/types/domain";

const DAYS = [
  { label: "Man", key: "savedMondaysCount" },
  { label: "Tir", key: "savedTuesdaysCount" },
  { label: "Ons", key: "savedWednesdaysCount" },
  { label: "Tor", key: "savedThursdaysCount" },
  { label: "Fre", key: "savedFridaysCount" },
  { label: "Lør", key: "savedSaturdaysCount" },
  { label: "Søn", key: "savedSundaysCount" },
] as const;

const RATINGS: { key: CoffeeRating; label: string }[] = [
  { key: "SAVED_MY_MORNING", label: "Reddet morgenen" },
  { key: "PRETTY_OK", label: "Helt grei" },
  { key: "TASTED_LIKE_A_HUG", label: "Smakte som en klem" },
];

export function WeeklySummaryCard() {
  const { data, isPending, isError, error } = useWeeklySummary();

  return (
    <section
      aria-labelledby="weekly-summary-title"
      className="rounded-2xl border border-line bg-card p-5 shadow-sm"
    >
      <h2 id="weekly-summary-title" className="text-lg font-bold">Ukas kaffehumør ☕</h2>
      {isPending && <p role="status" className="mt-3 text-sm text-secondary">Henter ukas oppsummering …</p>}
      {isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Klarte ikke å hente ukas oppsummering: {error.message}
        </p>
      )}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-7 gap-2" aria-label="Kopper som reddet dagen per ukedag">
            {DAYS.map(({ label, key }) => {
              const count = data[key];
              return (
                <div key={key} className="rounded-xl bg-accent-soft/60 px-1 py-2 text-center">
                  <p className="text-xs text-secondary">{label}</p>
                  <p className="font-bold" aria-label={`${count} ${label}`}>
                    {count}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {RATINGS.map(({ key, label }) => (
              <p key={key}>
                <span className="text-secondary">{label}:</span>{" "}
                <strong>{data.ratingCounts[key] ?? 0}</strong>
              </p>
            ))}
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {data.messages.map((message, index) => (
              <li key={`${message.text}-${index}`} className="rounded-lg bg-background-deep px-3 py-2 text-sm">
                {message.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
