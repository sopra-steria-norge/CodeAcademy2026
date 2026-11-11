import { NextResponse } from "next/server";
import { ApiError, fetchWeeklySummary } from "@/lib/api";
import { DEMO_USER_ID } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchWeeklySummary(DEMO_USER_ID));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    const status = error instanceof ApiError ? error.status : 502;
    return NextResponse.json({ message }, { status });
  }
}
