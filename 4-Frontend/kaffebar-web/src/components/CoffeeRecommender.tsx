"use client";

import {
  getCoffeeRecommendations,
  type CoffeeFeedbackById,
  type CoffeeFlavor,
  type CoffeePreferences,
} from "@/lib/recommendation";
import { MILK_LABEL, type Coffee, type MilkType } from "@/types/domain";

const MILKS: (MilkType | "NONE")[] = ["NONE", "WHOLE", "SKIMMED", "OAT", "SOY"];

export function CoffeeRecommender({
  menu,
  preferences,
  feedback,
  storageError,
  onPreferencesChange,
  onChoose,
}: {
  menu: Coffee[];
  preferences: CoffeePreferences;
  feedback: CoffeeFeedbackById;
  storageError: string | null;
  onPreferencesChange: (preferences: CoffeePreferences) => void;
  onChoose: (coffeeId: string) => void;
}) {
  const recommendation = getCoffeeRecommendations(menu, preferences, feedback)[0];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Finn din kaffematch ☕</h2>
        <p className="mt-1 text-sm text-secondary">
          Velg smakspreferanser, så finner vi den beste kaffen på menyen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Styrke: {preferences.strength}/5</span>
          <input
            type="range"
            min={1}
            max={5}
            value={preferences.strength}
            onChange={(event) =>
              onPreferencesChange({ ...preferences, strength: Number(event.target.value) })
            }
            aria-label="Foretrukket kaffestyrke"
          />
          <span className="flex justify-between text-xs text-secondary">
            <span>Mild</span>
            <span>Sterk</span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Smak</span>
          <select
            value={preferences.flavor}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                flavor: event.target.value as CoffeeFlavor,
              })
            }
            className="rounded-lg border border-line bg-card px-3 py-2"
          >
            <option value="CHOCOLATE">Sjokolade og nøtter</option>
            <option value="FRUITY">Fruktig og frisk</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold">Foretrukket melk</span>
          <select
            value={preferences.milkType}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                milkType: event.target.value as MilkType | "NONE",
              })
            }
            className="rounded-lg border border-line bg-card px-3 py-2"
          >
            {MILKS.map((milk) => (
              <option key={milk} value={milk}>
                {milk === "NONE" ? "Ingen melk" : MILK_LABEL[milk]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {recommendation ? (
        <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Din anbefaling</p>
            <p className="text-lg font-bold">{recommendation.coffee.name}</p>
            <p className="text-sm text-secondary">
              {recommendation.profileKnown
                ? `Smaksmatch: ${recommendation.score} poeng`
                : "Vi lærer fortsatt smakprofilen til denne kaffen."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChoose(recommendation.coffee.id)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Velg anbefalingen
          </button>
        </div>
      ) : (
        <p className="text-sm text-secondary">Det finnes ingen kaffe på menyen å anbefale akkurat nå.</p>
      )}

      {storageError && (
        <p role="status" className="text-sm text-secondary">
          {storageError} Preferansene beholdes bare mens denne siden er åpen.
        </p>
      )}

    </section>
  );
}
