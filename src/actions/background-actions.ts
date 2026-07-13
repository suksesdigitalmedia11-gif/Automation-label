"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireAuth, safeError } from "@/lib/auth-helpers";
import { createActivityLog } from "./log-actions";

const createBackgroundSchema = z.object({
  name: z.string().min(1, "Nama background wajib diisi"),
  fontColor: z.string().min(1, "Warna font wajib dipilih"),
});

const updateBackgroundSchema = z.object({
  name: z.string().min(1, "Nama background wajib diisi").optional(),
  fontColor: z.string().min(1, "Warna font wajib dipilih").optional(),
});

export type CreateBackgroundInput = z.infer<typeof createBackgroundSchema>;
export type UpdateBackgroundInput = z.infer<typeof updateBackgroundSchema>;

export async function createBackground(data: CreateBackgroundInput) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createBackgroundSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const bg = await prisma.materialBackground.create({
      data: {
        name: parsed.data.name,
        fontColor: parsed.data.fontColor,
      },
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "TAMBAH_BACKGROUND",
      entity: "Background",
      entityId: bg.id,
      entityLabel: parsed.data.name,
      detail: {
        keterangan: `Menambahkan background baru "${parsed.data.name}"`,
        sesudah: {
          namaBackground: parsed.data.name,
          warnaFont: parsed.data.fontColor,
        },
      },
    });

    revalidatePath("/materials/background");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal membuat background" };
  }
}

export async function updateBackground(id: string, data: UpdateBackgroundInput) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.materialBackground.findUnique({ where: { id } });

  const parsed = updateBackgroundSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.fontColor !== undefined) updateData.fontColor = parsed.data.fontColor;

    await prisma.materialBackground.update({
      where: { id },
      data: updateData,
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UBAH_BACKGROUND",
      entity: "Background",
      entityId: id,
      entityLabel: parsed.data.name ?? existing?.name ?? "-",
      detail: {
        keterangan: `Mengubah background "${existing?.name ?? "-"}"`,
        sebelum: {
          namaBackground: existing?.name,
          warnaFont: existing?.fontColor,
        },
        sesudah: {
          namaBackground: parsed.data.name,
          warnaFont: parsed.data.fontColor,
        },
      },
    });

    revalidatePath("/materials/background");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal mengupdate background" };
  }
}

export async function deleteBackground(id: string) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.materialBackground.findUnique({ where: { id } });

  try {
    await prisma.materialBackground.delete({ where: { id } });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "HAPUS_BACKGROUND",
      entity: "Background",
      entityId: id,
      entityLabel: existing?.name ?? "-",
      detail: {
        keterangan: `Menghapus background "${existing?.name ?? "-"}"`,
        sebelum: {
          namaBackground: existing?.name,
          warnaFont: existing?.fontColor,
        },
      },
    });

    revalidatePath("/materials/background");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus background" };
  }
}
