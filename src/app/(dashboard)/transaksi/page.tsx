import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransaksiClient } from "./transaksi-client";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    rollId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function TransaksiPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 10;
  const skip = (page - 1) * limit;

  const rollId = params.rollId || "";
  const statusFilter = params.status || "";
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";

  const where: Record<string, unknown> = {};
  if (rollId) where.rollId = rollId;
  if (statusFilter) where.status = statusFilter;
  if (startDate) {
    where.transactionDate = {
      ...((where.transactionDate as Record<string, unknown>) || {}),
      gte: new Date(startDate),
    };
  }
  if (endDate) {
    where.transactionDate = {
      ...((where.transactionDate as Record<string, unknown>) || {}),
      lte: new Date(endDate),
    };
  }

  const [transactions, totalCount, rolls, fonts, backgrounds] =
    await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          roll: true,
          updatedByUser: { select: { name: true } },
          details: {
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              fontId: true,
              backgroundId: true,
              resiNumber: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
      prisma.roll.findMany({
        orderBy: { rollName: "asc" },
        select: { id: true, rollName: true },
      }),
      prisma.materialFont.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, fontFamily: true, filePath: true },
      }),
      prisma.materialBackground.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, fontColor: true, imagePath: true },
      }),
    ]);

  // Fetch edit history (audit logs) for all displayed transactions
  const txIds = transactions.map((tx: { id: string }) => tx.id);
  const editLogs =
    txIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            entityId: { in: txIds },
            action: "UPDATE",
          },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, role: true } },
          },
        })
      : [];

  // Group logs by transaction ID
  const editLogsByTx: Record<string, typeof editLogs> = {};
  for (const log of editLogs) {
    if (!editLogsByTx[log.entityId]) editLogsByTx[log.entityId] = [];
    editLogsByTx[log.entityId].push(log);
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <TransaksiClient
      transactions={JSON.parse(JSON.stringify(transactions))}
      rolls={JSON.parse(JSON.stringify(rolls))}
      fonts={JSON.parse(JSON.stringify(fonts))}
      backgrounds={JSON.parse(JSON.stringify(backgrounds))}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      selectedRollId={rollId}
      statusFilter={statusFilter}
      startDate={startDate}
      endDate={endDate}
      userRole={session?.user?.role || "operator"}
      editLogsByTx={JSON.parse(JSON.stringify(editLogsByTx))}
    />
  );
}
