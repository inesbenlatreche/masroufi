import {
  balanceReply,
  clarificationReply,
  detectLang,
  incompleteReply,
  storeReply,
} from "@/lib/i18n";
import type {
  ChatMessage,
  TransactionCategory,
  TransactionKind,
} from "@/lib/types";

/**
 * THE future-backend seam.
 *
 * Today this runs local mock logic (keyword / regex matching over the raw
 * text). Later, the body of this function becomes a single
 * `fetch("/api/process")` call — every component talks to this function only,
 * never to its internals.
 */
export interface ProcessResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function normalizeDigits(text: string): string {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  let out = text;
  for (let i = 0; i < 10; i += 1) {
    out = out.split(arabicIndic[i]).join(String(i));
  }
  // Eastern Arabic-Indic (Persian) digits too, just in case.
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  for (let i = 0; i < 10; i += 1) {
    out = out.split(persian[i]).join(String(i));
  }
  return out;
}

function extractAmount(text: string): number | null {
  const normalized = normalizeDigits(text);
  const candidates = normalized.match(/\d[\d\s.,]*\d|\d/g);
  if (!candidates || candidates.length === 0) return null;

  const hasCurrencyHint = (index: number, raw: string): boolean => {
    const window = normalized
      .slice(Math.max(0, index - 20), index + raw.length + 20)
      .toLowerCase();
    return /دينار|دج|\bda\b|dinars?|dzd/.test(window);
  };

  // Prefer numbers sitting next to a currency word.
  let searchFrom = 0;
  for (const raw of candidates) {
    const index = normalized.indexOf(raw, searchFrom);
    searchFrom = index + raw.length;
    if (hasCurrencyHint(index, raw)) {
      const parsed = parseAmountRaw(raw);
      if (parsed !== null) return parsed;
    }
  }

  // Fallback: largest plausible number (avoids picking a stray "1" or "2").
  let best: number | null = null;
  for (const raw of candidates) {
    const parsed = parseAmountRaw(raw);
    if (parsed === null) continue;
    if (best === null || parsed > best) best = parsed;
  }
  return best;
}

function parseAmountRaw(raw: string): number | null {
  let cleaned = raw.replace(/[\s,]/g, "");
  // Treat dots as thousand separators when they group 3 digits (e.g. 3.000).
  cleaned = cleaned.replace(/\.(?=\d{3}\b)/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  // DA amounts are whole numbers in practice; round to be safe.
  return Math.round(value);
}

export function formatDA(amount: number): string {
  return `${amount.toLocaleString("en-US")} DA`;
}

function detectCategory(lower: string): TransactionCategory {
  if (
    /salaire|salary|\bratb\b|راتب|شهرية|خلصة|la\s*paye|paie/.test(lower)
  )
    return "salaire";
  if (/vente|vendu|sold|بيع|بعت|تباعت/.test(lower)) return "vente";
  if (
    /taxi|طاكسي|طاكسى|transport|bus|tram|نقل|carburant|essence|بنزين|مازوت|parking/.test(
      lower,
    )
  )
    return "transport";
  if (
    /nourriture|manger|resto|restaurant|أكل|اكل|ماكلة|خضرة|خضر|غذاء|مطعم|سوق|courses|alimentation/.test(
      lower,
    )
  )
    return "nourriture";
  if (
    /santé|sante|صحة|طبيب|طبیب|دواء|دوا|pharmacie|médecin|medecin|hôpital|hopital|مستشفى|عيادة/.test(
      lower,
    )
  )
    return "sante";
  // Check matériel BEFORE logement: "matériel للدار" mentions الدار.
  if (
    /mat[ée]riel|materiel|meuble|أثاث|جهاز|أجهزة|تلفاز|ثلاجة|furniture|electromenager|électroménager/.test(
      lower,
    )
  )
    return "materiel";
  if (
    /logement|loyer|الدار|دار|كهرباء|الكهربا|l['’]electricit|electricit|sonelgaz|sonalgaz|ماء|eau|gaz|facture|كراء|سكن/.test(
      lower,
    )
  )
    return "logement";
  if (/famille|family|عائلة|عايلة|أولاد|اولاد|الوالد|الوالدة/.test(lower))
    return "famille";
  return "autre";
}

function detectKind(lower: string, category: TransactionCategory): TransactionKind {
  if (category === "salaire" || category === "vente") return "income";
  if (
    /ربحت|قبضت|دخلني|دخلت|received|got paid|reçu|recuper|touché|touché|encaissé/.test(
      lower,
    )
  )
    return "income";
  return "expense";
}

function hasSpendingIntent(lower: string): boolean {
  return /صرف|خلص|شر|اشتر|دفع|دفعت|spent|paid|bought|payé|paye|acheté|achete|dépens|depens|خلصت|شريت|صرفت/.test(
    lower,
  );
}

function isBalanceMention(lower: string): boolean {
  return /عندي|عندى|i\s+have|i've\s+got|i\s+got|j'ai|j’ai/.test(lower);
}

export function processUserMessage(text: string): ProcessResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const amount = extractAmount(trimmed);
  // Reply in the same language as the user input.
  const lang = detectLang(trimmed);
  const userMessage: ChatMessage = {
    id: makeId("m-u"),
    role: "user",
    text: trimmed,
  };

  // "I have X money" is information, NOT a transaction.
  if (amount !== null && isBalanceMention(lower) && !hasSpendingIntent(lower)) {
    return {
      userMessage,
      assistantMessage: {
        id: makeId("m-a"),
        role: "assistant",
        text: balanceReply(lang, formatDA(amount)),
        status: "none",
        lang,
        infoNote: "User mentioned available cash — not a transaction.",
      },
    };
  }

  const category = detectCategory(lower);
  const kind = detectKind(lower, category);

  if (amount !== null) {
    return {
      userMessage,
      assistantMessage: {
        id: makeId("m-a"),
        role: "assistant",
        text: storeReply(lang, kind, category, formatDA(amount)),
        status: "transaction",
        lang,
        transaction: {
          id: makeId("t"),
          kind,
          amount,
          currency: "DZD",
          category,
          confirmed: false,
        },
      },
    };
  }

  // Amount missing but intent/category present → gentle incomplete card.
  if (category !== "autre" || hasSpendingIntent(lower)) {
    return {
      userMessage,
      assistantMessage: {
        id: makeId("m-a"),
        role: "assistant",
        text: incompleteReply(lang, category),
        status: "incomplete",
        lang,
        transaction: {
          id: makeId("t"),
          kind,
          amount: 0,
          currency: "DZD",
          category,
          confirmed: false,
        },
      },
    };
  }

  // Nothing usable → ask for clarification, no card at all.
  return {
    userMessage,
    assistantMessage: {
      id: makeId("m-a"),
      role: "assistant",
      text: clarificationReply(lang),
      status: "clarification",
      lang,
    },
  };
}
