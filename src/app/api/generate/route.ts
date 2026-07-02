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
    const { rollId } = await request.json();
    if (!rollId) {
      return NextResponse.json(
        { error: "rollId wajib diisi" },
        { status: 400 },
      );
    }

    const roll = await prisma.roll.findUnique({
      where: { id: rollId },
      include: {
        transactions: {
          orderBy: { transactionDate: "asc" },
          include: {
            details: {
              orderBy: { sortOrder: "asc" },
              include: { font: true, background: true },
            },
          },
        },
      },
    });

    if (!roll) {
      return NextResponse.json(
        { error: "Roll tidak ditemukan" },
        { status: 404 },
      );
    }

    if (roll.transactions.length === 0) {
      return NextResponse.json(
        { error: "Tambahkan minimal 1 transaksi ke dalam roll ini" },
        { status: 400 },
      );
    }

    const txData = roll.transactions.map((tx) => ({
      resiNumber: tx.resiNumber ?? null,
      details: tx.details.map((d) => ({
        name: d.name,
        fontFamily: d.font?.fontFamily ?? d.font?.name ?? "Arial",
        fontFilePath: d.font?.filePath
          ? path.join(FONTS_DIR, d.font.filePath)
          : null,
        fontFileBase64: d.font?.fileBase64 ?? null,
        backgroundImagePath: d.background?.imagePath
          ? path.join(BG_DIR, d.background.imagePath)
          : null,
        backgroundFileBase64: d.background?.fileBase64 ?? null,
        fontColor: d.background?.fontColor ?? "#FFFFFF",
        quantity: d.quantity,
      })),
    }));

    // Generate labels with fixed production layout (CRE-12)
    const result = await generateLabels({
      rollId,
      transactions: txData,
    });

    // Read generated PNG and encode as base64 (Vercel /tmp compatible)
    const outputDir = process.env.VERCEL
      ? "/tmp/output"
      : path.join(process.cwd(), "public", "output");
    const outputFile = path.join(outputDir, rollId, "output.png");
    const pngBuffer = fs.readFileSync(outputFile);
    const base64 = pngBuffer.toString("base64");

    // Update roll path and status
    await prisma.roll.update({
      where: { id: rollId },
      data: {
        path: result.outputPath,
        status: "Completed",
      },
    });

    // Optionally mark transactions inside as completed
    await prisma.transaction.updateMany({
      where: { rollId: rollId },
      data: { status: "Completed" },
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
  const transactionId = searchParams.get("rollId") || searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json(
      { error: "transactionId required" },
      { status: 400 },
    );
  }

  const roll = await prisma.roll.findUnique({
    where: { id: transactionId }, // the variable is still named transactionId for backward compatibility from the GET param, but it's now rollId
    select: { path: true, status: true },
  });

  if (!roll || !roll.path) {
    return NextResponse.json({ exists: false });
  }

  const absPath = process.env.VERCEL
    ? path.join("/tmp", roll.path)
    : path.join(process.cwd(), "public", roll.path);
  const exists = fs.existsSync(absPath);

  return NextResponse.json({ exists, path: roll.path, status: roll.status });
}
