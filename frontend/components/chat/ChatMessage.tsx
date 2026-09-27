"use client";

import MissingAmountCard from "@/components/transactions/MissingAmountCard";
import TransactionCard from "@/components/transactions/TransactionCard";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface Props {
  message: ChatMessageType;
  onConfirmTransaction: (transactionId: string) => void;
  onSaveAmount: (transactionId: string, amount: number) => void;
}

export default function ChatMessageView({
  message,
  onConfirmTransaction,
  onSaveAmount,
}: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-pine-700 px-4 py-2.5 text-sm leading-6 text-white">
          <p dir="auto">{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-line-200 bg-white px-4 py-2.5 text-sm leading-6 text-ink-800">
        <p dir="auto">{message.text}</p>
        {message.status === "transaction" && message.transaction && (
          <TransactionCard
            transaction={message.transaction}
            lang={message.lang ?? "en"}
            onConfirm={() =>
              onConfirmTransaction(message.transaction!.id)
            }
            onSaveAmount={(amount) =>
              onSaveAmount(message.transaction!.id, amount)
            }
          />
        )}
        {message.status === "incomplete" && message.transaction && (
          <MissingAmountCard
            transaction={message.transaction}
            lang={message.lang ?? "en"}
            onSave={(amount) =>
              onSaveAmount(message.transaction!.id, amount)
            }
          />
        )}
      </div>
    </div>
  );
}
