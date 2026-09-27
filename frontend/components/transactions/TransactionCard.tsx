"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categories";
import { cardStrings, categoryName, confirmLine } from "@/lib/i18n";
import type { AppLang, Transaction } from "@/lib/types";

interface Props {
  transaction: Transaction;
  lang?: AppLang;
  onConfirm: () => void;
  onSaveAmount: (amount: number) => void;
}

export default function TransactionCard({
  transaction,
  lang = "en",
  onConfirm,
  onSaveAmount,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(transaction.amount));
  const Icon = CATEGORY_ICONS[transaction.category];
  const label = categoryName(lang, transaction.category);
  const t = cardStrings(lang);
  const inputId = `edit-amount-${transaction.id}`;
  const parsed = Number(draft);
  const isValid = Number.isFinite(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSaveAmount(Math.round(parsed));
    setIsEditing(false);
  };

  return (
    <div className="mt-2.5 rounded-xl border border-line-200 bg-sand-50 p-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-pine-700"
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-ink-800">
            {label}
          </p>
          <p className="text-xs leading-4 text-ink-500">
            {transaction.kind === "income" ? t.kindIncome : t.kindExpense}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-ink-800">
          {transaction.amount.toLocaleString("en-US")} DA
        </p>
      </div>

      {transaction.confirmed ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-pine-600">
          <Check size={14} aria-hidden="true" /> {t.confirmed}
        </p>
      ) : isEditing ? (
        <div className="mt-2.5">
          <label htmlFor={inputId} className="sr-only">
            {t.amountAria}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              type="number"
              min={1}
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setDraft(String(transaction.amount));
                }
              }}
              className="w-full min-w-0 rounded-lg border border-line-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-ink-800 focus-visible:ring-2 focus-visible:ring-pine-600"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="shrink-0 rounded-full bg-pine-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraft(String(transaction.amount));
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-pine-600"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          <p dir="auto" className="text-xs leading-5 text-ink-500">
            {confirmLine(lang)}
          </p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-pine-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-pine-900 focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
            >
              {t.looksRight}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(String(transaction.amount));
                setIsEditing(true);
              }}
              className="flex items-center gap-1 rounded-full border border-line-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-pine-600"
            >
              <Pencil size={12} aria-hidden="true" /> {t.edit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
