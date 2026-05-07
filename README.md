# Siberian Feedback

Агрегатор отзывов с маркетплейсов. Собирает отзывы с Wildberries (через публичный API), складывает в локальную БД и показывает в едином UI с фильтрами, рейтинговой статистикой и пометкой рекламаций.

## Возможности

- Парсер Wildberries: товары → `feedbacks2.wb.ru` без авторизации
- Дашборд: суммарный рейтинг, распределение оценок, последние отзывы, топ товаров
- Список отзывов с фильтрами: площадка, товар, рейтинг (мульти), рекламации, медиа (фото/видео), текстовый поиск (Cyrillic-aware)
- Сортировка: новые / старые / рейтинг ↑↓
- Карточка отзыва: галерея фото `feedback-NN.wbbasket.ru/{uuid}/fs.webp`, HLS-видео `videofeedbackNN.wbbasket.ru/{uuid}/index.m3u8`
- Метка «рекламация» → попадёт в счётчик в сайдбаре, отдельная выборка
- Журнал синхронизаций (`SyncLog`) с числом новых/обновлённых отзывов

## Стек

- **Next.js 16** (App Router, React 19) + TypeScript
- **Prisma 7** с `@prisma/adapter-better-sqlite3` (SQLite)
- **Tailwind 4** через `@tailwindcss/postcss`
- `tsx` для скриптов и cron-обёрток

## Установка

```bash
git clone https://github.com/SabirMamurov/Siberian-FeedBack.git
cd Siberian-FeedBack
npm install
npx prisma migrate deploy   # создаст prisma/dev.db
npx tsx prisma/seed.ts      # справочник площадок + 2 тестовых товара WB
```

## Запуск

```bash
npm run dev          # http://localhost:3000 (или 3001/3002 если порт занят)
npm run build        # production build
npm run start        # production server
npm run lint
npm run sync:wb      # CLI-синхронизация WB (для cron)
```

## Структура

```
src/
  app/
    layout.tsx              # сайдбар + main (счётчик рекламаций в badge)
    dashboard/page.tsx      # обзорные метрики
    reviews/page.tsx        # список с фильтрами
    reviews/[id]/page.tsx   # детальная — медиа, ответ продавца, prev/next
    products/page.tsx       # каталог на мониторинге
    api/
      sync/wb/route.ts      # POST — запустить синхронизацию
      products/route.ts     # GET список, POST добавить артикул
      reviews/route.ts      # GET с фильтрами + пагинацией
      reviews/[id]/complaint/route.ts   # PATCH — отметить рекламацию
  components/                # ReviewCard, RatingBar, Sidebar, фильтры …
  lib/
    prisma.ts                # singleton + better-sqlite3 адаптер
    marketplaces/wb.ts       # транспорт WB API + URL helper'ы
    sync/wb.ts               # поток: БД → API → upsert → SyncLog
    format.ts, sourceUrl.ts  # утилиты
prisma/
  schema.prisma              # Marketplace, Product, Review, SyncLog
  migrations/                # init
  seed.ts                    # тестовые WB-артикулы
scripts/
  sync-wb.ts                 # CLI cron-обёртка
  audit-media.ts             # аудит ключей фото/видео в БД
```

## Данные и приватность

- `prisma/dev.db` — SQLite-файл, **не** в репозитории (`.gitignore`)
- `.env` хранит `DATABASE_URL`, **не** в репозитории
- Парсер ходит на публичный CDN WB, авторизация не нужна

## Roadmap

- [ ] Cron автосинхронизации (`launchd` / `node-cron`)
- [ ] Ozon (Seller API или Playwright)
- [ ] AI-черновики ответов (поля `aiDraftReply` / `aiReplyStatus` в схеме уже есть)
- [ ] Bitrix24 — комментарий в общую задачу при появлении нового отзыва
- [ ] `hls.js` для надёжного воспроизведения видео в Chrome/Firefox
