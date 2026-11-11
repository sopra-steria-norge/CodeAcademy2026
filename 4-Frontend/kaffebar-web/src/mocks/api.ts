import type {
  Coffee,
  CreateOrderRequest,
  CreateRatingRequest,
  DayOfWeek,
  Order,
  OrderRating,
  OrderStatus,
  WeeklySummary,
} from "@/types/domain";
import { DEMO_USER_ID } from "@/types/domain";
import { emitMockOrderCreated, emitMockStatusChanged } from "./events";
import {
  createMockOrder,
  findMockOrder,
  findMockRating,
  listMockRatings,
  listMockOrders,
  MOCK_MENU,
  setMockRating,
  setMockStatus,
} from "./store";

/**
 * Mock-modus: de samme fire operasjonene som `src/lib/api.ts`, men mot
 * minnelageret i stedet for over HTTP.
 *
 * Hvorfor ikke bare la et mock-bibliotek fange opp nettverkskallene? Fordi
 * serversiden i Next allerede har byttet ut `fetch` med sin egen versjon, og da
 * blir det et kappløp om hvem som pakker inn hvem. Vinner feil part, går kallet
 * ut på ekte og feiler med «fetch failed» — uten at noe sier fra om hvorfor.
 * Her er det ingen interception i det hele tatt, bare et funksjonskall, og da
 * oppfører mock-modus seg likt hver eneste gang.
 *
 * Feilmeldingene er de samme som API-et ville gitt, slik at feilhåndteringen i
 * UI-et kan testes uten containere.
 */

export function mockFetchMenu(): Coffee[] {
  return MOCK_MENU;
}

export function mockFetchOrders(params: { status?: OrderStatus; limit?: number } = {}): Order[] {
  return listMockOrders(params);
}

export function mockCreateOrder(request: CreateOrderRequest): Order {
  if (!request.customerName?.trim() || request.customerName.trim().length < 2) {
    throw new Error("customerName må være minst 2 tegn.");
  }

  let order: Order;
  try {
    order = createMockOrder(request);
  } catch {
    throw new Error(`Fant ingen kaffe med id ${request.coffeeId}.`);
  }

  emitMockOrderCreated(order);
  return order;
}

export function mockUpdateOrderStatus(orderId: string, status: OrderStatus): Order {
  const result = setMockStatus(orderId, status);
  if (!result) {
    throw new Error(`Fant ingen bestilling med id ${orderId}.`);
  }

  if (result.previousStatus !== status) {
    emitMockStatusChanged(result.order, result.previousStatus);
  }

  return result.order;
}

export function mockCreateOrderRating(
  orderId: string,
  request: CreateRatingRequest,
): OrderRating {
  const order = findMockOrder(orderId);
  if (!order) throw new Error(`Fant ingen bestilling med id ${orderId}.`);
  if (order.status !== "READY") throw new Error("Du kan vurdere en bestilling når den er klar.");
  if (!request.rating || !["SAVED_MY_MORNING", "PRETTY_OK", "TASTED_LIKE_A_HUG"].includes(request.rating)) {
    throw new Error("Velg en gyldig kaffevurdering.");
  }

  const createdAt = new Date().toISOString();
  return setMockRating({
    orderId,
    userId: DEMO_USER_ID,
    rating: request.rating,
    dayOfWeek: new Date(createdAt).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) as DayOfWeek,
    createdAt,
  });
}

export function mockFetchOrderRating(orderId: string): OrderRating {
  const rating = findMockRating(orderId);
  if (!rating) throw new Error(`Fant ingen vurdering for bestilling ${orderId}.`);
  return rating;
}

export function mockFetchWeeklySummary(userId: string): WeeklySummary {
  if (userId !== DEMO_USER_ID) throw new Error("Fant ikke brukeren.");

  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekRatings = listMockRatings().filter((rating) => Date.parse(rating.createdAt) >= monday.getTime());
  const ratingCounts: WeeklySummary["ratingCounts"] = {
    SAVED_MY_MORNING: weekRatings.filter((item) => item.rating === "SAVED_MY_MORNING").length,
    PRETTY_OK: weekRatings.filter((item) => item.rating === "PRETTY_OK").length,
    TASTED_LIKE_A_HUG: weekRatings.filter((item) => item.rating === "TASTED_LIKE_A_HUG").length,
  };
  const saved = weekRatings.filter((rating) => rating.rating === "SAVED_MY_MORNING");
  const days: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayCounts = Object.fromEntries(
    days.map((day) => [day, saved.filter((rating) => rating.dayOfWeek === day).length]),
  ) as Record<DayOfWeek, number>;

  const messages: WeeklySummary["messages"] = [];
  if (weekRatings.length === 0) {
    messages.push({ text: "Ingen kaffe vurdert denne uka – hvem er du?? ☕", focusDay: null });
  } else {
    const norwegianDays: Record<DayOfWeek, string> = {
      Monday: "mandager",
      Tuesday: "tirsdager",
      Wednesday: "onsdager",
      Thursday: "torsdager",
      Friday: "fredager",
      Saturday: "lørdager",
      Sunday: "søndager",
    };

    for (const day of days) {
      if (dayCounts[day] >= 4) {
        messages.push({
          text: `Du har reddet ${dayCounts[day]} ${norwegianDays[day]} med kaffe! ☕`,
          focusDay: day,
        });
      }
    }
    if (dayCounts.Saturday === 0) {
      messages.push({ text: "En lørdag uten kaffe – du er overmenneske!", focusDay: "Saturday" });
    }
    if (dayCounts.Friday >= 3) {
      messages.push({
        text: `Fredag er ditt beste vennskap med kaffe. ${dayCounts.Friday} ganger! 🎉`,
        focusDay: "Friday",
      });
    }
    if (ratingCounts.TASTED_LIKE_A_HUG >= 2) {
      messages.push({ text: "Noen av kaffene dine smakte visst som klemmer... 💔", focusDay: null });
    }
    if (messages.length === 0) {
      messages.push({ text: "Kaffeuka di går helt strålende – fortsett sånn! ☕", focusDay: null });
    }
  }

  return {
    savedMondaysCount: dayCounts.Monday,
    savedTuesdaysCount: dayCounts.Tuesday,
    savedWednesdaysCount: dayCounts.Wednesday,
    savedThursdaysCount: dayCounts.Thursday,
    savedFridaysCount: dayCounts.Friday,
    savedSaturdaysCount: dayCounts.Saturday,
    savedSundaysCount: dayCounts.Sunday,
    ratingCounts,
    messages,
  };
}
