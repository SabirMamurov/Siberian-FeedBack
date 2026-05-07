import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siberian Feedback",
  description: "Маркетплейс-отзывы и рекламации",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Считаем счётчик незакрытых рекламаций — попадает в сайдбар как badge.
  const pendingComplaints = await prisma.review.count({
    where: { isComplaint: true },
  });

  return (
    <html lang="ru">
      {/* suppressHydrationWarning — против атрибутов, которые Bitdefender и подобные
          расширения дописывают в body до гидратации React. */}
      <body className="min-h-screen" suppressHydrationWarning>
        <div className="flex">
          <Sidebar pendingComplaints={pendingComplaints} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1200px] px-8 py-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
