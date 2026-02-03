/**
 * Configuration for the AMI School Report Card Generator
 */
const CONFIG = {
  // Mapping Classe -> Professeur
  classes: {
    M01: { teacher: "Mawlana Djafar" },
    M02: { teacher: "Mawlana Zubair" },
    M03: { teacher: "Mawlana Haja" },
    M04: { teacher: "Mawlana Fayçal" },
    M05: { teacher: "Mawlana Ismaïl" },
    M06: { teacher: "Mawlana Djafar" },
    M07: { teacher: "Mawlana Haja" },
    M08: { teacher: "Mawlana Ismaïl" },
    M09: { teacher: "Mawlana M09" },
    M10A: { teacher: "Mawlana Zubair" },
    M10B: { teacher: "Mawlana Fayçal" },
  },

  /**
   * Translates CSV headers to Arabic/Transliteration/French display names.
   * Format: CSV_HEADER: { ar: "Arabic Name", trans: "Transliteration", fr: "French Translation" }
   */
  subjects: {
    "QA'IDAH": { ar: "قاعدة", trans: "QĀ'IDAH", fr: "BASES" },
    "QUR'AN": { ar: "القرآن", trans: "QUR'ĀN", fr: "SAINT-CORAN" },
    KALIMAH: { ar: "كلمة", trans: "KALIMAH", fr: "PAROLES DE FOI" },
    "DOU'A": { ar: "دعاء", trans: "DOU'Ā", fr: "INVOCATIONS" },
    SURAH: { ar: "سورة", trans: "SŪRAH", fr: "SOURATES" },
    FIQH: { ar: "فقه", trans: "FIQH", fr: "JURISPRUDENCE" },
    SIRAH: { ar: "سيرة", trans: "SĪRAH", fr: "BIOGRAPHIE" },
    ARABIC: { ar: "لغة عربية", trans: "", fr: "LANGUE ARABE" },
    TAJWID: { ar: "تجويد", trans: "TAJWĪD", fr: "INTONATIONS" },
    AQIDAH: { ar: "عقيدة", trans: "AQIDAH", fr: "CROYANCES" },
    HADITH: { ar: "حديث", trans: "HADĪTH", fr: "HADITH" },
    HIFZ: { ar: "حفظ", trans: "HIFZ", fr: "MÉMORISATION" },
    AKHLAQ: { ar: "أخلاق", trans: "AKHLĀQ", fr: "COMPORTEMENT" },
    HUDUR: { ar: "حضور", trans: "HUDHŪR", fr: "ASSIDUITÉ" },
  },

  // Columns to explicitly ignore (not subjects)
  ignoredColumns: [
    "#",
    "NOM",
    "PRÉNOM",
    "PRENOM",
    "TOTAL",
    "RANG",
    "MENTION",
    "MOYENNE",
    "MOYENNE GÉNÉRALE",
    "MOYENNE GENERALE",
    "MOY",
    "APPRÉCIATIONS GÉNÉRALES",
    "APPRECIATIONS GENERALES",
    "APPRÉCIATION GÉNÉRALE",
    "OBSERVATIONS",
    "DATE_NAISSANCE",
    "M01",
    "M10",
    "CLASSE",
    "ELEVE_ID",
  ],

  // Default max score if missing from CSV Line 2
  defaultMaxScore: 20,
};
