"use server";

import "server-only";
import { prisma } from "@/lib/prisma";

export type LogAction =
  // Transaksi
  | "BUAT_TRANSAKSI"
  | "UBAH_TRANSAKSI"
  | "HAPUS_TRANSAKSI"
  | "SIMPAN_DETAIL_NAMA"
  | "GENERATE_LABEL"
  // Roll
  | "BUAT_ROLL"
  | "UBAH_ROLL"
  | "HAPUS_ROLL"
  // Font
  | "TAMBAH_FONT"
  | "HAPUS_FONT"
  // Background
  | "TAMBAH_BACKGROUND"
  | "UBAH_BACKGROUND"
  | "HAPUS_BACKGROUND"
  // User
  | "TAMBAH_USER"
  | "UBAH_USER"
  | "AKTIFKAN_USER"
  | "NONAKTIFKAN_USER"
  | "RESET_PASSWORD_USER"
  | "HAPUS_USER";

export type LogEntity =
  | "Transaksi"
  | "DetailNama"
  | "Roll"
  | "Font"
  | "Background"
  | "User"
  | "Sistem";

export interface LogDetailPayload {
  keterangan?: string;
  sebelum?: Record<string, unknown>;
  sesudah?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Mencatat aktivitas user ke dalam tabel activity_logs.
 * Fungsi ini HANYA APPEND — tidak ada update/delete endpoint untuk tabel ini.
 * Bahkan admin tidak bisa menghapus log melalui UI.
 */
export async function createActivityLog(params: {
  userId: string;
  userName: string;
  userRole: string;
  action: LogAction;
  entity: LogEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  detail?: LogDetailPayload | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        entityLabel: params.entityLabel ?? null,
        detail: params.detail ? (params.detail as any) : undefined,
      },
    });
  } catch (err) {
    // Log gagal tidak boleh hentikan alur utama — hanya catat di console
    console.error("[ACTIVITY_LOG] Gagal mencatat log:", err);
  }
}

/**
 * Mengambil semua log untuk halaman admin.
 * Hanya dipanggil dari Server Component dengan verifikasi role admin.
 */
export async function getActivityLogs(params: {
  userId?: string;
  entity?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, entity, action, startDate, endDate, page = 1, limit = 50 } = params;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate + "T00:00:00.000Z") } : {}),
      ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, total, totalPages: Math.ceil(total / limit) };
}
