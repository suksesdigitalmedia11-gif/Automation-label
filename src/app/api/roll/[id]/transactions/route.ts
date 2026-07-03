import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const transactions = await prisma.transaction.findMany({
      where: { rollId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        transactionDate: true,
        quantity: true,
        numberOfDetails: true,
        resiNumber: true,
        status: true,
      },
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[ROLL_TRANSACTIONS]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data transaksi" },
      { status: 500 }
    );
  }
}
