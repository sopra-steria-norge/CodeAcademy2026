import { describe, expect, it } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MOCK_MENU } from "@/mocks/store";
import { CoffeeRecommender } from "@/components/CoffeeRecommender";
import { useCoffeeRecommendation } from "@/hooks/useCoffeeRecommendation";
import {
  DEFAULT_COFFEE_PREFERENCES,
  getCoffeeRecommendations,
  recordCoffeeFeedback,
  type CoffeePreferences,
} from "@/lib/recommendation";

describe("kaffeanbefaling", () => {
  it("rangerer kaffe etter valgt styrke og smak", () => {
    const preferences: CoffeePreferences = {
      strength: 5,
      flavor: "CHOCOLATE",
      milkType: "NONE",
    };

    const recommendations = getCoffeeRecommendations(MOCK_MENU, preferences);

    expect(recommendations[0]?.coffee.name).toBe("Espresso");
    expect(recommendations[0]?.score).toBeGreaterThan(
      recommendations.find((match) => match.coffee.name === "Filterkaffe")?.score ?? 0,
    );
  });

  it("tar hensyn til mild, fruktig smak og foretrukket melk", () => {
    const recommendations = getCoffeeRecommendations(MOCK_MENU, {
      strength: 1,
      flavor: "FRUITY",
      milkType: "OAT",
    });

    expect(recommendations[0]?.coffee.name).toBe("Chai Latte");
  });

  it("lar positiv tilbakemelding løfte kaffe i senere anbefalinger", () => {
    const target = MOCK_MENU.find((coffee) => coffee.name === "Filterkaffe");
    if (!target) throw new Error("Testmenyen mangler Filterkaffe");

    const before = getCoffeeRecommendations(MOCK_MENU, DEFAULT_COFFEE_PREFERENCES);
    const after = getCoffeeRecommendations(
      MOCK_MENU,
      DEFAULT_COFFEE_PREFERENCES,
      recordCoffeeFeedback({}, target.id, "up"),
    );

    expect(after.find((match) => match.coffee.id === target.id)?.score).toBeGreaterThan(
      before.find((match) => match.coffee.id === target.id)?.score ?? 0,
    );
  });

  it("støtter menyer med ukjente kaffetyper", () => {
    const recommendations = getCoffeeRecommendations(
      [{ id: "unknown", name: "Sesongens kaffe", price: 42 }],
      DEFAULT_COFFEE_PREFERENCES,
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.coffee.name).toBe("Sesongens kaffe");
  });

  it("lar kunden endre smak og velge anbefalingen", () => {
    const selected: string[] = [];

    function Harness() {
      const [preferences, setPreferences] = useState(DEFAULT_COFFEE_PREFERENCES);
      return (
        <CoffeeRecommender
          menu={MOCK_MENU}
          preferences={preferences}
          feedback={{}}
          storageError={null}
          onPreferencesChange={setPreferences}
          onChoose={(coffeeId) => selected.push(coffeeId)}
        />
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "Smak" }), {
      target: { value: "FRUITY" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Foretrukket melk" }), {
      target: { value: "OAT" },
    });

    expect(screen.getByText("Chai Latte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Velg anbefalingen" }));
    expect(selected).toEqual([MOCK_MENU[8]?.id]);
  });

  it("lagrer preferanser og tilbakemeldinger lokalt og hindrer dobbel stemme per ordre", async () => {
    window.localStorage.clear();

    const { result, unmount } = renderHook(() => useCoffeeRecommendation());
    await waitFor(() => expect(window.localStorage.getItem("kaffebar:coffee-recommendations:v1")).not.toBeNull());

    act(() => {
      result.current.setPreferences({ strength: 5, flavor: "FRUITY", milkType: "OAT" });
      result.current.submitFeedback("order-1", "coffee-1", "up");
      result.current.submitFeedback("order-1", "coffee-1", "down");
    });

    expect(result.current.feedback["coffee-1"]).toEqual({ positive: 1, negative: 0 });
    expect(result.current.ratedOrders).toEqual(["order-1"]);
    await waitFor(() => {
      const saved = window.localStorage.getItem("kaffebar:coffee-recommendations:v1");
      expect(saved).toContain('"strength":5');
      expect(saved).toContain('"positive":1');
    });

    unmount();
    const restored = renderHook(() => useCoffeeRecommendation());
    await waitFor(() => expect(restored.result.current.preferences).toEqual({
      strength: 5,
      flavor: "FRUITY",
      milkType: "OAT",
    }));
    expect(restored.result.current.ratedOrders).toEqual(["order-1"]);
  });
});
