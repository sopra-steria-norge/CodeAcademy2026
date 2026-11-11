"use client";

import { useRef, useState } from "react";
import { OrderCard } from "./OrderCard";
import { RatingModal } from "./RatingModal";
import { LiveIndicator } from "./LiveIndicator";
import { useOrders } from "@/hooks/useOrders";
import type { FeedbackVote } from "@/lib/recommendation";
import type { Order } from "@/types/domain";

/**
 * «Din bestilling» på kundeskjermen. Utlevert.
 *
 * Samme hook som baristaskjermen bruker — så når baristaen trykker «Marker som
 * klar» i det andre vinduet, endrer dette kortet seg uten at kunden gjør noe.
 * Det er den demoen.
 */
export function MyOrderTracker({
  orderId,
  initialOrders,
  ratedOrderIds,
  onRecommendationFeedback,
}: {
  orderId: string | null;
  initialOrders: Order[];
  ratedOrderIds: string[];
  onRecommendationFeedback: (orderId: string, coffeeId: string, vote: FeedbackVote) => void;
}) {
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const ratingButtonRef = useRef<HTMLButtonElement>(null);
  const { data: orders = [], connection } = useOrders(initialOrders);
  const order = orderId ? orders.find((candidate) => candidate.orderId === orderId) : undefined;

  if (!order) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-accent-soft/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Din bestilling</h2>
        <LiveIndicator state={connection} />
      </div>
      <OrderCard order={order} showBadge />
      {order.status === "READY" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Hvordan likte du kaffen?</p>
          {ratedOrderIds.includes(order.orderId) ? (
            <p role="status" className="text-sm text-secondary">
              Takk! Tilbakemeldingen påvirker senere kaffeforslag.
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Likte kaffen"
                onClick={() => onRecommendationFeedback(order.orderId, order.coffeeId, "up")}
                className="rounded-lg border border-line px-4 py-2 text-lg hover:bg-accent-soft"
              >
                👍
              </button>
              <button
                type="button"
                aria-label="Likte ikke kaffen"
                onClick={() => onRecommendationFeedback(order.orderId, order.coffeeId, "down")}
                className="rounded-lg border border-line px-4 py-2 text-lg hover:bg-accent-soft"
              >
                👎
              </button>
            </div>
          )}
        </div>
      )}
      {order.status === "READY" && (
        <button
          ref={ratingButtonRef}
          type="button"
          onClick={() => setIsRatingOpen(true)}
          className="w-full rounded-lg border border-accent px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          Vurder kaffen
        </button>
      )}
      {isRatingOpen && (
        <RatingModal
          orderId={order.orderId}
          onClose={() => {
            setIsRatingOpen(false);
            ratingButtonRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}
