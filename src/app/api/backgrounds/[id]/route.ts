import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const bg = await prisma.materialBackground.findUnique({
      where: { id },
      select: { imagePath: true },
    });

    if (!bg?.imagePath) {
      return NextResponse.json({ error: "No image" }, { status: 404 });
    }

    const dir = process.env.VERCEL
      ? path.join("/tmp", "backgrounds")
      : path.join(process.cwd(), "public", "backgrounds");

    const filePath = path.join(dir, bg.imagePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(bg.imagePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[SERVE_BG_IMAGE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
