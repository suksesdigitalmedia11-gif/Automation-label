import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const [rolls, totalCount, allRolls] = await Promise.all([
    prisma.roll.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.roll.count({ where }),
    prisma.roll.findMany({ select: { heightCm: true, quantity: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const totalRollLength = allRolls.reduce(
    (acc, r) => acc + Number(r.heightCm) * r.quantity,
    0,
  );

  return (
    <RollClient
      rolls={JSON.parse(JSON.stringify(rolls))}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      search={search}
      statusFilter={statusFilter}
      userRole={session?.user?.role || "operator"}
    />
  );
}
