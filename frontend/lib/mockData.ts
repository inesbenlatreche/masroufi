import type {
  ChatMessage,
  Transaction,
  WeeklyInsight,
} from "@/lib/types";

export const mockTransactions: Transaction[] = [
  {
    id: "t-transport-500",
    kind: "expense",
    amount: 500,
    currency: "DZD",
    category: "transport",
    confirmed: true,
  },
  {
    id: "t-logement-3000",
    kind: "expense",
    amount: 3000,
    currency: "DZD",
    category: "logement",
    confirmed: true,
  },
  {
    id: "t-materiel-4500",
    kind: "expense",
    amount: 4500,
    currency: "DZD",
    category: "materiel",
    confirmed: true,
  },
];

export const mockWeeklyInsight: WeeklyInsight = {
  headline: "Your week so far",
  detail:
    "You've logged 8,000 DA across 3 expenses. Housing is your biggest spend this week.",
  topCategory: "logement",
};

/**
 * Seed conversation mixing Darija / Arabic / French, exactly the cases the
 * brief calls for: three confirmed expenses, one incomplete (no amount),
 * and one "I have money" note that is NOT a transaction.
 */
export const mockMessages: ChatMessage[] = [
  {
    id: "m-u1",
    role: "user",
    text: "راني صرفت 500 دينار فالطاكسي",
  },
  {
    id: "m-a1",
    role: "assistant",
    text: "🚕 Transport — 500 DA — logged. Nice, you're keeping track!",
    status: "transaction",
    transaction: mockTransactions[0],
  },
  {
    id: "m-u2",
    role: "user",
    text: "خلصت 3000 دينار على l'électricité",
  },
  {
    id: "m-a2",
    role: "assistant",
    text: "💡 Logement — 3,000 DA — saved. Utility bills add up, well done noting it.",
    status: "transaction",
    transaction: mockTransactions[1],
  },
  {
    id: "m-u3",
    role: "user",
    text: "شريت matériel للدار ب 4500 دينار",
  },
  {
    id: "m-a3",
    role: "assistant",
    text: "🪑 Matériel — 4,500 DA — recorded. Home stuff counts too.",
    status: "transaction",
    transaction: mockTransactions[2],
  },
  {
    id: "m-u4",
    role: "user",
    text: "صرفـت شوية دراهم على الدار",
  },
  {
    id: "m-a4",
    role: "assistant",
    text: "Looks like housing, but I didn't catch an amount. Add it when you're ready 🙂",
    status: "incomplete",
    transaction: {
      id: "t-logement-open",
      kind: "expense",
      amount: 0,
      currency: "DZD",
      category: "logement",
      confirmed: false,
    },
  },
  {
    id: "m-u5",
    role: "user",
    text: "عندي 5000 دينار",
  },
  {
    id: "m-a5",
    role: "assistant",
    text: "You have 5,000 DA available. What would you like to do with it?",
    status: "none",
    infoNote: "User mentioned available cash — not a transaction.",
  },
];
