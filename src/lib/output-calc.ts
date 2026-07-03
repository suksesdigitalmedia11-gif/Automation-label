/**
 * Helper untuk menghitung total panjang media (cm) yang terpakai
 * berdasarkan jumlah label & spesifikasi cetak.
 */
export function calcOutputHeightCm(totalLabels: number): number {
  if (totalLabels <= 0) return 0;

  const LABELS_PER_ROW = 10;
  const LABELS_PER_PACK = 5;
  const LABEL_HEIGHT_CM = 1.4;
  const SPACING_VERTICAL_CM = 0.15;
  const GAP_ANTAR_PAKET_CM = 0.6;

  const labelsPerPaket = LABELS_PER_ROW * LABELS_PER_PACK; // 50
  const paketHeightCm =
    LABELS_PER_PACK * LABEL_HEIGHT_CM +
    (LABELS_PER_PACK - 1) * SPACING_VERTICAL_CM; // 7.6

  const packets = Math.ceil(totalLabels / labelsPerPaket);
  const totalCm = packets * paketHeightCm + (packets - 1) * GAP_ANTAR_PAKET_CM;

  return Math.round(totalCm * 100) / 100;
}

/** Hitung total label dari array quantity details */
export function calcTotalLabels(details: { quantity: number }[]): number {
  return details.reduce((sum, d) => sum + d.quantity, 0);
}
