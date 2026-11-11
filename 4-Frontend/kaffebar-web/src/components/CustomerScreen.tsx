"use client";

import { useState } from "react";
import { OrderForm } from "./OrderForm";
import { MyOrderTracker } from "./MyOrderTracker";
import { WeeklySummaryCard } from "./WeeklySummaryCard";
import { CoffeeRecommender } from "./CoffeeRecommender";
import { useCoffeeRecommendation } from "@/hooks/useCoffeeRecommendation";
import type { Coffee, Order } from "@/types/domain";

/** Limet mellom skjemaet og «din bestilling»-kortet. Utlevert. */
export function CustomerScreen({
  menu,
  initialOrders,
}: {
  menu: Coffee[];
  initialOrders: Order[];
}) {
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(menu[0]?.id ?? null);
  const recommendationState = useCoffeeRecommendation();

  return (
    <div className="flex flex-col gap-8">
      <CoffeeRecommender
        menu={menu}
        preferences={recommendationState.preferences}
        feedback={recommendationState.feedback}
        storageError={recommendationState.storageError}
        onPreferencesChange={recommendationState.setPreferences}
        onChoose={setSelectedCoffeeId}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <OrderForm
          menu={menu}
          preferredMilk={recommendationState.preferences.milkType}
          onPreferredMilkChange={(milkType) =>
            recommendationState.setPreferences({
              ...recommendationState.preferences,
              milkType,
            })
          }
          selectedCoffeeId={selectedCoffeeId}
          onSelectedCoffeeChange={setSelectedCoffeeId}
          onOrdered={(order) => setMyOrderId(order.orderId)}
        />
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <MyOrderTracker
            orderId={myOrderId}
            initialOrders={initialOrders}
            ratedOrderIds={recommendationState.ratedOrders}
            onRecommendationFeedback={recommendationState.submitFeedback}
          />
        </aside>
      </div>
      <WeeklySummaryCard />
    </div>
  );
}
