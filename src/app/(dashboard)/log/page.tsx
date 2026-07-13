import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LogClient } from "./log-client";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    tab?: string;
    txId?: string;
  }>;
}

export default async function LogPage({ searchParams }: PageProps) {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 50;
  const skip = (page - 1) * limit;
  const activeTab = params.tab || "semua";

  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.startDate || params.endDate) {
    where.createdAt = {
      ...(params.startDate ? { gte: new Date(params.startDate + "T00:00:00.000Z") } : {}),
      ...(params.endDate ? { lte: new Date(params.endDate + "T23:59:59.999Z") } : {}),
    };
  }

  const [logs, totalCount, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Untuk tab "Per Transaksi": ambil semua log yang terkait entitas transaksi / detail nama
  // Grouped by entityId (transaksi ID), hitung durasi
  const transaksiGroups = await prisma.activityLog.groupBy({
    by: ["entityId", "entityLabel"],
    where: {
      entity: { in: ["Transaksi", "DetailNama"] },
      entityId: { not: null },
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.startDate || params.endDate ? {
        createdAt: {
          ...(params.startDate ? { gte: new Date(params.startDate + "T00:00:00.000Z") } : {}),
          ...(params.endDate ? { lte: new Date(params.endDate + "T23:59:59.999Z") } : {}),
        }
      } : {}),
    },
    _min: { createdAt: true },
    _max: { createdAt: true },
    _count: { id: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 30,
  });

  // Untuk setiap group transaksi, ambil userName (ambil dari log pertama)
  const txGroupDetails = await Promise.all(
    transaksiGroups.map(async (g) => {
      const firstLog = await prisma.activityLog.findFirst({
        where: { entityId: g.entityId ?? undefined },
        orderBy: { createdAt: "asc" },
        select: { userName: true, userId: true, userRole: true },
      });
      return {
        entityId: g.entityId,
        entityLabel: g.entityLabel,
        mulai: g._min.createdAt,
        selesai: g._max.createdAt,
        jumlahAksi: g._count.id,
        userName: firstLog?.userName ?? "-",
        userId: firstLog?.userId ?? "-",
      };
    })
  );

  // Detail timeline untuk satu transaksi yang dipilih
  let txTimeline = null;
  if (params.txId) {
    txTimeline = await prisma.activityLog.findMany({
      where: {
        entityId: params.txId,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <LogClient
      logs={JSON.parse(JSON.stringify(logs))}
      users={users}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      activeTab={activeTab}
      initialFilters={{
        userId: params.userId || "",
        action: params.action || "",
        startDate: params.startDate || "",
        endDate: params.endDate || "",
      }}
      transaksiGroups={JSON.parse(JSON.stringify(txGroupDetails))}
      txTimeline={txTimeline ? JSON.parse(JSON.stringify(txTimeline)) : null}
      selectedTxId={params.txId || null}
    />
  );
}
