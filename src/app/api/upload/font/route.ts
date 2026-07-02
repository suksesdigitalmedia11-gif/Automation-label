import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";

const ALLOWED_EXTS = [".ttf", ".otf", ".woff", ".woff2"];
const FONTS_DIR = process.env.VERCEL
  ? path.join("/tmp", "fonts")
  : path.join(process.cwd(), "public", "fonts");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fontId = formData.get("fontId") as string | null;

    if (!file || !fontId) {
      return NextResponse.json(
        { error: "File dan fontId wajib diisi" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "Format file harus .ttf, .otf, .woff, atau .woff2" },
        { status: 400 },
      );
    }

    // Check font exists
    const font = await prisma.materialFont.findUnique({
      where: { id: fontId },
    });
    if (!font) {
      return NextResponse.json(
        { error: "Font tidak ditemukan" },
        { status: 404 },
      );
    }

    const safeName = `${fontId}${ext}`;
    const bytes = await file.arrayBuffer();
    const base64String = Buffer.from(bytes).toString("base64");

    // Update DB
    await prisma.materialFont.update({
      where: { id: fontId },
      data: {
        filePath: safeName,
        fileBase64: base64String,
        fontFamily: font.fontFamily || font.name,
      },
    });

    return NextResponse.json({ success: true, filePath: safeName });
  } catch (err) {
    console.error("[UPLOAD_FONT]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat upload" },
      { status: 500 },
    );
  }
}
