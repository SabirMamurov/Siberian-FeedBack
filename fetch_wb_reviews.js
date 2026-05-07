#!/usr/bin/env node
/**
 * Парсер отзывов Wildberries по nmId (артикулу).
 *
 * Как это работает:
 * 1. По nmId находим basket-NN.wbbasket.ru (формула диапазонов ниже).
 * 2. Берём card.json → достаём imt_id (ID карточки-родителя, объединяющей варианты).
 * 3. Дёргаем feedbacks2.wb.ru/feedbacks/v2/{imt_id}, фолбэк на feedbacks1.wb.ru.
 *    Сервер всегда отдаёт br/gzip — undici fetch распакует автоматически.
 *
 * Использование:
 *   node fetch_wb_reviews.js <nmId> [<nmId> ...]
 *   node fetch_wb_reviews.js 208373562
 *   node fetch_wb_reviews.js --json 208373562  # дамп всех полей в JSON
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const COMMON_HEADERS = {
  "User-Agent": UA,
  Accept: "*/*",
  "Accept-Language": "ru-RU,ru;q=0.9",
  // Accept-Encoding deliberately omitted — undici handles br/gzip itself.
};

/**
 * basket-NN host for a given nmId. Source: WB CDN sharding rules
 * (current as of 2025-2026). Update when new baskets ship.
 */
function basketHost(nmId) {
  const vol = Math.floor(nmId / 100000);
  let n;
  if (vol <= 143) n = 1;
  else if (vol <= 287) n = 2;
  else if (vol <= 431) n = 3;
  else if (vol <= 719) n = 4;
  else if (vol <= 1007) n = 5;
  else if (vol <= 1061) n = 6;
  else if (vol <= 1115) n = 7;
  else if (vol <= 1169) n = 8;
  else if (vol <= 1313) n = 9;
  else if (vol <= 1601) n = 10;
  else if (vol <= 1655) n = 11;
  else if (vol <= 1919) n = 12;
  else if (vol <= 2045) n = 13;
  else if (vol <= 2189) n = 14;
  else if (vol <= 2405) n = 15;
  else if (vol <= 2621) n = 16;
  else if (vol <= 2837) n = 17;
  else if (vol <= 3053) n = 18;
  else if (vol <= 3269) n = 19;
  else if (vol <= 3485) n = 20;
  else if (vol <= 3701) n = 21;
  else if (vol <= 3917) n = 22;
  else if (vol <= 4133) n = 23;
  else if (vol <= 4349) n = 24;
  else n = 25;
  return `basket-${String(n).padStart(2, "0")}.wbbasket.ru`;
}

async function getCard(nmId) {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const host = basketHost(nmId);
  const url = `https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`;
  const r = await fetch(url, { headers: COMMON_HEADERS });
  if (!r.ok) throw new Error(`card.json HTTP ${r.status} for nmId=${nmId} (${host})`);
  return r.json();
}

async function getFeedbacks(imtId) {
  for (const host of ["feedbacks2.wb.ru", "feedbacks1.wb.ru"]) {
    const url = `https://${host}/feedbacks/v2/${imtId}`;
    const r = await fetch(url, { headers: COMMON_HEADERS });
    if (!r.ok) continue;
    const j = await r.json();
    if ((j.feedbacks || []).length > 0 || j.feedbackCount > 0) {
      return { host, ...j };
    }
  }
  return { host: null, feedbacks: [], feedbackCount: 0 };
}

function fmtFeedback(f) {
  const date = (f.createdDate || "").slice(0, 10);
  const stars = "★".repeat(f.productValuation || 0).padEnd(5, "☆");
  const name = f.wbUserDetails?.name || "?";
  const region = f.wbUserDetails?.country
    ? ` (${f.wbUserDetails.country})`
    : "";
  const text = (f.text || "").trim().replace(/\s+/g, " ");
  const pros = f.pros ? ` +${f.pros}` : "";
  const cons = f.cons ? ` –${f.cons}` : "";
  const body = `${text}${pros}${cons}`.slice(0, 240) || "(без текста)";
  const reply = f.answer?.text
    ? `\n     ↳ ${f.answer.text.replace(/\s+/g, " ").slice(0, 160)}`
    : "";
  return `  ${stars} ${date} ${name}${region}: ${body}${reply}`;
}

async function processNmId(nmId) {
  const card = await getCard(nmId);
  const imt = card.imt_id;
  const fb = await getFeedbacks(imt);

  console.log(`\n━━━ nmId ${nmId} ━━━`);
  console.log(`  ${card.imt_name || "(no name)"}`);
  console.log(`  brand: ${card.selling?.brand_name || "?"}`);
  console.log(`  imt_id: ${imt}    shard: ${fb.host || "—"}`);
  console.log(
    `  rating: ${fb.valuation || "—"}   total: ${fb.feedbackCount || 0}` +
      `   distribution: ${JSON.stringify(fb.valuationDistribution || {})}`
  );

  const list = fb.feedbacks || [];
  if (!list.length) {
    console.log("  (нет отзывов)");
    return;
  }
  console.log("");
  list.slice(0, 10).forEach((f) => console.log(fmtFeedback(f)));
  if (list.length > 10) console.log(`  ... и ещё ${list.length - 10}`);
}

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
  if (!ids.length) {
    console.error("Usage: node fetch_wb_reviews.js [--json] <nmId> [<nmId>...]");
    process.exit(1);
  }
  if (wantJson) {
    const out = {};
    for (const nm of ids) {
      try {
        const card = await getCard(nm);
        const fb = await getFeedbacks(card.imt_id);
        out[nm] = { card_name: card.imt_name, brand: card.selling?.brand_name, ...fb };
      } catch (e) {
        out[nm] = { error: e.message };
      }
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  for (const nm of ids) {
    try {
      await processNmId(nm);
    } catch (e) {
      console.error(`nmId ${nm}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
