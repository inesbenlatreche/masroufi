"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
}

export default function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState("");
  const isEmpty = value.trim().length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-2"
      aria-label="Send a message"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tell me about your spending…"
        dir="auto"
        aria-label="Type a message about your spending"
        className="min-w-0 flex-1 rounded-full border border-line-200 bg-white px-4 py-2.5 text-sm leading-6 text-ink-800 placeholder:text-ink-500/70 focus:border-pine-600 focus-visible:ring-2 focus-visible:ring-pine-600"
      />
      <button
        type="submit"
        disabled={isEmpty}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-700 text-white hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
      >
        <Send size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
