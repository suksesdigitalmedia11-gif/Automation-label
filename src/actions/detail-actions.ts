"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, safeError } from "@/lib/auth-helpers";

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
  try {
    await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = bulkDetailsSchema.safeParse({ transactionId, details });
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

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
  try {
    await requireAuth();
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
