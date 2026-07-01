/**
 * ⚠️ PRODUCTION-CRITICAL — JANGAN DIUBAH TANPA APPROVAL OWNER.
 *
 * Nilai di file ini menentukan hasil cetak fisik label DTF.
 * Setiap perubahan DPI, rasio font, dimensi label, output format,
 * fallback ukuran, atau layout produksi dapat mengubah hasil cetak.
 *
 * Lihat audit CRE-3, issue CRE-4, dan CRE-12 untuk daftar dimensi yang dikunci.
 */

import path from "path";

// ⚠️ PRODUCTION-CRITICAL: resolusi cetak.
export const DPI = 300;

// ⚠️ PRODUCTION-CRITICAL: konversi cm ke pixel.
export const CM_TO_PX = DPI / 2.54; // 1 cm ≈ 118.11 px at 300 DPI

// ⚠️ PRODUCTION-CRITICAL: lebar media output tetap (CRE-12).
export const MEDIA_WIDTH_CM = 58.0;

// ⚠️ PRODUCTION-CRITICAL: ukuran label tetap (CRE-12).
export const LABEL_WIDTH_CM = 5.0;
export const LABEL_HEIGHT_CM = 1.4;

// ⚠️ PRODUCTION-CRITICAL: spacing antar label (CRE-12).
export const SPACING_HORIZONTAL_CM = 0.15;
export const SPACING_VERTICAL_CM = 0.15;

// ⚠️ PRODUCTION-CRITICAL: layout per paket — 10 label horizontal, 5 vertical (CRE-12).
export const LABELS_PER_ROW = 10;
export const LABELS_PER_PACK = 5;

// ⚠️ PRODUCTION-CRITICAL: gap antar paket ke bawah (CRE-12).
export const GAP_ANTAR_PAKET_CM = 0.6;

// ⚠️ PRODUCTION-CRITICAL: lebar area barcode — sisa dari 58cm setelah label + gap (CRE-12).
// 58cm - (10 × 5cm + 9 × 0.15cm) = 58 - 51.35 = 6.65cm
export const BARCODE_WIDTH_CM = 6.65;

// ⚠️ PRODUCTION-CRITICAL: lebar media dalam pixel (58cm @ 300 DPI).
export const MEDIA_WIDTH_PX = Math.round(MEDIA_WIDTH_CM * CM_TO_PX);

// ⚠️ PRODUCTION-CRITICAL: dimensi label dalam pixel (5cm × 1.4cm @ 300 DPI).
export const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_CM * CM_TO_PX);
export const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_CM * CM_TO_PX);

// ⚠️ PRODUCTION-CRITICAL: spacing dalam pixel.
export const SPACING_HORIZONTAL_PX = Math.round(
  SPACING_HORIZONTAL_CM * CM_TO_PX,
);
export const SPACING_VERTICAL_PX = Math.round(SPACING_VERTICAL_CM * CM_TO_PX);

// ⚠️ PRODUCTION-CRITICAL: barcode width dalam pixel.
export const BARCODE_WIDTH_PX = Math.round(BARCODE_WIDTH_CM * CM_TO_PX);

// ⚠️ PRODUCTION-CRITICAL: tinggi satu paket dalam cm dan pixel.
// 5 label × 1.4cm + 4 gap × 0.15cm = 7cm + 0.6cm = 7.6cm
export const PAKET_HEIGHT_CM =
  LABELS_PER_PACK * LABEL_HEIGHT_CM +
  (LABELS_PER_PACK - 1) * SPACING_VERTICAL_CM;
export const PAKET_HEIGHT_PX = Math.round(PAKET_HEIGHT_CM * CM_TO_PX);

// Gap antar paket dalam pixel.
export const GAP_ANTAR_PAKET_PX = Math.round(GAP_ANTAR_PAKET_CM * CM_TO_PX);

// ⚠️ PRODUCTION-CRITICAL: rasio maksimum tinggi font terhadap tinggi label.
export const MAX_FONT_RATIO = 0.6;

// ⚠️ PRODUCTION-CRITICAL: ukuran font minimum dalam pixel.
export const MIN_FONT_SIZE_PX = 8;

// ⚠️ PRODUCTION-CRITICAL: rasio lebar maksimum teks terhadap lebar label.
export const MAX_TEXT_WIDTH_RATIO = 0.86;

// ⚠️ PRODUCTION-CRITICAL: format output gambar.
export const OUTPUT_FORMAT = "image/png";

// ⚠️ PRODUCTION-CRITICAL: direktori output.
// Vercel only allows writes to /tmp; local dev uses public/output.
export const OUTPUT_DIR = process.env.VERCEL
  ? "/tmp/output"
  : path.join(process.cwd(), "public", "output");

// ⚠️ PRODUCTION-CRITICAL: warna latar halaman (putih).
export const PAGE_BG_COLOR = "#FFFFFF";

// ⚠️ PRODUCTION-CRITICAL: warna fallback background saat font berwarna terang.
export const FALLBACK_DARK_BG = "#1a1a2e";

// ⚠️ PRODUCTION-CRITICAL: warna fallback background saat font berwarna gelap.
export const FALLBACK_LIGHT_BG = "#f5f5f5";

// ⚠️ PRODUCTION-CRITICAL: lebar cetak default dalam cm.
export const DEFAULT_PRINT_WIDTH_CM = 5.0;

// ⚠️ PRODUCTION-CRITICAL: tinggi label default dalam cm.
export const DEFAULT_LABEL_HEIGHT_CM = 1.0;
