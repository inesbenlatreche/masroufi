export type TransactionKind = "income" | "expense";

export type TransactionCategory =
  | "vente"
  | "salaire"
  | "transport"
  | "nourriture"
  | "logement"
  | "sante"
  | "famille"
  | "materiel"
  | "autre";

export type MessageStatus =
  | "transaction"
  | "incomplete"
  | "none"
  | "clarification";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  currency: "DZD";
  category: TransactionCategory;
  confirmed: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: MessageStatus;
  transaction?: Transaction;
  infoNote?: string;
  /** Input language this assistant message replies in. Defaults to "en". */
  lang?: AppLang;
}

export interface WeeklyInsight {
  headline: string;
  detail: string;
  topCategory?: TransactionCategory;
}

export type VoiceState = "idle" | "recording" | "processing" | "error";

/** Language used to render an assistant message: same as the user input. */
export type AppLang = "ar" | "fr" | "en";

/* ------------------------------------------------------------------ */
/* Backend (FastAPI) response types. The backend is the source of      */
/* truth for financial interpretation — these mirror its JSON shape.   */
/* Not every field is present for every status, hence the optionals.   */
/* ------------------------------------------------------------------ */

export type BackendStatus = "store" | "incomplete" | "clarification" | "discard";

export interface BackendTransactionPayload {
  type: "income" | "expense";
  amount: number;
  currency: "DZD";
  category: string;
}

export interface BackendResult {
  status: BackendStatus;
  reason?: string;
  transaction?: BackendTransactionPayload;
  confidence?: "high" | "low";
  original_text?: string;
}

export interface ProcessAudioResponse {
  transcript: string;
  result: BackendResult;
}

export interface StoredTransaction {
  status: "store";
  transaction: BackendTransactionPayload;
  confidence?: "high" | "low";
  original_text?: string;
}

export interface SummaryResponse {
  income: number;
  expense: number;
  net: number;
  transactions: StoredTransaction[];
}
