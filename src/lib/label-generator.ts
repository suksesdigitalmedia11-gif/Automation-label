import "server-only";

import {
  createCanvas,
  loadImage,
  GlobalFonts,
  Canvas,
  Image,
} from "@napi-rs/canvas";
import path from "path";
import fs from "fs";

import {
  MEDIA_WIDTH_PX,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  SPACING_HORIZONTAL_PX,
  SPACING_VERTICAL_PX,
  LABELS_PER_ROW,
  LABELS_PER_PACK,
  PAKET_HEIGHT_PX,
  GAP_ANTAR_PAKET_PX,
  BARCODE_WIDTH_PX,
  MAX_FONT_RATIO,
  MIN_FONT_SIZE_PX,
  MAX_TEXT_WIDTH_RATIO,
  OUTPUT_FORMAT,
  OUTPUT_DIR,
  PAGE_BG_COLOR,
  FALLBACK_DARK_BG,
  FALLBACK_LIGHT_BG,
} from "./print-spec";

// ─── Constants ──────────────────────────────────────────────────────────────

const FONTS_DIR = process.env.VERCEL
  ? path.join("/tmp", "fonts")
  : path.join(process.cwd(), "public", "fonts");
const BACKGROUNDS_DIR = process.env.VERCEL
  ? path.join("/tmp", "backgrounds")
  : path.join(process.cwd(), "public", "backgrounds");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LabelDetail {
  name: string;
  fontFamily?: string | null;
  fontFilePath?: string | null;
  backgroundImagePath?: string | null;
  fontColor?: string | null;
  quantity: number;
}

export interface TransactionData {
  resiNumber: string | null;
  details: LabelDetail[];
}

export interface GenerateOptions {
  rollId: string;
  transactions: TransactionData[];
}

export interface GenerateResult {
  outputPath: string;
  totalLabels: number;
  totalPages: number;
}

// ─── Font Registry ───────────────────────────────────────────────────────────

const registeredFonts = new Map<string, string>();

function ensureFontRegistered(fontFamily: string, filePath: string): string {
  if (registeredFonts.has(fontFamily)) {
    return registeredFonts.get(fontFamily)!;
  }
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(FONTS_DIR, filePath);
  
  // Use a completely safe alphanumeric alias to prevent napi-rs/canvas parsing errors
  const safeAlias = fontFamily.replace(/[^a-zA-Z0-9]/g, "") + Math.random().toString(36).slice(2, 7);
  
  if (fs.existsSync(absPath)) {
    GlobalFonts.registerFromPath(absPath, safeAlias);
    registeredFonts.set(fontFamily, safeAlias);
  } else {
    console.error(`[FONT_REGISTER] File not found: ${absPath}`);
    return "Arial";
  }
  return safeAlias;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadBackgroundImage(imgPath: string): Promise<Image | null> {
  try {
    const absPath = path.isAbsolute(imgPath)
      ? imgPath
      : path.join(BACKGROUNDS_DIR, imgPath);
    if (!fs.existsSync(absPath)) return null;
    return await loadImage(absPath);
  } catch (err) {
    console.error(`[LOAD_BACKGROUND] Failed to load image at ${imgPath}:`, err);
    return null;
  }
}

// Removed generateBarcodeImage

async function drawLabel(
  ctx: ReturnType<Canvas["getContext"]>,
  x: number,
  y: number,
  labelW: number,
  labelH: number,
  name: string,
  fontFamily: string,
  fontColor: string,
  bgImage: Image | null,
  bgFallbackColor: string,
): Promise<void> {
  ctx.save();
  ctx.translate(x, y);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, labelW, labelH);
  } else {
    ctx.fillStyle = bgFallbackColor;
    ctx.fillRect(0, 0, labelW, labelH);
  }

  const maxFontPx = Math.floor(labelH * MAX_FONT_RATIO);
  const minFontPx = MIN_FONT_SIZE_PX;
  let fontSize = Math.max(minFontPx, maxFontPx);
  const maxTextWidth = labelW * MAX_TEXT_WIDTH_RATIO;

  ctx.textBaseline = "middle";
  ctx.fillStyle = fontColor;

  while (fontSize > minFontPx) {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(name);
    if (m.width <= maxTextWidth) break;
    fontSize -= 1;
  }

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const measured = ctx.measureText(name);
  const textX = (labelW - measured.width) / 2;
  const textY = labelH / 2;
  ctx.fillText(name, textX, textY);

  ctx.restore();
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function generateLabels(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const { rollId, transactions } = opts;

  interface LabelCell {
    name: string;
    fontFamily: string;
    fontColor: string;
    bgImage: Image | null;
    bgFallback: string;
  }

  interface TransactionPack {
    resiNumber: string;
    packets: LabelCell[][];
  }

  // Pre-register all fonts and cache all backgrounds
  const allDetails = transactions.flatMap((t) => t.details);
  
  for (const d of allDetails) {
    if (d.fontFamily && d.fontFilePath) {
      d.fontFamily = ensureFontRegistered(d.fontFamily, d.fontFilePath);
    }
  }

  const bgCache = new Map<string, Image | null>();
  for (const d of allDetails) {
    if (d.backgroundImagePath && !bgCache.has(d.backgroundImagePath)) {
      bgCache.set(
        d.backgroundImagePath,
        await loadBackgroundImage(d.backgroundImagePath),
      );
    }
  }

  const labelsPerPaket = LABELS_PER_ROW * LABELS_PER_PACK;
  const transactionPacks: TransactionPack[] = [];
  let totalPackets = 0;

  for (const tx of transactions) {
    const queue: LabelCell[] = [];
    for (const d of tx.details) {
      const fontFamily = d.fontFamily || "Arial";
      const fontColor = d.fontColor || "#FFFFFF";
      const bgImage = d.backgroundImagePath
        ? (bgCache.get(d.backgroundImagePath) ?? null)
        : null;
      const bgFallback =
        fontColor === "#FFFFFF" || fontColor.toLowerCase() === "#ffffff"
          ? FALLBACK_DARK_BG
          : FALLBACK_LIGHT_BG;

      for (let i = 0; i < d.quantity; i++) {
        queue.push({ name: d.name, fontFamily, fontColor, bgImage, bgFallback });
      }
    }

    if (queue.length === 0) continue;

    const txPacketsCount = Math.ceil(queue.length / labelsPerPaket);
    const packets: LabelCell[][] = [];
    for (let p = 0; p < txPacketsCount; p++) {
      packets.push(queue.slice(p * labelsPerPaket, (p + 1) * labelsPerPaket));
    }

    transactionPacks.push({
      resiNumber: tx.resiNumber?.trim() || "-",
      packets,
    });
    totalPackets += txPacketsCount;
  }

  if (totalPackets === 0) {
    throw new Error("Tidak ada label untuk di-generate dalam roll ini");
  }

  const canvasW = MEDIA_WIDTH_PX;
  const canvasH =
    totalPackets * PAKET_HEIGHT_PX + (totalPackets - 1) * GAP_ANTAR_PAKET_PX;

  const txOutDir = path.join(OUTPUT_DIR, rollId);
  fs.mkdirSync(txOutDir, { recursive: true });

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAGE_BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const labelGridStartX = BARCODE_WIDTH_PX;
  let currentPacketIndex = 0;

  for (const tx of transactionPacks) {
    for (const packet of tx.packets) {
      const pktY = currentPacketIndex * (PAKET_HEIGHT_PX + GAP_ANTAR_PAKET_PX);

      // Draw Resi text on the left area (vertically centered in the packet area)
      ctx.save();
      ctx.fillStyle = "#000000";
      // Determine font size based on BARCODE_WIDTH_PX but keep it reasonable
      const resiFontSize = Math.min(60, Math.round(BARCODE_WIDTH_PX * 0.15));
      ctx.font = `bold ${resiFontSize}px Arial, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      
      const resiTextX = BARCODE_WIDTH_PX / 2;
      const resiTextY = pktY + (PAKET_HEIGHT_PX / 2);
      
      // If resi text is very long, we might need to wrap it or draw it rotated, 
      // but horizontal is easier if it fits. Let's just print it horizontally and let it squish/clip slightly if needed, 
      // but usually resi fits in 6.65cm. We can also do multi-line if we split by space.
      // We will just scale text to fit horizontally if it's too wide.
      const m = ctx.measureText(tx.resiNumber);
      if (m.width > BARCODE_WIDTH_PX * 0.9) {
          ctx.fillText(tx.resiNumber, resiTextX, resiTextY, BARCODE_WIDTH_PX * 0.9);
      } else {
          ctx.fillText(tx.resiNumber, resiTextX, resiTextY);
      }
      ctx.restore();


      for (let row = 0; row < LABELS_PER_PACK; row++) {
        for (let col = 0; col < LABELS_PER_ROW; col++) {
          const cellIdx = row * LABELS_PER_ROW + col;
          if (cellIdx >= packet.length) break;

          const cell = packet[cellIdx];
        const lx =
          labelGridStartX + col * (LABEL_WIDTH_PX + SPACING_HORIZONTAL_PX);
        const ly = pktY + row * (LABEL_HEIGHT_PX + SPACING_VERTICAL_PX);

        await drawLabel(
          ctx,
          lx,
          ly,
          LABEL_WIDTH_PX,
          LABEL_HEIGHT_PX,
          cell.name,
          cell.fontFamily,
          cell.fontColor,
          cell.bgImage,
          cell.bgFallback,
        );
        }
      }
      currentPacketIndex++;
    }
  }

  const pageFile = "output.png";
  const buffer = canvas.toBuffer(OUTPUT_FORMAT);
  fs.writeFileSync(path.join(txOutDir, pageFile), buffer);

  return {
    outputPath: `/output/${rollId}/${pageFile}`,
    totalLabels: transactionPacks.reduce((sum, tx) => sum + tx.packets.reduce((s, p) => s + p.length, 0), 0),
    totalPages: 1,
  };
}
