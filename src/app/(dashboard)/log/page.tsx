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
  }>;
}

export default async function LogPage({ searchParams }: PageProps) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

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
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <LogClient
      logs={JSON.parse(JSON.stringify(logs))}
      users={users}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      initialFilters={{
        userId: params.userId || "",
        action: params.action || "",
        startDate: params.startDate || "",
        endDate: params.endDate || "",
      }}
    />
  );
}
