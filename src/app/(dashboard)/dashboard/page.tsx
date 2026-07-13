import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === "admin";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalRolls,
    totalTransactions,
    totalFonts,
    totalBackgrounds,
    completedTransactions,
    recentRolls,
    recentTransactions,
    // Admin-only extras
    transaksiHariIni,
    transaksiPending,
    recentLogs,
  ] = await Promise.all([
    prisma.roll.count(),
    prisma.transaction.count(),
    prisma.materialFont.count(),
    prisma.materialBackground.count(),
    prisma.transaction.count({ where: { status: "Completed" } }),
    prisma.roll.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        roll: { select: { rollName: true } },
        user: { select: { name: true } },
      },
    }),
    // Transaksi dibuat hari ini
    isAdmin ? prisma.transaction.count({
      where: { createdAt: { gte: today, lte: todayEnd } }
    }) : Promise.resolve(0),
    // Transaksi pending (belum Completed)
    isAdmin ? prisma.transaction.count({ where: { status: "Processed" } }) : Promise.resolve(0),
    // Log aktivitas terbaru (hanya untuk admin)
    isAdmin ? prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }) : Promise.resolve([]),
  ]);

  // Hitung user aktif hari ini (dari log)
  const userAktifHariIni = isAdmin ? await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: today, lte: todayEnd } },
  }).then(r => r.length) : 0;

  // Total nama dicetak hari ini (sum qty dari detail transaksi completed hari ini)
  const totalNamaCetakHariIni = isAdmin ? await prisma.transactionDetail.aggregate({
    _sum: { quantity: true },
    where: {
      transaction: {
        status: "Completed",
        createdAt: { gte: today, lte: todayEnd },
      },
    },
  }).then(r => r._sum.quantity ?? 0) : 0;

  return (
    <DashboardClient
      userName={user?.name || "User"}
      userRole={user?.role || "operator"}
      totalRolls={totalRolls}
      totalTransactions={totalTransactions}
      totalFonts={totalFonts}
      totalBackgrounds={totalBackgrounds}
      completedTransactions={completedTransactions}
      transaksiHariIni={transaksiHariIni}
      transaksiPending={transaksiPending}
      userAktifHariIni={userAktifHariIni}
      totalNamaCetakHariIni={totalNamaCetakHariIni}
      recentRolls={recentRolls.map(r => ({
        ...r,
        heightCm: r.heightCm.toString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
      recentLogs={JSON.parse(JSON.stringify(recentLogs))}
    />
  );
}
