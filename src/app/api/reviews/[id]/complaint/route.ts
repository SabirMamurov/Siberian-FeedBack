import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Пометить отзыв как рекламацию (или снять метку).
 * Body: { isComplaint: boolean }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  let body: { isComplaint?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.isComplaint !== "boolean") {
    return NextResponse.json({ error: "isComplaint (boolean) required" }, { status: 400 });
  }
  const updated = await prisma.review.update({
    where: { id },
    data: { isComplaint: body.isComplaint },
  });
  return NextResponse.json(updated);
}
