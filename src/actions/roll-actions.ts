"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireAuth, requireAdmin, safeError } from "@/lib/auth-helpers";
import { createActivityLog } from "./log-actions";

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
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createRollSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const roll = await prisma.roll.create({
      data: {
        rollName: parsed.data.rollName,
        heightCm: parsed.data.heightCm,
        quantity: parsed.data.quantity,
        path: parsed.data.path || null,
        status: parsed.data.status || "Processed",
      },
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "BUAT_ROLL",
      entity: "Roll",
      entityId: roll.id,
      entityLabel: parsed.data.rollName,
      detail: {
        keterangan: `Membuat roll baru "${parsed.data.rollName}"`,
        sesudah: {
          namaRoll: parsed.data.rollName,
          tinggiCm: parsed.data.heightCm,
          jumlah: parsed.data.quantity,
        },
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
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.roll.findUnique({ where: { id } });

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

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UBAH_ROLL",
      entity: "Roll",
      entityId: id,
      entityLabel: parsed.data.rollName ?? existing?.rollName ?? "-",
      detail: {
        keterangan: `Mengubah roll "${existing?.rollName ?? "-"}"`,
        sebelum: {
          namaRoll: existing?.rollName,
          status: existing?.status,
        },
        sesudah: {
          namaRoll: parsed.data.rollName,
          status: parsed.data.status,
        },
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
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return { error: "Hanya admin yang dapat menghapus roll." };
    }
    return { error: safeError(err) };
  }

  const existing = await prisma.roll.findUnique({ where: { id } });

  try {
    await prisma.roll.delete({ where: { id } });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "HAPUS_ROLL",
      entity: "Roll",
      entityId: id,
      entityLabel: existing?.rollName ?? "-",
      detail: {
        keterangan: `Menghapus roll "${existing?.rollName ?? "-"}"`,
        sebelum: {
          namaRoll: existing?.rollName,
          status: existing?.status,
        },
      },
    });

    revalidatePath("/roll");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus roll" };
  }
}
