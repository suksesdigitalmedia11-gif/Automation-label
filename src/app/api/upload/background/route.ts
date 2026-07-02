import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";

const ALLOWED_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
const BG_DIR = process.env.VERCEL
  ? path.join("/tmp", "backgrounds")
  : path.join(process.cwd(), "public", "backgrounds");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const backgroundId = formData.get("backgroundId") as string | null;

    if (!file || !backgroundId) {
      return NextResponse.json(
        { error: "File dan backgroundId wajib diisi" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 20MB" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "Format file harus .png, .jpg, .jpeg, atau .webp" },
        { status: 400 },
      );
    }

    const bg = await prisma.materialBackground.findUnique({
      where: { id: backgroundId },
    });
    if (!bg) {
      return NextResponse.json(
        { error: "Background tidak ditemukan" },
        { status: 404 },
      );
    }

    fs.mkdirSync(BG_DIR, { recursive: true });

    // Delete old file
    if (bg.imagePath) {
      const oldPath = path.join(BG_DIR, bg.imagePath);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const safeName = `${backgroundId}${ext}`;
    const destPath = path.join(BG_DIR, safeName);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(bytes));

    await prisma.materialBackground.update({
      where: { id: backgroundId },
      data: { imagePath: safeName },
    });

    return NextResponse.json({ success: true, imagePath: safeName });
  } catch (err) {
    console.error("[UPLOAD_BACKGROUND]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat upload" },
      { status: 500 },
    );
  }
}
