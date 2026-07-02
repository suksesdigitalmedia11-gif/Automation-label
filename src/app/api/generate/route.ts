import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLabels } from "@/lib/label-generator";
import path from "path";
import fs from "fs";

const FONTS_DIR = process.env.VERCEL
  ? path.join("/tmp", "fonts")
  : path.join(process.cwd(), "public", "fonts");
const BG_DIR = process.env.VERCEL
  ? path.join("/tmp", "backgrounds")
  : path.join(process.cwd(), "public", "backgrounds");

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { transactionId } = await request.json();
    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId wajib diisi" },
        { status: 400 },
      );
    }

    // Load transaction with all details
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        details: {
          orderBy: { sortOrder: "asc" },
          include: {
            font: true,
            background: true,
          },
        },
        roll: true,
      },
    });

    if (!tx) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 },
      );
    }

    if (tx.details.length === 0) {
      return NextResponse.json(
        { error: "Tambahkan minimal 1 detail nama terlebih dahulu" },
        { status: 400 },
      );
    }

    // Build label detail array for generator (CRE-12: fixed dimensions)
    const labelDetails = tx.details.map((d) => ({
      name: d.name,
      fontFamily: d.font?.fontFamily ?? d.font?.name ?? "Arial",
      fontFilePath: d.font?.filePath
        ? path.join(FONTS_DIR, d.font.filePath)
        : null,
      backgroundImagePath: d.background?.imagePath
        ? path.join(BG_DIR, d.background.imagePath)
        : null,
      fontColor: d.background?.fontColor ?? "#FFFFFF",
      quantity: d.quantity,
    }));

    // Generate labels with fixed production layout (CRE-12)
    const result = await generateLabels({
      transactionId,
      details: labelDetails,
      resiNumber: tx.resiNumber ?? null,
    });

    // Read generated PNG and encode as base64 (Vercel /tmp compatible)
    const outputDir = process.env.VERCEL
      ? "/tmp/output"
      : path.join(process.cwd(), "public", "output");
    const outputFile = path.join(outputDir, transactionId, "output.png");
    const pngBuffer = fs.readFileSync(outputFile);
    const base64 = pngBuffer.toString("base64");

    // Update transaction path and status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        path: result.outputPath,
        status: "Completed",
      },
    });

    return NextResponse.json({
      success: true,
      outputPath: result.outputPath,
      totalLabels: result.totalLabels,
      totalPages: result.totalPages,
      base64,
    });
  } catch (err) {
    console.error("[GENERATE_LABELS]", err);
    return NextResponse.json(
      {
        error: "Gagal generate label. Periksa konfigurasi font dan background.",
      },
      { status: 500 },
    );
  }
}

/** GET: Check if output files exist for a transaction */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json(
      { error: "transactionId required" },
      { status: 400 },
    );
  }

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { path: true, status: true },
  });

  if (!tx || !tx.path) {
    return NextResponse.json({ exists: false });
  }

  const absPath = process.env.VERCEL
    ? path.join("/tmp", tx.path)
    : path.join(process.cwd(), "public", tx.path);
  const exists = fs.existsSync(absPath);

  return NextResponse.json({ exists, path: tx.path, status: tx.status });
}
