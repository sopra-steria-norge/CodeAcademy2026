"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_COFFEE_PREFERENCES,
  recordCoffeeFeedback,
  type CoffeeFeedbackById,
  type CoffeeFlavor,
  type CoffeePreferences,
  type FeedbackVote,
} from "@/lib/recommendation";
import type { MilkType } from "@/types/domain";

const STORAGE_KEY = "kaffebar:coffee-recommendations:v1";

interface SavedRecommendationState {
  preferences: CoffeePreferences;
  feedback: CoffeeFeedbackById;
  ratedOrders: string[];
}

const DEFAULT_STATE: SavedRecommendationState = {
  preferences: DEFAULT_COFFEE_PREFERENCES,
  feedback: {},
  ratedOrders: [],
};

function isCoffeeFlavor(value: unknown): value is CoffeeFlavor {
  return value === "CHOCOLATE" || value === "FRUITY";
}

function isMilkType(value: unknown): value is MilkType | "NONE" {
  return value === "NONE" || value === "WHOLE" || value === "SKIMMED" || value === "OAT" || value === "SOY";
}

function readSavedState(value: string): SavedRecommendationState {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Lagrede anbefalinger har ugyldig format.");
  }

  const saved = parsed as Partial<SavedRecommendationState>;
  const preferences = saved.preferences;
  if (
    !preferences ||
    typeof preferences.strength !== "number" ||
    !Number.isInteger(preferences.strength) ||
    preferences.strength < 1 ||
    preferences.strength > 5 ||
    !isCoffeeFlavor(preferences.flavor) ||
    !isMilkType(preferences.milkType) ||
    typeof saved.feedback !== "object" ||
    saved.feedback === null ||
    !Array.isArray(saved.ratedOrders) ||
    !saved.ratedOrders.every((orderId) => typeof orderId === "string")
  ) {
    throw new Error("Lagrede anbefalinger har ugyldig format.");
  }

  const feedback: CoffeeFeedbackById = {};
  for (const [coffeeId, rating] of Object.entries(saved.feedback)) {
    if (
      typeof rating !== "object" ||
      rating === null ||
      !Number.isInteger(rating.positive) ||
      rating.positive < 0 ||
      !Number.isInteger(rating.negative) ||
      rating.negative < 0
    ) {
      throw new Error("Lagret kaffetilbakemelding har ugyldig format.");
    }
    feedback[coffeeId] = { positive: rating.positive, negative: rating.negative };
  }

  return {
    preferences: {
      strength: preferences.strength,
      flavor: preferences.flavor,
      milkType: preferences.milkType,
    },
    feedback,
    ratedOrders: saved.ratedOrders,
  };
}

export function useCoffeeRecommendation() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setState(readSavedState(saved));
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "Kunne ikke lese lagrede anbefalinger.");
      } finally {
        setLoaded(true);
      }
    });

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunne ikke lagre anbefalingene.";
      window.setTimeout(() => setStorageError(message));
    }
  }, [loaded, state]);

  function setPreferences(preferences: CoffeePreferences) {
    setState((current) => ({ ...current, preferences }));
  }

  function submitFeedback(orderId: string, coffeeId: string, vote: FeedbackVote) {
    setState((current) => {
      if (current.ratedOrders.includes(orderId)) return current;
      return {
        ...current,
        feedback: recordCoffeeFeedback(current.feedback, coffeeId, vote),
        ratedOrders: [...current.ratedOrders, orderId],
      };
    });
  }

  return {
    preferences: state.preferences,
    setPreferences,
    feedback: state.feedback,
    ratedOrders: state.ratedOrders,
    submitFeedback,
    storageError,
  };
}
