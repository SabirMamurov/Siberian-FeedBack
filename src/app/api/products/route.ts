import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWbCard, wbProductUrl } from "@/lib/marketplaces/wb";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      marketplace: true,
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

/**
 * Добавить товар на мониторинг.
 * Body: { marketplaceCode: "wb", externalId: "208373562" }
 * Для WB сразу подтягиваем card.json чтобы заполнить name/brand/imtId.
 */
export async function POST(req: Request) {
  let body: { marketplaceCode?: string; externalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { marketplaceCode, externalId } = body;
  if (!marketplaceCode || !externalId) {
    return NextResponse.json(
      { error: "marketplaceCode and externalId are required" },
      { status: 400 }
    );
  }

  const mp = await prisma.marketplace.findUnique({
    where: { code: marketplaceCode },
  });
  if (!mp) {
    return NextResponse.json(
      { error: `unknown marketplace: ${marketplaceCode}` },
      { status: 400 }
    );
  }

  if (mp.code === "wb") {
    const nmId = Number(externalId);
    if (!Number.isFinite(nmId)) {
      return NextResponse.json(
        { error: "WB externalId must be a numeric nmId" },
        { status: 400 }
      );
    }
    let card;
    try {
      card = await fetchWbCard(nmId);
    } catch (e) {
      return NextResponse.json(
        { error: `WB card fetch failed: ${String((e as Error).message)}` },
        { status: 502 }
      );
    }
    const product = await prisma.product.upsert({
      where: {
        marketplaceId_externalId: { marketplaceId: mp.id, externalId: String(nmId) },
      },
      create: {
        marketplaceId: mp.id,
        externalId: String(nmId),
        imtId: String(card.imt_id),
        name: card.imt_name || `nm${nmId}`,
        brand: card.selling?.brand_name || null,
        url: wbProductUrl(nmId),
      },
      update: {
        imtId: String(card.imt_id),
        name: card.imt_name || `nm${nmId}`,
        brand: card.selling?.brand_name || null,
        isActive: true,
      },
    });
    return NextResponse.json(product, { status: 201 });
  }

  // Для других площадок пока создаём «пустую» запись без enrichment
  const product = await prisma.product.upsert({
    where: {
      marketplaceId_externalId: { marketplaceId: mp.id, externalId },
    },
    create: {
      marketplaceId: mp.id,
      externalId,
      name: `${mp.code}:${externalId}`,
    },
    update: { isActive: true },
  });
  return NextResponse.json(product, { status: 201 });
}
