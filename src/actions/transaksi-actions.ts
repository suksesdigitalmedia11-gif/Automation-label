"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import fs from "fs/promises";
import path from "path";

import { requireAuth, requireAdmin, safeError } from "@/lib/auth-helpers";
import { OUTPUT_DIR } from "@/lib/print-spec";
import { createActivityLog } from "./log-actions";

// ─── Audit helper ──────────────────────────────────────────────────────────

async function writeAuditLog(params: {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityId: string;
  changes?: Record<string, unknown>;
  userName?: string;
}) {
  const { userId, action, entityId, changes, userName } = params;

  // Real-time monitoring log untuk admin
  console.log(
    `[AUDIT] ${action} | Transaksi: ${entityId} | User: ${userName || userId} | ` +
    `Role: ${action === "DELETE" ? "admin" : "operator/admin"} | ` +
    `Timestamp: ${new Date().toISOString()}` +
    (changes ? ` | Changes: ${JSON.stringify(changes)}` : "")
  );

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "Transaction",
        entityId,
        changes: changes ?? undefined,
      },
    });
  } catch (err) {
    // Non-fatal: audit logging shouldn't block the main operation
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}

const createTransactionSchema = z.object({
  rollId: z.string().min(1, "Roll wajib dipilih"),
  transactionDate: z.string().min(1, "Tanggal wajib diisi"),
  quantity: z.coerce.number().int().positive("Quantity harus lebih dari 0").optional(),
  numberOfDetails: z.coerce.number().int().min(0).optional(),
  printWidth: z.coerce.number().positive().optional().nullable(),
  printHeight: z.coerce.number().positive().optional().nullable(),
  labelHeight: z.coerce.number().positive().optional().nullable(),
  labelSizePresetId: z.string().optional().nullable(),
  resiNumber: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
  status: z.enum(["Processed", "Failed", "Completed"]).optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export async function createTransaction(data: CreateTransactionInput) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createTransactionSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const tx = await prisma.transaction.create({
      data: {
        rollId: parsed.data.rollId,
        transactionDate: new Date(parsed.data.transactionDate),
        quantity: parsed.data.quantity ?? 1,
        numberOfDetails: parsed.data.numberOfDetails ?? 0,
        printWidth: parsed.data.printWidth ?? null,
        printHeight: parsed.data.printHeight ?? null,
        labelHeight: parsed.data.labelHeight ?? null,
        labelSizePresetId: parsed.data.labelSizePresetId || null,
        resiNumber: parsed.data.resiNumber ?? null,
        path: parsed.data.path || null,
        status: parsed.data.status || "Processed",
        createdBy: user.id ?? null,
      },
      include: { roll: { select: { rollName: true } } },
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "BUAT_TRANSAKSI",
      entity: "Transaksi",
      entityId: tx.id,
      entityLabel: `Transaksi di Roll "${tx.roll.rollName}"`,
      detail: {
        keterangan: `Membuat transaksi baru di roll "${tx.roll.rollName}"`,
        sesudah: {
          rollId: parsed.data.rollId,
          rollNama: tx.roll.rollName,
          tanggal: parsed.data.transactionDate,
          nomorResi: parsed.data.resiNumber ?? "-",
        },
      },
    });

    // Audit: CREATE
    await writeAuditLog({
      userId: user.id,
      action: "CREATE",
      entityId: tx.id,
      changes: { rollId: parsed.data.rollId, status: parsed.data.status || "Processed" },
      userName: user.name,
    });

    revalidatePath("/transaksi");
    return { success: true, id: tx.id };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal membuat transaksi" };
  }
}

export async function updateTransaction(id: string, data: UpdateTransactionInput) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  // Ambil data lama
  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { roll: { select: { rollName: true } } },
  });

  if (!existing) return { error: "Transaksi tidak ditemukan." };

  const parsed = updateTransactionSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  // ─── Change Detection ─────────────────────────────────────────────────────
  const existingDateStr = existing.transactionDate.toISOString().split("T")[0];
  const newDateStr = parsed.data.transactionDate
    ? new Date(parsed.data.transactionDate).toISOString().split("T")[0]
    : existingDateStr;

  const hasChange =
    (parsed.data.rollId !== undefined && parsed.data.rollId !== existing.rollId) ||
    (parsed.data.transactionDate !== undefined && newDateStr !== existingDateStr) ||
    (parsed.data.status !== undefined && parsed.data.status !== existing.status) ||
    (parsed.data.resiNumber !== undefined && (parsed.data.resiNumber ?? null) !== existing.resiNumber);

  if (!hasChange) {
    return { success: true, noChange: true };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.rollId !== undefined) updateData.rollId = parsed.data.rollId;
  if (parsed.data.transactionDate !== undefined)
    updateData.transactionDate = new Date(parsed.data.transactionDate);
  if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity;
  if (parsed.data.numberOfDetails !== undefined)
    updateData.numberOfDetails = parsed.data.numberOfDetails;
  if (parsed.data.printWidth !== undefined) updateData.printWidth = parsed.data.printWidth;
  if (parsed.data.printHeight !== undefined) updateData.printHeight = parsed.data.printHeight;
  if (parsed.data.labelHeight !== undefined) updateData.labelHeight = parsed.data.labelHeight;
  if (parsed.data.labelSizePresetId !== undefined)
    updateData.labelSizePresetId = parsed.data.labelSizePresetId || null;
  if (parsed.data.resiNumber !== undefined) updateData.resiNumber = parsed.data.resiNumber;
  if (parsed.data.path !== undefined) updateData.path = parsed.data.path;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  // Always record who edited
  updateData.updatedBy = user.id;

  // Buat deskripsi perubahan yang mudah dibaca
  const perubahanList: string[] = [];
  if (parsed.data.rollId !== undefined && parsed.data.rollId !== existing.rollId)
    perubahanList.push(`Roll diubah`);
  if (newDateStr !== existingDateStr)
    perubahanList.push(`Tanggal: ${existingDateStr} → ${newDateStr}`);
  if (parsed.data.status !== undefined && parsed.data.status !== existing.status)
    perubahanList.push(`Status: ${existing.status} → ${parsed.data.status}`);
  if (parsed.data.resiNumber !== undefined && (parsed.data.resiNumber ?? null) !== existing.resiNumber)
    perubahanList.push(`Resi: ${existing.resiNumber ?? "-"} → ${parsed.data.resiNumber ?? "-"}`);

  try {
    await prisma.transaction.update({ where: { id }, data: updateData });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UBAH_TRANSAKSI",
      entity: "Transaksi",
      entityId: id,
      entityLabel: `Transaksi di Roll "${existing.roll.rollName}"`,
      detail: {
        keterangan: `Mengubah transaksi di roll "${existing.roll.rollName}": ${perubahanList.join(", ")}`,
        sebelum: {
          rollNama: existing.roll.rollName,
          nomorResi: existing.resiNumber ?? "-",
          status: existing.status,
          tanggal: existingDateStr,
        },
        sesudah: {
          nomorResi: parsed.data.resiNumber ?? existing.resiNumber ?? "-",
          status: parsed.data.status ?? existing.status,
          tanggal: newDateStr,
        },
      },
    });

    // Audit: UPDATE — log hanya field yang berubah
    const changedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== "updatedBy") {
        changedFields[key] = value;
      }
    }
    await writeAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityId: id,
      changes: changedFields,
      userName: user.name,
    });

    revalidatePath("/transaksi");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { error: safeError(err) };
    return { error: "Gagal mengupdate transaksi" };
  }
}


/**
 * Deletes a transaction and cleans up its associated output directory.
 *
 * Path safety:
 * - Target directory is built from OUTPUT_DIR (centralized constant) + transaction ID.
 * - Resolved target must be strictly inside resolved OUTPUT_DIR (base dir itself is rejected).
 * - No raw user-provided path is ever used for filesystem deletion.
 * - fs.rm with force: true silently skips non-existent directories.
 *
 * Authorization:
 * - Only users with role "admin" may delete transactions.
 * - Unauthenticated and non-admin requests are rejected with safe error messages.
 */
export async function deleteTransaction(id: string) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return { error: "Hanya admin yang dapat menghapus transaksi." };
    }
    return { error: safeError(err) };
  }

  // Ambil info transaksi sebelum dihapus (untuk log)
  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: {
      roll: { select: { rollName: true } },
      details: { select: { name: true, quantity: true } },
    },
  });

  try {
    await prisma.transaction.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus transaksi" };
  }

  await createActivityLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "HAPUS_TRANSAKSI",
    entity: "Transaksi",
    entityId: id,
    entityLabel: `Transaksi di Roll "${existing?.roll.rollName ?? "-"}"`,
    detail: {
      keterangan: `Menghapus transaksi beserta ${existing?.details.length ?? 0} nama di roll "${existing?.roll.rollName ?? "-"}"`,
      sebelum: {
        rollNama: existing?.roll.rollName,
        nomorResi: existing?.resiNumber ?? "-",
        jumlahNama: existing?.details.length ?? 0,
        daftarNama: existing?.details.map((d) => `${d.name} (qty: ${d.quantity})`).join(", "),
      },
    },
  });

  // Audit: DELETE
  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entityId: id,
    userName: user.name,
  });

  // CRE-6: Cleanup orphan output directory for this transaction.
  try {
    const outputBase = path.resolve(OUTPUT_DIR);
    const targetDir = path.resolve(outputBase, id);

    // Path traversal guard: ensure target is strictly inside the base output directory.
    if (!targetDir.startsWith(outputBase + path.sep)) {
      console.error(
        `[CRE-6] Path safety violation — target "${targetDir}" is outside base "${outputBase}". Skipping cleanup.`
      );
    } else {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
  } catch (err) {
    // Non-fatal: database delete already succeeded.
    console.error(`[CRE-6] Gagal membersihkan folder output transaksi ${id}:`, err);
  }

  revalidatePath("/transaksi");
  return { success: true };
}
