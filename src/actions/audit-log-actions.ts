"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, safeError } from "@/lib/auth-helpers";

export type AuditLogRow = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
};

export type AuditLogFilters = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
};

export type AuditLogResult = {
  data: AuditLogRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogResult | { error: string }> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 15));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filters.action && filters.action !== "all") {
    where.action = filters.action;
  }

  if (filters.search) {
    where.user = {
      name: { contains: filters.search, mode: "insensitive" },
    };
  }

  if (filters.startDate) {
    where.createdAt = {
      ...((where.createdAt as Record<string, unknown>) || {}),
      gte: new Date(filters.startDate),
    };
  }
  if (filters.endDate) {
    where.createdAt = {
      ...((where.createdAt as Record<string, unknown>) || {}),
      lte: new Date(filters.endDate + "T23:59:59.999Z"),
    };
  }

  try {
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: AuditLogRow[] = logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      userRole: log.user.role,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes: log.changes as Record<string, unknown> | null,
      createdAt: log.createdAt,
    }));

    return {
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } catch (err) {
    return { error: safeError(err) };
  }
}
