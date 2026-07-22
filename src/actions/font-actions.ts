"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { requireAuth, requireAdmin, safeError } from "@/lib/auth-helpers";
import { createActivityLog } from "./log-actions";

const createFontSchema = z.object({
  name: z.string().min(1, "Nama font wajib diisi"),
  fontFamily: z.string().optional().nullable(),
});

export type CreateFontInput = z.infer<typeof createFontSchema>;

export async function createFont(data: CreateFontInput) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createFontSchema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const font = await prisma.materialFont.create({
      data: {
        name: parsed.data.name,
        fontFamily: parsed.data.fontFamily || null,
      },
    });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "TAMBAH_FONT",
      entity: "Font",
      entityId: font.id,
      entityLabel: parsed.data.name,
      detail: {
        keterangan: `Menambahkan font baru "${parsed.data.name}"`,
        sesudah: {
          namaFont: parsed.data.name,
          fontFamily: parsed.data.fontFamily ?? "-",
        },
      },
    });

    revalidatePath("/materials/font");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal membuat font" };
  }
}

export async function deleteFont(id: string) {
  let user;
  try {
    user = await requireAdmin();
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return { error: "Hanya admin yang dapat menghapus font." };
    }
    return { error: safeError(err) };
  }

  const existing = await prisma.materialFont.findUnique({ where: { id } });

  try {
    await prisma.materialFont.delete({ where: { id } });

    await createActivityLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "HAPUS_FONT",
      entity: "Font",
      entityId: id,
      entityLabel: existing?.name ?? "-",
      detail: {
        keterangan: `Menghapus font "${existing?.name ?? "-"}"`,
        sebelum: {
          namaFont: existing?.name,
          fontFamily: existing?.fontFamily ?? "-",
        },
      },
    });

    revalidatePath("/materials/font");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus font" };
  }
}
