import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcOutputHeightFromGroups } from "@/lib/output-calc";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        details: {
          select: {
            resiNumber: true,
            quantity: true,
            name: true,
          },
        },
      },
    });

    // Hitung total output cm
    const totalCm = calcOutputHeightFromGroups(
      transactions.map((tx) => ({
        details: tx.details.map((d) => ({ quantity: d.quantity })),
      })),
    );

    // Group resi per transaction
    const txWithResi = transactions.map((tx) => {
      const resiMap = new Map<string, { count: number; names: string[] }>();
      for (const d of tx.details) {
        const r = d.resiNumber?.trim() || "-";
        if (!resiMap.has(r)) resiMap.set(r, { count: 0, names: [] });
        const entry = resiMap.get(r)!;
        entry.count += d.quantity;
        entry.names.push(d.name);
      }
      return {
        id: tx.id,
        date: tx.transactionDate,
        description: tx.numberOfDetails ? `${tx.numberOfDetails} nama` : "-",
        resiNumbers: Array.from(resiMap.entries()).map(([r, info]) => ({
          number: r === "-" ? null : r,
          totalLabels: info.count,
          sampleNames: info.names.slice(0, 3),
          totalNames: info.names.length,
        })),
        status: tx.status,
      };
    });

    return NextResponse.json({
      transactions: txWithResi,
      totalOutputCm: totalCm,
    });
  } catch (err) {
    console.error("[ROLL_TRANSACTIONS]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data transaksi" },
      { status: 500 },
    );
  }
}
