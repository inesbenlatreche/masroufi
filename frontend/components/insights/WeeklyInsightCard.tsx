import { PiggyBank } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categories";
import type { WeeklyInsight } from "@/lib/types";

export default function WeeklyInsightCard({
  insight,
}: {
  insight: WeeklyInsight;
}) {
  const Icon = insight.topCategory
    ? CATEGORY_ICONS[insight.topCategory]
    : PiggyBank;

  return (
    <section
      aria-label="Weekly summary"
      className="flex items-start gap-3 rounded-xl border border-line-200 bg-white px-3.5 py-2.5"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-pine-700"
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-5 text-ink-800">
          {insight.headline}
        </p>
        <p dir="auto" className="text-xs leading-5 text-ink-500">
          {insight.detail}
        </p>
      </div>
    </section>
  );
}
