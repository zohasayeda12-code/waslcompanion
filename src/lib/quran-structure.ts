// Static Quran structural data (Madani mushaf, 604 pages).
// Index 1..114 for surahs, 1..30 for juz.

import { SURAH_NAMES_AR } from "./surah-names";
import { SURAH_AYAH_COUNTS } from "./surah-meta";

// Transliterated/English surah names (index 1..114)
export const SURAH_NAMES_EN: string[] = [
  "",
  "Al-Fatihah", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
  "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
  "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
  "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
  "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
  "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
  "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

// Mushaf page where each surah begins (Madani 604-page layout). Index 1..114.
export const SURAH_START_PAGE: number[] = [
  0,
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 599, 599, 600,
  600, 601, 601, 601, 602, 602, 602, 603, 603, 603,
  604, 604, 604, 604,
];

export type JuzInfo = {
  number: number;
  startSurah: number;
  startAyah: number;
  startPage: number;
  /** Romanized opening phrase, e.g. "Alif Lam Mim", "Sayaqul" */
  name: string;
};

export const JUZ_INFO: JuzInfo[] = [
  { number: 1,  startSurah: 1,  startAyah: 1,   startPage: 1,   name: "Alif Lam Mim" },
  { number: 2,  startSurah: 2,  startAyah: 142, startPage: 22,  name: "Sayaqul" },
  { number: 3,  startSurah: 2,  startAyah: 253, startPage: 42,  name: "Tilkar Rusul" },
  { number: 4,  startSurah: 3,  startAyah: 92,  startPage: 62,  name: "Lan Tana Loo" },
  { number: 5,  startSurah: 4,  startAyah: 24,  startPage: 82,  name: "Wal Mohsanat" },
  { number: 6,  startSurah: 4,  startAyah: 148, startPage: 102, name: "La Yuhibbullah" },
  { number: 7,  startSurah: 5,  startAyah: 82,  startPage: 121, name: "Wa Iza Samiu" },
  { number: 8,  startSurah: 6,  startAyah: 111, startPage: 142, name: "Wa Lao Annana" },
  { number: 9,  startSurah: 7,  startAyah: 88,  startPage: 162, name: "Qalal Malao" },
  { number: 10, startSurah: 8,  startAyah: 41,  startPage: 182, name: "Wa A'lamu" },
  { number: 11, startSurah: 9,  startAyah: 93,  startPage: 201, name: "Yatazeroon" },
  { number: 12, startSurah: 11, startAyah: 6,   startPage: 222, name: "Wa Mamin Da'abat" },
  { number: 13, startSurah: 12, startAyah: 53,  startPage: 242, name: "Wa Ma Ubrioo" },
  { number: 14, startSurah: 15, startAyah: 1,   startPage: 262, name: "Rubama" },
  { number: 15, startSurah: 17, startAyah: 1,   startPage: 282, name: "Subhanallazi" },
  { number: 16, startSurah: 18, startAyah: 75,  startPage: 302, name: "Qal Alam" },
  { number: 17, startSurah: 21, startAyah: 1,   startPage: 322, name: "Iqtarabath" },
  { number: 18, startSurah: 23, startAyah: 1,   startPage: 342, name: "Qadd Aflaha" },
  { number: 19, startSurah: 25, startAyah: 21,  startPage: 362, name: "Wa Qalallazina" },
  { number: 20, startSurah: 27, startAyah: 56,  startPage: 382, name: "A'man Khalaq" },
  { number: 21, startSurah: 29, startAyah: 46,  startPage: 402, name: "Utlu Ma Oohi" },
  { number: 22, startSurah: 33, startAyah: 31,  startPage: 422, name: "Wa Manyaqnut" },
  { number: 23, startSurah: 36, startAyah: 28,  startPage: 442, name: "Wa Ma Liya" },
  { number: 24, startSurah: 39, startAyah: 32,  startPage: 462, name: "Faman Azlam" },
  { number: 25, startSurah: 41, startAyah: 47,  startPage: 482, name: "Elahe Yuruddo" },
  { number: 26, startSurah: 46, startAyah: 1,   startPage: 502, name: "Ha'a Meem" },
  { number: 27, startSurah: 51, startAyah: 31,  startPage: 522, name: "Qala Fama Khatbukum" },
  { number: 28, startSurah: 58, startAyah: 1,   startPage: 542, name: "Qadd Sami Allah" },
  { number: 29, startSurah: 67, startAyah: 1,   startPage: 562, name: "Tabarakallazi" },
  { number: 30, startSurah: 78, startAyah: 1,   startPage: 582, name: "Amma Yatasa'aloon" },
];

/** Number of ayat covered by a juz (sum across the surahs it spans). */
export function juzAyahCount(juz: number): number {
  const cur = JUZ_INFO[juz - 1];
  const next = JUZ_INFO[juz]; // undefined for juz 30
  if (!cur) return 0;
  let count = 0;
  const endSurah = next ? next.startSurah : 114;
  const endAyah = next ? next.startAyah - 1 : SURAH_AYAH_COUNTS[114];
  for (let s = cur.startSurah; s <= endSurah; s++) {
    const surahCount = SURAH_AYAH_COUNTS[s] ?? 0;
    const from = s === cur.startSurah ? cur.startAyah : 1;
    const to = s === endSurah ? endAyah : surahCount;
    if (to >= from) count += to - from + 1;
  }
  return count;
}

export { SURAH_NAMES_AR, SURAH_AYAH_COUNTS };
