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
  fontFileBase64?: string | null;
  backgroundImagePath?: string | null;
  backgroundFileBase64?: string | null;
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
  const safeAlias =
    fontFamily.replace(/[^a-zA-Z0-9]/g, "") +
    Math.random().toString(36).slice(2, 7);

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

/**
 * Inject DPI metadata (pHYs chunk) into PNG buffer.
 * Without this, CorelDRAW defaults to 72 DPI, making width appear huge.
 * 300 DPI = 11811 pixels per meter.
 */
function injectPngDpi(buf: Buffer, dpi: number): Buffer {
  const ppm = Math.round(dpi / 0.0254); // pixels per meter

  // Locate end of IHDR chunk to insert pHYs after it
  const sigEnd = 8; // PNG signature
  const ihdrChunkLen = buf.readUInt32BE(sigEnd);
  const insertAt = sigEnd + 4 + 4 + ihdrChunkLen + 4; // after IHDR chunk (len + type + data + crc)

  // Build pHYs chunk
  const pHYsLen = Buffer.alloc(4);
  pHYsLen.writeUInt32BE(9, 0);

  const pHYsType = Buffer.from("pHYs", "ascii");

  const pHYsData = Buffer.alloc(9);
  pHYsData.writeUInt32BE(ppm, 0); // X pixels per meter
  pHYsData.writeUInt32BE(ppm, 4); // Y pixels per meter
  pHYsData.writeUInt8(1, 8); // unit: meter

  // CRC32 of type + data
  const crcData = Buffer.concat([pHYsType, pHYsData]);
  const crc = crc32Buf(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  const pHYsChunk = Buffer.concat([pHYsLen, pHYsType, pHYsData, crcBuf]);

  // Insert pHYs chunk into PNG buffer
  return Buffer.concat([
    buf.subarray(0, insertAt),
    pHYsChunk,
    buf.subarray(insertAt),
  ]);
}

function crc32Buf(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

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

  let lines: string[] = [];

  while (fontSize >= minFontPx) {
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;

    const words = name.split(" ");
    lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxTextWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;

    const hasOversizedWord = lines.some(
      (line) => ctx.measureText(line).width > maxTextWidth,
    );

    if (totalHeight <= labelH * 0.8 && !hasOversizedWord) {
      break;
    }

    if (fontSize === minFontPx) {
      break;
    }
    fontSize -= 1;
    if (fontSize < minFontPx) {
      fontSize = minFontPx;
      break;
    }
  }

  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  let startY = (labelH - totalTextHeight) / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = ctx.measureText(line);
    const textX = (labelW - Math.min(m.width, maxTextWidth)) / 2;
    ctx.fillText(line, textX, startY + i * lineHeight, maxTextWidth);
  }

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
    resiList: string[];
    packets: LabelCell[][];
  }

  // Pre-register all fonts and cache all backgrounds
  const allDetails = transactions.flatMap((t) => t.details);

  for (const d of allDetails) {
    if (d.fontFilePath && d.fontFileBase64) {
      const absPath = path.isAbsolute(d.fontFilePath)
        ? d.fontFilePath
        : path.join(FONTS_DIR, d.fontFilePath);
      if (!fs.existsSync(absPath)) {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, Buffer.from(d.fontFileBase64, "base64"));
      }
    }
    if (d.fontFamily && d.fontFilePath) {
      d.fontFamily = ensureFontRegistered(d.fontFamily, d.fontFilePath);
    }
  }

  const bgCache = new Map<string, Image | null>();
  for (const d of allDetails) {
    if (d.backgroundImagePath && d.backgroundFileBase64) {
      const absPath = path.isAbsolute(d.backgroundImagePath)
        ? d.backgroundImagePath
        : path.join(BACKGROUNDS_DIR, d.backgroundImagePath);
      if (!fs.existsSync(absPath)) {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(
          absPath,
          Buffer.from(d.backgroundFileBase64, "base64"),
        );
      }
    }
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
        queue.push({
          name: d.name,
          fontFamily,
          fontColor,
          bgImage,
          bgFallback,
        });
      }
    }

    if (queue.length === 0) continue;

    const txPacketsCount = Math.ceil(queue.length / labelsPerPaket);
    const packets: LabelCell[][] = [];
    for (let p = 0; p < txPacketsCount; p++) {
      packets.push(queue.slice(p * labelsPerPaket, (p + 1) * labelsPerPaket));
    }

    const resiStr = tx.resiNumber?.trim() || "-";
    const resiList = resiStr
      .split(/[,;\\n\\t]+/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    if (resiList.length === 0) resiList.push("-");

    transactionPacks.push({
      resiList,
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

  // No background fill — keep transparent (Corel-friendly)

  const labelGridStartX = BARCODE_WIDTH_PX;
  let currentPacketIndex = 0;

  for (const tx of transactionPacks) {
    for (let pIdx = 0; pIdx < tx.packets.length; pIdx++) {
      const packet = tx.packets[pIdx];
      const pktY = currentPacketIndex * (PAKET_HEIGHT_PX + GAP_ANTAR_PAKET_PX);

      // Draw Resi text — karakter per karakter vertikal (no rotate, no alignment issues)
      ctx.save();

      const resiFontSize = Math.min(100, Math.round(BARCODE_WIDTH_PX * 0.28));
      ctx.font = `bold ${resiFontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.textBaseline = "top";
      ctx.textAlign = "center";

      // Resi with packet numbering
      const baseResi = tx.resiList[pIdx % tx.resiList.length];
      const totalPackets = tx.packets.length;
      const resiText =
        totalPackets > 1 ? `${baseResi} ${pIdx + 1}/${totalPackets}` : baseResi;

      // Write each character on a new line, centered in barcode area
      const chars = resiText.split("");
      const charSpacing = resiFontSize * 1.15;
      const totalTextHeight = chars.length * charSpacing;

      // Center vertically in the packet area, but start from top if shorter than packet
      let startY = pktY;
      if (totalTextHeight < PAKET_HEIGHT_PX) {
        startY = pktY + (PAKET_HEIGHT_PX - totalTextHeight) / 2;
      }

      const textX = BARCODE_WIDTH_PX / 2;
      for (let ci = 0; ci < chars.length; ci++) {
        ctx.fillText(chars[ci], textX, startY + ci * charSpacing);
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
  let buffer = canvas.toBuffer(OUTPUT_FORMAT);

  // Inject DPI metadata (pHYs chunk) so CorelDRAW reads correct size: 58cm @ 300 DPI
  buffer = injectPngDpi(buffer, 300);

  fs.writeFileSync(path.join(txOutDir, pageFile), buffer);

  return {
    outputPath: `/output/${rollId}/${pageFile}`,
    totalLabels: transactionPacks.reduce(
      (sum, tx) => sum + tx.packets.reduce((s, p) => s + p.length, 0),
      0,
    ),
    totalPages: 1,
  };
}
