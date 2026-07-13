"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, safeError } from "@/lib/auth-helpers";
import { createActivityLog } from "./log-actions";

const detailSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  fontId: z.string().optional().nullable(),
  backgroundId: z.string().optional().nullable(),
  resiNumber: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive().default(1),
  sortOrder: z.coerce.number().int().default(0),
});

const bulkDetailsSchema = z.object({
  transactionId: z.string().min(1),
  details: z.array(detailSchema).min(1, "Minimal 1 detail diperlukan"),
});

export type DetailInput = z.infer<typeof detailSchema>;

/** Replace all details for a transaction (used after form submit) */
export async function saveTransactionDetails(
  transactionId: string,
  details: DetailInput[],
) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = bulkDetailsSchema.safeParse({ transactionId, details });
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  // Ambil data detail LAMA sebelum diganti (untuk log before/after)
  const existingDetails = await prisma.transactionDetail.findMany({
    where: { transactionId },
    include: {
      font: { select: { name: true } },
      background: { select: { name: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Ambil info transaksi & roll untuk label log
  const txInfo = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { roll: { select: { rollName: true } } },
  });

  try {
    // Replace all existing details atomically
    await prisma.$transaction([
      prisma.transactionDetail.deleteMany({
        where: { transactionId },
      }),
      prisma.transactionDetail.createMany({
        data: parsed.data.details.map((d, idx) => ({
          transactionId,
          name: d.name,
          resiNumber: d.resiNumber || null,
          fontId: d.fontId || null,
          backgroundId: d.backgroundId || null,
          quantity: d.quantity,
          sortOrder: idx,
        })),
      }),
    ]);

    // Update numberOfDetails on transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { numberOfDetails: parsed.data.details.length },
    });

    // Hitung total qty sesudah
    const totalQtySesudah = parsed.data.details.reduce((sum, d) => sum + d.quantity, 0);
    const totalQtySebelum = existingDetails.reduce((sum, d) => sum + d.quantity, 0);

    // Buat detail log per nama untuk transparansi penuh
    const daftarNamaSesudah = parsed.data.details.map((d) => ({
      nama: d.name,
      jumlah: d.quantity,
      resi: d.resiNumber || "-",
    }));

    const daftarNamaSebelum = existingDetails.map((d) => ({
      nama: d.name,
      jumlah: d.quantity,
      font: d.font?.name ?? "-",
      background: d.background?.name ?? "-",
      resi: d.resiNumber || "-",
    }));

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "SIMPAN_DETAIL_NAMA",
      entity: "DetailNama",
      entityId: transactionId,
      entityLabel: `Detail nama di Roll "${txInfo?.roll.rollName ?? "-"}"`,
      detail: {
        keterangan: `Menyimpan ${parsed.data.details.length} nama (total qty: ${totalQtySesudah}) di roll "${txInfo?.roll.rollName ?? "-"}"`,
        sebelum: {
          jumlahNama: existingDetails.length,
          totalQty: totalQtySebelum,
          daftarNama: daftarNamaSebelum,
        },
        sesudah: {
          jumlahNama: parsed.data.details.length,
          totalQty: totalQtySesudah,
          daftarNama: daftarNamaSesudah,
        },
      },
    });

    revalidatePath("/transaksi");
    return { success: true };
  } catch (err) {
    return { error: safeError(err) };
  }
}

/** Import names from Excel/CSV text (one name per line) and save as details */
export async function importDetailsFromText(
  transactionId: string,
  namesText: string,
  defaultFontId: string | null,
  defaultBackgroundId: string | null,
  defaultQuantity: number,
) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  if (!transactionId || !namesText.trim()) {
    return { error: "transactionId dan daftar nama wajib diisi" };
  }

  const names = namesText
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (names.length === 0) {
    return { error: "Tidak ada nama yang valid ditemukan" };
  }

  const txInfo = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { roll: { select: { rollName: true } } },
  });

  try {
    await prisma.$transaction([
      prisma.transactionDetail.deleteMany({ where: { transactionId } }),
      prisma.transactionDetail.createMany({
        data: names.map((name, idx) => ({
          transactionId,
          name,
          fontId: defaultFontId,
          backgroundId: defaultBackgroundId,
          quantity: defaultQuantity,
          sortOrder: idx,
        })),
      }),
    ]);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { numberOfDetails: names.length },
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "SIMPAN_DETAIL_NAMA",
      entity: "DetailNama",
      entityId: transactionId,
      entityLabel: `Import nama di Roll "${txInfo?.roll.rollName ?? "-"}"`,
      detail: {
        keterangan: `Import ${names.length} nama (qty masing-masing: ${defaultQuantity}) ke roll "${txInfo?.roll.rollName ?? "-"}"`,
        sesudah: {
          jumlahNama: names.length,
          qtyPerNama: defaultQuantity,
          totalQty: names.length * defaultQuantity,
          daftarNama: names.map((n) => ({ nama: n, jumlah: defaultQuantity })),
        },
      },
    });

    revalidatePath("/transaksi");
    return { success: true, count: names.length };
  } catch (err) {
    return { error: safeError(err) };
  }
}

/** Get all details for a transaction */
export async function getTransactionDetails(transactionId: string) {
  try {
    await requireAuth();
  } catch {
    return { error: "Unauthorized" };
  }

  const details = await prisma.transactionDetail.findMany({
    where: { transactionId },
    orderBy: { sortOrder: "asc" },
    include: {
      font: { select: { id: true, name: true, fontFamily: true } },
      background: {
        select: { id: true, name: true, fontColor: true, imagePath: true },
      },
    },
  });

  return { data: details };
}
