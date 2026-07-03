import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcOutputHeightFromGroups } from "@/lib/output-calc";
import { RollClient } from "./roll-client";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function RollPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 10;
  const skip = (page - 1) * limit;

  const search = params.search || "";
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.rollName = { contains: search, mode: "insensitive" };
  }
  if (statusFilter) {
    where.status = statusFilter;
  }

  const [rolls, totalCount] = await Promise.all([
    prisma.roll.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        transactions: {
          select: {
            details: { select: { quantity: true } },
          },
        },
      },
    }),
    prisma.roll.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Calculate output height per roll from actual content
  const rollsWithTotal = rolls.map((r) => ({
    ...r,
    outputCm: calcOutputHeightFromGroups(
      r.transactions.map((tx) => ({
        details: tx.details.map((d) => ({ quantity: d.quantity })),
      })),
    ),
  }));

  return (
    <RollClient
      rolls={JSON.parse(JSON.stringify(rolls))}
      rollsWithTotal={JSON.parse(JSON.stringify(rollsWithTotal))}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      search={search}
      statusFilter={statusFilter}
      userRole={session?.user?.role || "operator"}
    />
  );
}
