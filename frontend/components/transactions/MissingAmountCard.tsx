"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categories";
import { cardStrings, categoryName } from "@/lib/i18n";
import type { AppLang, Transaction } from "@/lib/types";

interface Props {
  transaction: Transaction;
  lang?: AppLang;
  onSave: (amount: number) => void;
}

export default function MissingAmountCard({
  transaction,
  lang = "en",
  onSave,
}: Props) {
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");
  const Icon = CATEGORY_ICONS[transaction.category];
  const label = categoryName(lang, transaction.category);
  const t = cardStrings(lang);
  const inputId = `add-amount-${transaction.id}`;
  const parsed = Number(draft);
  const isValid = Number.isFinite(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(Math.round(parsed));
    setShowInput(false);
    setDraft("");
  };

  return (
    <div className="mt-2.5 rounded-xl border border-dashed border-clay-500/60 bg-sand-50 p-3">
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
            {t.amountMissing}
          </p>
        </div>
      </div>

      {showInput ? (
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
              placeholder={t.amountPlaceholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setShowInput(false);
                  setDraft("");
                }
              }}
              className="w-full min-w-0 rounded-lg border border-line-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-ink-800 placeholder:text-ink-500/60 focus-visible:ring-2 focus-visible:ring-pine-600"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="shrink-0 rounded-full bg-pine-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
            >
              {t.save}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="mt-2.5 flex items-center gap-1 rounded-full border border-line-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-pine-600"
        >
          <Plus size={12} aria-hidden="true" /> {t.addAmount}
        </button>
      )}
    </div>
  );
}
