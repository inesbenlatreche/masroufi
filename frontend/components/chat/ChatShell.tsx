"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageView from "@/components/chat/ChatMessage";
import VoiceButton from "@/components/chat/VoiceButton";
import WeeklyInsightCard from "@/components/insights/WeeklyInsightCard";
import Disclaimer from "@/components/onboarding/Disclaimer";
import { getSummary } from "@/lib/api";
import {
  categoryName,
  clarificationReply,
  confirmLine,
  detectLang,
  discardReply,
  incompleteReply,
  storeReply,
} from "@/lib/i18n";
import { mockMessages, mockWeeklyInsight } from "@/lib/mockData";
import { formatDA, processUserMessage } from "@/lib/mockProcess";
import type {
  AppLang,
  ChatMessage,
  ProcessAudioResponse,
  SummaryResponse,
  TransactionCategory,
  WeeklyInsight,
} from "@/lib/types";

const KNOWN_CATEGORIES: TransactionCategory[] = [
  "vente",
  "salaire",
  "transport",
  "nourriture",
  "logement",
  "sante",
  "famille",
  "materiel",
  "autre",
];

function normalizeCategory(raw: unknown): TransactionCategory {
  return typeof raw === "string" &&
    (KNOWN_CATEGORIES as string[]).includes(raw)
    ? (raw as TransactionCategory)
    : "autre";
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** Map a GET /summary payload onto the existing insight UI. */
function toWeeklyInsight(summary: SummaryResponse): WeeklyInsight {
  const stored = summary.transactions ?? [];
  if (stored.length === 0) {
    return {
      headline: "Your week so far",
      detail:
        "No transactions yet — tap the mic and tell me about your spending 🙂",
    };
  }
  // Top category by expense volume (falls back to any volume for icon).
  const totals = new Map<string, number>();
  for (const item of stored) {
    const txn = item.transaction;
    if (!txn) continue;
    totals.set(
      txn.category,
      (totals.get(txn.category) ?? 0) + (txn.amount || 0),
    );
  }
  let topCategory: TransactionCategory | undefined;
  let best = -1;
  for (const [category, total] of totals) {
    if (total > best) {
      best = total;
      topCategory = normalizeCategory(category);
    }
  }
  const count = stored.length;
  return {
    headline: "Your week so far",
    detail: `${formatDA(summary.income)} in · ${formatDA(summary.expense)} out · net ${formatDA(summary.net)} across ${count} transaction${count === 1 ? "" : "s"}.`,
    topCategory,
  };
}

export default function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [insight, setInsight] = useState<WeeklyInsight>(mockWeeklyInsight);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const refreshSummary = useCallback(async () => {
    try {
      const summary = await getSummary();
      setInsight(toWeeklyInsight(summary));
    } catch {
      // Backend offline or summary unavailable — keep the current insight.
    }
  }, []);

  // Load the real summary when the backend is up; otherwise the seeded
  // mock insight stays as the initial UI.
  useEffect(() => {
    let cancelled = false;
    getSummary()
      .then((summary) => {
        if (!cancelled) setInsight(toWeeklyInsight(summary));
      })
      .catch(() => {
        // Backend offline — keep the seeded insight.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Text input stays on local mock logic for now — /process expects audio.
  // When a text endpoint exists, route through it here (same seam).
  const appendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { userMessage, assistantMessage } = processUserMessage(trimmed);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
  };

  /** Map a backend /process response onto the existing chat UI. */
  const handleVoiceResult = useCallback(
    async (response: ProcessAudioResponse) => {
      const result = response.result;
      const transcript =
        response.transcript?.trim() || result.original_text?.trim() || "";

      const userMessage: ChatMessage = {
        id: makeId("m-u"),
        role: "user",
        text: transcript || "🎤 (no speech recognized)",
      };

      const payload = result.transaction;
      const category = normalizeCategory(payload?.category);
      const kind = payload?.type === "income" ? "income" : "expense";
      const amount =
        typeof payload?.amount === "number" && payload.amount > 0
          ? Math.round(payload.amount)
          : 0;
      // Reply in the same language as the recognized speech.
      const lang = detectLang(transcript);

      let assistantMessage: ChatMessage;

      if (result.status === "store" && amount > 0) {
        assistantMessage = {
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
        };
      } else if (result.status === "incomplete" || (result.status === "store" && amount === 0)) {
        assistantMessage = {
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
        };
      } else if (result.status === "clarification") {
        assistantMessage = {
          id: makeId("m-a"),
          role: "assistant",
          text: clarificationReply(lang),
          status: "clarification",
          lang,
        };
      } else {
        // discard: not a financial transaction — never a card.
        assistantMessage = {
          id: makeId("m-a"),
          role: "assistant",
          text: discardReply(lang),
          status: "none",
          lang,
          infoNote: result.reason
            ? `Backend discarded the statement (${result.reason}).`
            : "Backend discarded the statement — not a transaction.",
        };
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Single summary refresh after a stored transaction — no polling.
      if (assistantMessage.status === "transaction") {
        await refreshSummary();
      }
    },
    [refreshSummary],
  );

  const handleVoiceError = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("m-a"),
        role: "assistant",
        text: message,
        status: "clarification",
      },
    ]);
  }, []);

  const handleConfirm = (transactionId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.transaction?.id === transactionId
          ? { ...m, transaction: { ...m.transaction, confirmed: true } }
          : m,
      ),
    );
  };

  const handleSaveAmount = (transactionId: string, amount: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.transaction?.id !== transactionId) return m;
        const lang: AppLang = m.lang ?? "en";
        const label = categoryName(lang, m.transaction.category);
        return {
          ...m,
          status: "transaction" as const,
          text: `${label} — ${formatDA(amount)} — ${confirmLine(lang)}`,
          transaction: { ...m.transaction, amount, confirmed: false },
        };
      }),
    );
  };

  return (
    <div className="flex min-h-dvh justify-center bg-sand-100 sm:px-4 sm:py-6">
      <div className="flex h-dvh w-full max-w-[560px] flex-col overflow-hidden bg-sand-50 sm:h-[calc(100dvh-3rem)] sm:max-h-[920px] sm:rounded-2xl sm:border sm:border-line-200 sm:shadow-sm">
        {/* Header — one row, minimal */}
        <header className="flex items-center gap-3 border-b border-line-200 bg-sand-50 px-4 py-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-700 text-lg font-bold text-white"
          >
            خ
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5 text-ink-800">
              Masroufi
            </p>
            <p className="text-xs leading-4 text-ink-500">
              Your budget companion
            </p>
          </div>
          <button
            type="button"
            aria-label="Open settings and privacy"
            title="Settings (coming soon)"
            className="rounded-full p-2 text-ink-500 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </header>

        <Disclaimer />

        {/* Weekly insight strip — subtle, non-dominant */}
        <div className="px-4 pt-3">
          <WeeklyInsightCard insight={insight} />
        </div>

        {/* Conversation */}
        <div
          ref={scrollRef}
          role="log"
          aria-label="Conversation"
          className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4"
        >
          {messages.map((message) => (
            <ChatMessageView
              key={message.id}
              message={message}
              onConfirmTransaction={handleConfirm}
              onSaveAmount={handleSaveAmount}
            />
          ))}
        </div>

        {/* Composer — voice first, then text input */}
        <footer className="border-t border-line-200 bg-sand-50 px-4 pb-4 pt-3">
          <div className="flex flex-col items-center gap-3">
            <VoiceButton
              onResult={(response) => void handleVoiceResult(response)}
              onError={handleVoiceError}
            />
            <ChatInput onSend={appendText} />
          </div>
        </footer>
      </div>
    </div>
  );
}
