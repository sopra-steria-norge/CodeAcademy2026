import type { Coffee, MilkType } from "@/types/domain";

export type CoffeeFlavor = "CHOCOLATE" | "FRUITY";
export type FeedbackVote = "up" | "down";

export interface CoffeePreferences {
  strength: number;
  flavor: CoffeeFlavor;
  milkType: MilkType | "NONE";
}

export interface CoffeeFeedback {
  positive: number;
  negative: number;
}

export type CoffeeFeedbackById = Record<string, CoffeeFeedback>;

export interface CoffeeMatch {
  coffee: Coffee;
  score: number;
  profileKnown: boolean;
}

interface CoffeeProfile {
  strength: number;
  flavor: CoffeeFlavor;
  milkBased: boolean;
}

export const DEFAULT_COFFEE_PREFERENCES: CoffeePreferences = {
  strength: 3,
  flavor: "CHOCOLATE",
  milkType: "NONE",
};

const COFFEE_PROFILES: Record<string, CoffeeProfile> = {
  filterkaffe: { strength: 2, flavor: "FRUITY", milkBased: false },
  espresso: { strength: 5, flavor: "CHOCOLATE", milkBased: false },
  "dobbel espresso": { strength: 5, flavor: "CHOCOLATE", milkBased: false },
  americano: { strength: 3, flavor: "CHOCOLATE", milkBased: false },
  cortado: { strength: 4, flavor: "CHOCOLATE", milkBased: true },
  cappuccino: { strength: 3, flavor: "CHOCOLATE", milkBased: true },
  "kaffe latte": { strength: 2, flavor: "CHOCOLATE", milkBased: true },
  "flat white": { strength: 4, flavor: "CHOCOLATE", milkBased: true },
  "chai latte": { strength: 1, flavor: "FRUITY", milkBased: true },
  mocha: { strength: 2, flavor: "CHOCOLATE", milkBased: true },
};

function getProfile(name: string): CoffeeProfile | undefined {
  return COFFEE_PROFILES[name.trim().toLocaleLowerCase("nb-NO")];
}

export function getCoffeeRecommendations(
  menu: Coffee[],
  preferences: CoffeePreferences,
  feedback: CoffeeFeedbackById = {},
): CoffeeMatch[] {
  return menu
    .map((coffee): CoffeeMatch => {
      const profile = getProfile(coffee.name);
      const rating = feedback[coffee.id];
      const learnedScore = Math.max(
        -6,
        Math.min(6, ((rating?.positive ?? 0) - (rating?.negative ?? 0)) * 2),
      );

      if (!profile) {
        return { coffee, score: learnedScore, profileKnown: false };
      }

      const strengthScore = 5 - Math.abs(profile.strength - preferences.strength);
      const flavorScore = profile.flavor === preferences.flavor ? 3 : -3;
      const prefersMilk = preferences.milkType !== "NONE";
      const milkScore = profile.milkBased === prefersMilk ? 2 : -2;

      return {
        coffee,
        score: strengthScore + flavorScore + milkScore + learnedScore,
        profileKnown: true,
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function recordCoffeeFeedback(
  feedback: CoffeeFeedbackById,
  coffeeId: string,
  vote: FeedbackVote,
): CoffeeFeedbackById {
  const current = feedback[coffeeId] ?? { positive: 0, negative: 0 };
  return {
    ...feedback,
    [coffeeId]: {
      positive: current.positive + Number(vote === "up"),
      negative: current.negative + Number(vote === "down"),
    },
  };
}
