"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CoffeeRating, OrderRating, WeeklySummary } from "@/types/domain";

export const WEEKLY_SUMMARY_QUERY_KEY = ["weekly-summary"] as const;

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown; detail?: unknown };
    if (typeof body.message === "string") return body.message;
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Use the status text when a proxy returns a non-JSON error.
  }

  return `${response.status} ${response.statusText}`;
}

export function useCreateOrderRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, rating }: { orderId: string; rating: CoffeeRating }) => {
      const response = await fetch(`/api/orders/${orderId}/rating`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) throw new Error(await readError(response));
      return (await response.json()) as OrderRating;
    },
    onSuccess: async (_rating, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WEEKLY_SUMMARY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["order-rating", variables.orderId] }),
      ]);
    },
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: WEEKLY_SUMMARY_QUERY_KEY,
    queryFn: async (): Promise<WeeklySummary> => {
      const response = await fetch("/api/weekly-summary", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response));
      return (await response.json()) as WeeklySummary;
    },
  });
}
