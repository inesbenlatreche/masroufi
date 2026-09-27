"use client";

import { useState } from "react";
import { ChevronDown, Info, X } from "lucide-react";

export default function Disclaimer() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-line-200 bg-sand-50 px-4 py-2">
      <div className="flex items-start gap-2">
        <Info
          size={14}
          aria-hidden="true"
          className="mt-1 shrink-0 text-ink-500"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded ? "Collapse usage note" : "Expand usage note"
          }
          className="flex flex-1 items-start gap-1 text-left focus-visible:ring-2 focus-visible:ring-pine-600"
        >
          <span className="flex-1 text-xs leading-5 text-ink-500">
            <span dir="auto">
              This is a budgeting helper, not financial or legal advice.
            </span>
            {expanded && (
              <span dir="auto" className="mt-1 block">
                Your entries stay in this session only for now. The assistant
                keeps simple spending notes — it doesn&apos;t give investment
                advice and can&apos;t access real bank accounts.
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`mt-1 shrink-0 text-ink-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss disclaimer"
          className="rounded-full p-1 text-ink-500 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-pine-600"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
