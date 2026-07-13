"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin, safeError } from "@/lib/auth-helpers";
import { createActivityLog } from "./log-actions";

const createUserSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "operator"]),
});

const updateUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  role: z.enum(["admin", "operator"]).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export async function getUsers() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }
  void admin;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { transactions: true } },
    },
  });

  return { data: users };
}

export async function createUser(data: CreateUserInput) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        password: hashedPassword,
        role: parsed.data.role,
        isActive: true,
      },
    });

    await createActivityLog({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: "TAMBAH_USER",
      entity: "User",
      entityId: user.id,
      entityLabel: `${parsed.data.name} (${parsed.data.email})`,
      detail: {
        keterangan: `Admin menambahkan user baru "${parsed.data.name}" dengan role ${parsed.data.role}`,
        sesudah: {
          namaUser: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          statusAktif: true,
        },
      },
    });

    revalidatePath("/users");
    return { success: true, id: user.id };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal membuat user" };
  }
}

export async function updateUser(id: string, data: UpdateUserInput) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User tidak ditemukan" };

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        ...(parsed.data.role !== undefined && { role: parsed.data.role }),
      },
    });

    await createActivityLog({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: "UBAH_USER",
      entity: "User",
      entityId: id,
      entityLabel: `${parsed.data.name ?? existing.name} (${parsed.data.email ?? existing.email})`,
      detail: {
        keterangan: `Admin mengubah data user "${existing.name}"`,
        sebelum: {
          namaUser: existing.name,
          email: existing.email,
          role: existing.role,
        },
        sesudah: {
          namaUser: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
        },
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal mengubah user" };
  }
}

export async function toggleUserActive(id: string, isActive: boolean) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User tidak ditemukan" };

  // Tidak boleh menonaktifkan diri sendiri
  if (id === admin.id && !isActive) {
    return { error: "Tidak bisa menonaktifkan akun Anda sendiri" };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    await createActivityLog({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: isActive ? "AKTIFKAN_USER" : "NONAKTIFKAN_USER",
      entity: "User",
      entityId: id,
      entityLabel: `${existing.name} (${existing.email})`,
      detail: {
        keterangan: `Admin ${isActive ? "mengaktifkan" : "menonaktifkan"} akun user "${existing.name}"`,
        sesudah: { statusAktif: isActive },
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal mengubah status user" };
  }
}

export async function resetUserPassword(id: string, data: { newPassword: string }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User tidak ditemukan" };

  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message).join(", ");
    return { error: errors };
  }

  try {
    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await createActivityLog({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: "RESET_PASSWORD_USER",
      entity: "User",
      entityId: id,
      entityLabel: `${existing.name} (${existing.email})`,
      detail: {
        keterangan: `Admin mereset password user "${existing.name}"`,
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal mereset password" };
  }
}

export async function deleteUser(id: string) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { error: safeError(err) };
  }

  if (id === admin.id) {
    return { error: "Tidak bisa menghapus akun Anda sendiri" };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User tidak ditemukan" };

  try {
    await prisma.user.delete({ where: { id } });

    await createActivityLog({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: "HAPUS_USER",
      entity: "User",
      entityId: id,
      entityLabel: `${existing.name} (${existing.email})`,
      detail: {
        keterangan: `Admin menghapus user "${existing.name}" (${existing.email}) dengan role ${existing.role}`,
        sebelum: {
          namaUser: existing.name,
          email: existing.email,
          role: existing.role,
          statusAktif: existing.isActive,
        },
      },
    });

    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: safeError(err) };
    }
    return { error: "Gagal menghapus user" };
  }
}
