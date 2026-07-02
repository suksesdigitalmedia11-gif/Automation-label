"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireAuth, safeError } from "@/lib/auth-helpers";

const createRollSchema = z.object({
  rollName: z.string().min(1, "Nama roll wajib diisi"),
  heightCm: z.coerce.number().min(0, "Tinggi tidak boleh negatif"),
  quantity: z.coerce.number().int().positive("Quantity harus lebih dari 0"),
  path: z.string().optional().nullable(),
  status: z.enum(["Processed", "Failed", "Completed"]).optional(),
});

const updateRollSchema = z.object({
  rollName: z.string().min(1, "Nama roll wajib diisi").optional(),
  path: z.string().optional().nullable(),
  status: z.enum(["Processed", "Failed", "Completed"]).optional(),
});

export type CreateRollInput = z.infer<typeof createRollSchema>;
export type UpdateRollInput = z.infer<typeof updateRollSchema>;

export async function createRoll(data: CreateRollInput) {
  try {
    await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createRollSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    await prisma.roll.create({
      data: {
        rollName: parsed.data.rollName,
        heightCm: parsed.data.heightCm,
        quantity: parsed.data.quantity,
        path: parsed.data.path || null,
        status: parsed.data.status || "Processed",
      },
    });

    revalidatePath("/roll");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal membuat roll" };
  }
}

export async function updateRoll(id: string, data: UpdateRollInput) {
  try {
    await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = updateRollSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    await prisma.roll.update({
      where: { id },
      data: {
        ...(parsed.data.rollName !== undefined && { rollName: parsed.data.rollName }),
        ...(parsed.data.path !== undefined && { path: parsed.data.path }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      },
    });

    revalidatePath("/roll");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal mengupdate roll" };
  }
}

export async function deleteRoll(id: string) {
  try {
    await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  try {
    await prisma.roll.delete({ where: { id } });
    revalidatePath("/roll");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus roll" };
  }
}
