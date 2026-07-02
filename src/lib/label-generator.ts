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
import bwipjs from "bwip-js";

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

export interface GenerateOptions {
  transactionId: string;
  details: LabelDetail[];
  resiNumber?: string | null;
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
  if (fs.existsSync(absPath)) {
    GlobalFonts.registerFromPath(absPath, fontFamily);
    registeredFonts.set(fontFamily, fontFamily);
  }
  return fontFamily;
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

async function generateBarcodeImage(
  text: string,
  widthPx: number,
  heightPx: number,
): Promise<Image> {
  const buffer = await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: Math.round(heightPx / 3),
    width: Math.round(widthPx / 3),
    includetext: true,
    textxalign: "center",
  });
  // @napi-rs/canvas loadImage doesn't accept raw bwip-js buffer directly.
  // Write to a temp file first, then load.
  const tmpDir = path.join(OUTPUT_DIR, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(
    tmpDir,
    `barcode_${Date.now()}_${Math.random().toString(36).slice(2)}.png`,
  );
  fs.writeFileSync(tmpPath, buffer);
  try {
    return await loadImage(tmpPath);
  } finally {
    fs.unlinkSync(tmpPath);
  }
}

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
    ctx.font = `bold ${fontSize}px "${fontFamily}", Arial`;
    const m = ctx.measureText(name);
    if (m.width <= maxTextWidth) break;
    fontSize -= 1;
  }

  ctx.font = `bold ${fontSize}px "${fontFamily}", Arial`;
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
  const { transactionId, details, resiNumber } = opts;

  interface LabelCell {
    name: string;
    fontFamily: string;
    fontColor: string;
    bgImage: Image | null;
    bgFallback: string;
  }

  for (const d of details) {
    if (d.fontFamily && d.fontFilePath) {
      ensureFontRegistered(d.fontFamily, d.fontFilePath);
    }
  }

  const bgCache = new Map<string, Image | null>();
  for (const d of details) {
    if (d.backgroundImagePath && !bgCache.has(d.backgroundImagePath)) {
      bgCache.set(
        d.backgroundImagePath,
        await loadBackgroundImage(d.backgroundImagePath),
      );
    }
  }

  const queue: LabelCell[] = [];
  for (const d of details) {
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

  if (queue.length === 0) {
    throw new Error("Tidak ada label untuk di-generate");
  }

  const labelsPerPaket = LABELS_PER_ROW * LABELS_PER_PACK;
  const totalPackets = Math.ceil(queue.length / labelsPerPaket);

  const canvasW = MEDIA_WIDTH_PX;
  const canvasH =
    totalPackets * PAKET_HEIGHT_PX + (totalPackets - 1) * GAP_ANTAR_PAKET_PX;

  let barcodeImg: Image | null = null;
  if (resiNumber && resiNumber.trim()) {
    try {
      barcodeImg = await generateBarcodeImage(
        resiNumber.trim(),
        BARCODE_WIDTH_PX,
        PAKET_HEIGHT_PX,
      );
    } catch (err) {
      console.error("[LABEL-GEN] Failed to generate barcode:", err);
    }
  }

  const txOutDir = path.join(OUTPUT_DIR, transactionId);
  fs.mkdirSync(txOutDir, { recursive: true });

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAGE_BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const labelGridStartX = BARCODE_WIDTH_PX;

  for (let pktIdx = 0; pktIdx < totalPackets; pktIdx++) {
    const pktY = pktIdx * (PAKET_HEIGHT_PX + GAP_ANTAR_PAKET_PX);

    if (barcodeImg) {
      ctx.drawImage(barcodeImg, 0, pktY, BARCODE_WIDTH_PX, PAKET_HEIGHT_PX);
    }

    for (let row = 0; row < LABELS_PER_PACK; row++) {
      for (let col = 0; col < LABELS_PER_ROW; col++) {
        const cellIdx = pktIdx * labelsPerPaket + row * LABELS_PER_ROW + col;
        if (cellIdx >= queue.length) break;

        const cell = queue[cellIdx];
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
  }

  const pageFile = "output.png";
  const buffer = canvas.toBuffer(OUTPUT_FORMAT);
  fs.writeFileSync(path.join(txOutDir, pageFile), buffer);

  return {
    outputPath: `/output/${transactionId}/${pageFile}`,
    totalLabels: queue.length,
    totalPages: 1,
  };
}
