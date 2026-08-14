import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/components/usage/format";

interface ProviderBudgetBadgeProps {
  dailyUsage: string;
  dailyLimit?: string;
  dailyExceeded: boolean;
  monthlyUsage: string;
  monthlyLimit?: string;
  monthlyExceeded: boolean;
  className?: string;
}

/**
 * Provider budget-alert badge.
 * Renders nothing unless the daily or monthly spend limit has been exceeded.
 */
export function ProviderBudgetBadge({
  dailyUsage,
  dailyLimit,
  dailyExceeded,
  monthlyUsage,
  monthlyLimit,
  monthlyExceeded,
  className,
}: ProviderBudgetBadgeProps) {
  const { t } = useTranslation();

  if (!dailyExceeded && !monthlyExceeded) return null;

  const tooltipParts: string[] = [];
  if (dailyExceeded) {
    tooltipParts.push(
      `${t("providerAdvanced.limitDailyUsd", { defaultValue: "每日限额" })}: ${fmtUsd(dailyUsage, 2)} / ${fmtUsd(dailyLimit, 2)}`,
    );
  }
  if (monthlyExceeded) {
    tooltipParts.push(
      `${t("providerAdvanced.limitMonthlyUsd", { defaultValue: "每月限额" })}: ${fmtUsd(monthlyUsage, 2)} / ${fmtUsd(monthlyLimit, 2)}`,
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        "bg-red-500/10 text-red-600 dark:text-red-400",
        className,
      )}
      title={tooltipParts.join("\n")}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>
        {t("providerAdvanced.budgetExceeded", { defaultValue: "超预算" })}
      </span>
    </div>
  );
}
