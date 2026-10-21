"use client";

import { startTransition, useEffect, useState } from "react";

const METHODS = [
  {
    id: "pour-over",
    name: "Håndbrygg",
    label: "POUR OVER",
    ratio: 16,
    time: "2:45–3:30",
    timerSeconds: 180,
    description: "Rent og aromatisk",
    icon: "◉",
  },
  {
    id: "french-press",
    name: "Presskanne",
    label: "FRENCH PRESS",
    ratio: 15,
    time: "4 minutter",
    timerSeconds: 240,
    description: "Fyldig og rund",
    icon: "▤",
  },
  {
    id: "aeropress",
    name: "AeroPress",
    label: "AEROPRESS",
    ratio: 13,
    time: "2 minutter",
    timerSeconds: 120,
    description: "Søt med litt trøkk",
    icon: "◒",
  },
  {
    id: "espresso",
    name: "Espresso",
    label: "ESPRESSO",
    ratio: 2,
    time: "25–30 sek",
    timerSeconds: 28,
    description: "Konsentrert og intens",
    icon: "●",
  },
] as const;

const FAVORITE_STORAGE_KEY = "kaffebar:brewlab-favorite";

type FavoriteRecipe = {
  methodId: (typeof METHODS)[number]["id"];
  coffeeGrams: number;
  strengthPercent: number;
};

function isFavoriteRecipe(value: unknown): value is FavoriteRecipe {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const recipe = value as Record<string, unknown>;
  return (
    METHODS.some((method) => method.id === recipe.methodId) &&
    typeof recipe.coffeeGrams === "number" &&
    Number.isInteger(recipe.coffeeGrams) &&
    recipe.coffeeGrams >= 10 &&
    recipe.coffeeGrams <= 30 &&
    typeof recipe.strengthPercent === "number" &&
    [80, 85, 90, 95, 100, 105, 110, 115, 120].includes(recipe.strengthPercent)
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function BrewLab() {
  const [methodId, setMethodId] = useState<(typeof METHODS)[number]["id"]>("pour-over");
  const [coffeeGrams, setCoffeeGrams] = useState(18);
  const [strengthPercent, setStrengthPercent] = useState(100);
  const [timer, setTimer] = useState<{ running: boolean; remainingSeconds: number }>({
    running: false,
    remainingSeconds: METHODS[0].timerSeconds,
  });
  const [favorite, setFavorite] = useState<FavoriteRecipe | null>(null);
  const [storageMessage, setStorageMessage] = useState("");
  const method = METHODS.find((item) => item.id === methodId) ?? METHODS[0];
  const adjustedRatio = (method.ratio * strengthPercent) / 100;
  const waterGrams = Math.round(coffeeGrams * adjustedRatio);

  useEffect(() => {
    try {
      const storedRecipe = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (storedRecipe === null) {
        return;
      }

      const parsedRecipe: unknown = JSON.parse(storedRecipe);
      if (!isFavoriteRecipe(parsedRecipe)) {
        startTransition(() => {
          setStorageMessage("Favorittoppskriften kunne ikke leses. Lagre den på nytt.");
        });
        return;
      }

      startTransition(() => setFavorite(parsedRecipe));
    } catch {
      startTransition(() => {
        setStorageMessage("Favorittoppskriften kunne ikke lastes fra nettleseren.");
      });
    }
  }, []);

  useEffect(() => {
    if (!timer.running) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimer((currentTimer) =>
        currentTimer.remainingSeconds <= 1
          ? { running: false, remainingSeconds: 0 }
          : { ...currentTimer, remainingSeconds: currentTimer.remainingSeconds - 1 },
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timer.running]);

  function saveFavorite() {
    const recipe = { methodId, coffeeGrams, strengthPercent };
    try {
      window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(recipe));
      setFavorite(recipe);
      setStorageMessage("");
    } catch {
      setStorageMessage("Favorittoppskriften kunne ikke lagres i nettleseren.");
    }
  }

  function applyFavorite() {
    if (!favorite) {
      return;
    }

    setMethodId(favorite.methodId);
    setCoffeeGrams(favorite.coffeeGrams);
    setStrengthPercent(favorite.strengthPercent);
    setTimer({
      running: false,
      remainingSeconds:
        METHODS.find((item) => item.id === favorite.methodId)?.timerSeconds ??
        METHODS[0].timerSeconds,
    });
  }

  function selectMethod(nextMethodId: (typeof METHODS)[number]["id"]) {
    setMethodId(nextMethodId);
    setTimer({
      running: false,
      remainingSeconds:
        METHODS.find((item) => item.id === nextMethodId)?.timerSeconds ?? METHODS[0].timerSeconds,
    });
  }

  function removeFavorite() {
    try {
      window.localStorage.removeItem(FAVORITE_STORAGE_KEY);
      setFavorite(null);
      setStorageMessage("");
    } catch {
      setStorageMessage("Favorittoppskriften kunne ikke slettes fra nettleseren.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Velg bryggemetode</h3>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            {METHODS.length} metoder
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {METHODS.map((item) => {
            const selected = item.id === methodId;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectMethod(item.id)}
                className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  selected
                    ? "border-accent bg-accent-soft/70 ring-1 ring-accent"
                    : "border-line bg-white hover:border-accent/50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                    selected ? "bg-accent text-white" : "bg-background-deep text-accent"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="block font-semibold">{item.name}</span>
                <span className="mt-1 block text-sm text-secondary">{item.description}</span>
                <span className="mt-3 block text-[0.65rem] font-semibold tracking-[0.16em] text-muted">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="coffee-amount" className="font-semibold">
              Hvor mye kaffe?
            </label>
            <span className="rounded-lg bg-background-deep px-3 py-1 font-mono text-sm font-semibold">
              {coffeeGrams} g
            </span>
          </div>
          <input
            id="coffee-amount"
            type="range"
            min="10"
            max="30"
            step="1"
            value={coffeeGrams}
            onChange={(event) => setCoffeeGrams(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
            aria-describedby="coffee-amount-help"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>10 g</span>
            <span id="coffee-amount-help">Juster mengden for å skalere oppskriften</span>
            <span>30 g</span>
          </div>
        </div>

        <div className="mt-7 border-t border-line pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="brew-strength" className="font-semibold">
              Bryggestyrke
            </label>
            <span className="rounded-lg bg-background-deep px-3 py-1 font-mono text-sm font-semibold">
              {strengthPercent} %
            </span>
          </div>
          <input
            id="brew-strength"
            type="range"
            min="80"
            max="120"
            step="5"
            value={strengthPercent}
            onChange={(event) => setStrengthPercent(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--accent)]"
            aria-describedby="brew-strength-help"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Mildere</span>
            <span id="brew-strength-help">Finjuster forholdet mellom kaffe og vann</span>
            <span>Kraftigere</span>
          </div>
        </div>
      </div>

      <aside
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl bg-[#35251b] p-6 text-white shadow-sm sm:p-8"
      >
        <div aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b57a4c]/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/70">
            Din oppskrift
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{method.name}</h3>
          <p className="mt-1 text-sm text-white/60">Et godt sted å begynne.</p>

          <div className="my-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Kaffe</p>
              <p className="mt-1 text-3xl font-semibold">{coffeeGrams}<span className="ml-1 text-base font-normal text-white/60">g</span></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Vann</p>
              <p className="mt-1 text-3xl font-semibold">{waterGrams}<span className="ml-1 text-base font-normal text-white/60">ml</span></p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 py-4">
            <span className="text-sm text-white/65">Kaffe : vann</span>
            <span className="font-mono text-sm font-semibold">
              1 : {Number(adjustedRatio.toFixed(1))}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 py-4">
            <span className="text-sm text-white/65">Anbefalt bryggetid</span>
            <span className="text-sm font-semibold">{method.time}</span>
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/60">Bryggetimer</p>
                <p role="timer" aria-label="Tid igjen" className="mt-1 font-mono text-3xl font-semibold">
                  {formatTimer(timer.remainingSeconds)}
                </p>
              </div>
              <span className="text-sm text-white/60">
                {timer.remainingSeconds === 0 ? "Ferdig!" : "Klar når du er"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTimer((currentTimer) => ({ ...currentTimer, running: true }))}
                disabled={timer.running || timer.remainingSeconds === 0}
                className="rounded-full bg-[#f1c27d] px-4 py-2 text-sm font-semibold text-[#332318] transition hover:bg-[#ffdaa0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start timer
              </button>
              {timer.running && (
                <button
                  type="button"
                  onClick={() => setTimer((currentTimer) => ({ ...currentTimer, running: false }))}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Pause timer
                </button>
              )}
              <button
                type="button"
                onClick={() => setTimer({ running: false, remainingSeconds: method.timerSeconds })}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Nullstill timer
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveFavorite}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Lagre favorittoppskrift
              </button>
              {favorite && (
                <>
                  <button
                    type="button"
                    onClick={applyFavorite}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Bruk favorittoppskrift
                  </button>
                  <button
                    type="button"
                    onClick={removeFavorite}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    Slett favoritt
                  </button>
                </>
              )}
            </div>
            {favorite && (
              <p className="mt-2 text-xs text-white/60" role="status">
                Favorittoppskrift lagret i denne nettleseren.
              </p>
            )}
            {storageMessage && (
              <p className="mt-2 text-xs text-orange-200" role="alert">
                {storageMessage}
              </p>
            )}
          </div>

          <p className="mt-3 rounded-xl bg-white/5 px-4 py-3 text-xs leading-5 text-white/60">
            Dette er et utgangspunkt — smak deg fram og juster etter bønnene dine.
          </p>
        </div>
      </aside>
    </div>
  );
}
