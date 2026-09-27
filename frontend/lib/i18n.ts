import { CATEGORY_LABELS } from "@/lib/categories";
import type { AppLang, TransactionCategory } from "@/lib/types";

/**
 * Reply in the user's own language: detect it from the input text, then
 * render assistant messages (and cards) in Darija/Arabic, French, or English.
 * Amounts always keep Western digits + "DA", as commonly written in Algeria.
 */

export function detectLang(text: string): AppLang {
  // Arabic script (Darija/Arabic, the usual Hadra ASR output) → Darija reply.
  if (/[؀-ۿ]/.test(text)) return "ar";
  const lower = text.toLowerCase();
  // French diacritics are a dead giveaway.
  if (/[éèêëàâäçîïôöûüùÿœæ]/.test(lower)) return "fr";
  // Common French function/content words.
  if (
    /\b(je|tu|vous|nous|j'ai|merci|combien|argent|facture|loyer|avec|pour|dans|mois|semaine|quand|quoi|oui|c'est|mon|ma|mes|notre|votre)\b/.test(
      lower,
    )
  )
    return "fr";
  // Arabizi (Darija in Latin script) → Darija reply.
  if (
    /\b(rani|rane|ana|rak|sarf|sarfet|khlas|khalas|chrit|chret|drahem|dinars?|bzef|bzaf|bezaf|wach|wech|kifech|kifach|hadi|hadik|haja|dar|taxi|makla|sahbi|khoya|souk|khedma)\b/.test(
      lower,
    )
  )
    return "ar";
  return "en";
}

export const CATEGORY_EMOJI: Record<TransactionCategory, string> = {
  vente: "💰",
  salaire: "💼",
  transport: "🚕",
  nourriture: "🛒",
  logement: "💡",
  sante: "💊",
  famille: "👪",
  materiel: "🪑",
  autre: "🧾",
};

const AR_CATEGORY_NAMES: Record<TransactionCategory, string> = {
  vente: "بيع",
  salaire: "الراتب",
  transport: "النقل",
  nourriture: "الأكل",
  logement: "السكن",
  sante: "الصحة",
  famille: "العائلة",
  materiel: "التجهيزات",
  autre: "أخرى",
};

export function categoryName(
  lang: AppLang,
  category: TransactionCategory,
): string {
  if (lang === "ar") return AR_CATEGORY_NAMES[category];
  return CATEGORY_LABELS[category];
}

/** "Does this look right?" line used above card buttons and after edits. */
export function confirmLine(lang: AppLang): string {
  if (lang === "ar") return "صحيحة هكذا؟";
  if (lang === "fr") return "Ça semble bon ?";
  return "Does this look right?";
}

export function storeReply(
  lang: AppLang,
  kind: "income" | "expense",
  category: TransactionCategory,
  amountText: string,
): string {
  const head = `${CATEGORY_EMOJI[category]} ${categoryName(lang, category)} — ${amountText}`;
  if (lang === "ar")
    return kind === "income"
      ? `${head} — سجلتها كمدخول. صحيحة هكذا؟`
      : `${head} — سجلتها. صحيحة هكذا؟`;
  if (lang === "fr")
    return kind === "income"
      ? `${head} — noté comme revenu. Ça semble bon ?`
      : `${head} — noté. Ça semble bon ?`;
  return kind === "income"
    ? `${head} — noted as income. Does this look right?`
    : `${head} — logged. Does this look right?`;
}

export function incompleteReply(
  lang: AppLang,
  category: TransactionCategory,
): string {
  const label = categoryName(lang, category);
  const name = lang === "ar" ? label : label.toLowerCase();
  if (lang === "ar")
    return `فهمتك — تبان ${name}، بصح ما عرفتش المبلغ. زيدو كي توجد 🙂`;
  if (lang === "fr")
    return `Compris — ça ressemble à ${name}, mais je n'ai pas saisi le montant. Ajoute-le quand tu veux 🙂`;
  return `Got it — looks like ${name}, but I didn't catch an amount. Add it when you're ready 🙂`;
}

export function clarificationReply(lang: AppLang): string {
  if (lang === "ar") return "ما فهمتش مليح — تعاود تقولّي المبلغ وعلى واش؟ 🙂";
  if (lang === "fr")
    return "Je n'ai pas bien compris — tu peux me redonner le montant et c'était pour quoi ? 🙂";
  return "I didn't quite catch that — how much was it, and what was it for? 🙂";
}

export function discardReply(lang: AppLang): string {
  if (lang === "ar")
    return "فهمتك 🙂 بصح هذي ماشي مصروف وماشي مدخول، ما سجلت والو. قولّي كي تصرف ولا يدخلّك شي!";
  if (lang === "fr")
    return "Noté 🙂 Ça ne ressemble ni à un revenu ni à une dépense, donc je n'ai rien enregistré. Dis-moi quand tu dépenses ou reçois quelque chose !";
  return "Noted 🙂 That doesn't look like income or spending, so I didn't log it. Tell me when you spend or receive something!";
}

/** "I have X money" info reply — available cash, not a transaction. */
export function balanceReply(lang: AppLang, amountText: string): string {
  if (lang === "ar") return `عندك ${amountText} متوفرة. واش حاب تدير بيها؟`;
  if (lang === "fr")
    return `Tu as ${amountText} de disponible. Tu veux en faire quoi ?`;
  return `You have ${amountText} available. What would you like to do with it?`;
}

export interface CardStrings {
  kindIncome: string;
  kindExpense: string;
  looksRight: string;
  edit: string;
  save: string;
  cancel: string;
  confirmed: string;
  amountMissing: string;
  addAmount: string;
  amountPlaceholder: string;
  amountAria: string;
}

export function cardStrings(lang: AppLang): CardStrings {
  if (lang === "ar")
    return {
      kindIncome: "مدخول",
      kindExpense: "مصروف",
      looksRight: "صحيحة",
      edit: "عدّل",
      save: "سجّل",
      cancel: "ألغِ",
      confirmed: "تم التأكيد",
      amountMissing: "المبلغ: غير مذكور",
      addAmount: "زيد المبلغ",
      amountPlaceholder: "المبلغ بـ DA",
      amountAria: "المبلغ بـ DA",
    };
  if (lang === "fr")
    return {
      kindIncome: "Revenu",
      kindExpense: "Dépense",
      looksRight: "C'est bon",
      edit: "Modifier",
      save: "Enregistrer",
      cancel: "Annuler",
      confirmed: "Confirmé",
      amountMissing: "Montant : non précisé",
      addAmount: "Ajouter le montant",
      amountPlaceholder: "Montant en DA",
      amountAria: "Montant en DA",
    };
  return {
    kindIncome: "Income",
    kindExpense: "Expense",
    looksRight: "Looks right",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    confirmed: "Confirmed",
    amountMissing: "Amount: Not specified",
    addAmount: "Add amount",
    amountPlaceholder: "Amount in DA",
    amountAria: "Amount in DA",
  };
}
