import { NextResponse } from "next/server";
import { syncWildberries } from "@/lib/sync/wb";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // секунды; на случай большого каталога

export async function POST() {
  try {
    const summary = await syncWildberries();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: String((e as Error).message || e) },
      { status: 500 }
    );
  }
}
