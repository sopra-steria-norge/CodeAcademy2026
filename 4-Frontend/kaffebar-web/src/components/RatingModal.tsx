"use client";

import { useEffect, useRef } from "react";
import { useCreateOrderRating } from "@/hooks/useRatings";
import type { CoffeeRating } from "@/types/domain";

const OPTIONS: { rating: CoffeeRating; emoji: string; label: string }[] = [
  { rating: "SAVED_MY_MORNING", emoji: "🚀", label: "Reddet morgenen" },
  { rating: "PRETTY_OK", emoji: "😋", label: "Helt grei" },
  { rating: "TASTED_LIKE_A_HUG", emoji: "💔", label: "Smakte som en klem" },
];

export function RatingModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const mutation = useCreateOrderRating();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const successButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (mutation.isSuccess ? successButtonRef.current : firstOptionRef.current)?.focus();
  }, [mutation.isSuccess]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;

      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <section className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rating-title" className="text-xl font-bold">Hvordan var kaffen?</h2>
            <p className="mt-1 text-sm text-secondary">Gi dagens kopp et lite humør.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk vurdering"
            className="rounded-lg px-2 py-1 text-secondary hover:bg-accent-soft"
          >
            ×
          </button>
        </div>

        {mutation.isSuccess ? (
          <div className="mt-5 rounded-xl bg-[var(--status-ready-soft)] p-4 text-center text-[var(--status-ready)]">
            <p className="font-semibold">Takk for vurderingen! ☕</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              ref={successButtonRef}
            >
              Ferdig
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            {OPTIONS.map((option) => (
              <button
                key={option.rating}
                type="button"
                disabled={mutation.isPending}
                ref={option.rating === OPTIONS[0].rating ? firstOptionRef : undefined}
                onClick={() => mutation.mutate({ orderId, rating: option.rating })}
                className="flex items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
              >
                <span aria-hidden="true" className="text-2xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
            {mutation.isPending && <p role="status" className="text-sm text-secondary">Lagrer vurderingen …</p>}
            {mutation.isError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error.message}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
