import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MyOrderTracker } from "@/components/MyOrderTracker";
import { RatingModal } from "@/components/RatingModal";
import { WeeklySummaryCard } from "@/components/WeeklySummaryCard";

function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("RatingModal", () => {
  it("viser tre vurderinger og sender valget til BFF-en", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          orderId: "order-1",
          userId: "demo-user",
          rating: "SAVED_MY_MORNING",
          dayOfWeek: "Monday",
          createdAt: "2026-10-19T09:00:00Z",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <RatingModal orderId="order-1" onClose={() => undefined} />,
    );

    expect(screen.getByRole("button", { name: /reddet morgenen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /helt grei/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /smakte som en klem/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reddet morgenen/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/order-1/rating",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ rating: "SAVED_MY_MORNING" }),
      }),
    ));
    expect(await screen.findByText(/takk for vurderingen/i)).toBeInTheDocument();
  });
});

describe("MyOrderTracker", () => {
  it("lar kunden åpne vurdering for en ferdig bestilling", () => {
    const onRecommendationFeedback = vi.fn();
    renderWithQueryClient(
      <MyOrderTracker
        orderId="order-1"
        ratedOrderIds={[]}
        onRecommendationFeedback={onRecommendationFeedback}
        initialOrders={[{
          orderId: "order-1",
          coffeeId: "coffee-1",
          coffeeName: "Kaffe Latte",
          customerName: "Ada",
          size: "MEDIUM",
          quantity: 1,
          status: "READY",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Likte kaffen" }));
    expect(onRecommendationFeedback).toHaveBeenCalledWith("order-1", "coffee-1", "up");

    fireEvent.click(screen.getByRole("button", { name: /vurder kaffen/i }));
    expect(screen.getByRole("dialog", { name: /hvordan var kaffen/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vurder kaffen/i })).toHaveFocus();
  });
});

describe("WeeklySummaryCard", () => {
  it("viser dagsstatistikk og humoristiske meldinger", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            savedMondaysCount: 4,
            savedTuesdaysCount: 0,
            savedWednesdaysCount: 0,
            savedThursdaysCount: 0,
            savedFridaysCount: 0,
            savedSaturdaysCount: 0,
            savedSundaysCount: 0,
            ratingCounts: {
              SAVED_MY_MORNING: 4,
              PRETTY_OK: 0,
              TASTED_LIKE_A_HUG: 0,
            },
            messages: [{ text: "Du har reddet 4 mandager med kaffe! ☕", focusDay: "Monday" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    renderWithQueryClient(<WeeklySummaryCard />);

    expect(await screen.findByText(/ukas kaffehumør/i)).toBeInTheDocument();
    expect(await screen.findByText("Du har reddet 4 mandager med kaffe! ☕")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });
});
