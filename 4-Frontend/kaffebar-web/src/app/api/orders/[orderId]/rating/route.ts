import { NextResponse, type NextRequest } from "next/server";
import { ApiError, createOrderRating, fetchOrderRating } from "@/lib/api";
import type { CreateRatingRequest } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  try {
    return NextResponse.json(await fetchOrderRating(orderId));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  let body: CreateRatingRequest;
  try {
    body = (await request.json()) as CreateRatingRequest;
  } catch {
    return NextResponse.json({ message: "Forespørselen må inneholde gyldig JSON." }, { status: 400 });
  }

  try {
    return NextResponse.json(await createOrderRating(orderId, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function apiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Ukjent feil";
  const status = error instanceof ApiError ? error.status : 502;
  return NextResponse.json({ message }, { status });
}
