/**
 * Kortnavn for typene som kommer ut av kontrakten.
 *
 * `kaffebar.ts` er generert med `yarn generate:types` og skal ikke redigeres.
 * Denne fila er den eneste håndskrevne broen over til den, slik at resten av
 * appen kan skrive `Order` i stedet for
 * `components["schemas"]["Order"]`.
 */
import type { components } from "./kaffebar";

type ApiCoffee = components["schemas"]["Coffee"];
type ApiOrder = components["schemas"]["Order"];
type ApiCreateOrderRequest = components["schemas"]["CreateOrderRequest"];
type ApiWeeklySummary = components["schemas"]["WeeklySummary"];

export type Coffee = Omit<ApiCoffee, "price"> & { price: number };
export type Order = Omit<ApiOrder, "milkType" | "extraShot" | "quantity"> & {
  milkType?: Exclude<ApiOrder["milkType"], null>;
  extraShot?: boolean | null;
  quantity: number;
};
export type OrderStatus = components["schemas"]["OrderStatus"];
export type CoffeeSize = components["schemas"]["CoffeeSize"];
export type MilkType = Exclude<components["schemas"]["MilkType"], null>;
export type CreateOrderRequest = Omit<ApiCreateOrderRequest, "milkType" | "extraShot" | "quantity"> & {
  milkType?: MilkType;
  extraShot?: boolean;
  quantity: number;
};
export type Problem = components["schemas"]["HttpValidationProblemDetails"];
export type CoffeeRating = components["schemas"]["CoffeeRating"];
export type CreateRatingRequest = components["schemas"]["CreateRatingRequest"];
export type OrderRating = components["schemas"]["OrderRating"];
export type WeeklySummary = Omit<
  ApiWeeklySummary,
  | "savedMondaysCount"
  | "savedTuesdaysCount"
  | "savedWednesdaysCount"
  | "savedThursdaysCount"
  | "savedFridaysCount"
  | "savedSaturdaysCount"
  | "savedSundaysCount"
  | "ratingCounts"
> & {
  savedMondaysCount: number;
  savedTuesdaysCount: number;
  savedWednesdaysCount: number;
  savedThursdaysCount: number;
  savedFridaysCount: number;
  savedSaturdaysCount: number;
  savedSundaysCount: number;
  ratingCounts: Record<CoffeeRating, number>;
};
export type RatingMessage = components["schemas"]["RatingMessage"];
export type DayOfWeek = components["schemas"]["DayOfWeek"];

/** Identiteten som brukes av denne workshopen, som ennå ikke har innlogging. */
export const DEMO_USER_ID = "22222222-2222-2222-2222-222222222222";

/** Kolonnene på baristaskjermen, i den rekkefølgen en ordre beveger seg. */
export const STATUS_ORDER = ["PENDING", "BREWING", "READY"] as const;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "I kø",
  BREWING: "Under arbeid",
  READY: "Klar",
};

export const SIZE_LABEL: Record<CoffeeSize, string> = {
  SMALL: "Liten",
  MEDIUM: "Medium",
  LARGE: "Stor",
};

export const MILK_LABEL: Record<MilkType, string> = {
  WHOLE: "Helmelk",
  SKIMMED: "Skummet",
  OAT: "Havre",
  SOY: "Soya",
};

/** Hendelsene kaffebar-api publiserer på `kaffebar`-exchangen. */
export interface KaffebarEvent {
  type: "order.created" | "order.status-changed";
  timestamp: string;
  data: Order;
  previousStatus?: OrderStatus;
}
