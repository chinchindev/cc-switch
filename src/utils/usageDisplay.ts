import type { UsageData } from "@/types";

interface UsageSummaryLabels {
  invalid: string;
  remaining: string;
  used: string;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatValue(value: number, unit?: string): string {
  if (!unit) {
    return formatNumber(value);
  }

  return unit === "%"
    ? `${formatNumber(value)}%`
    : `${formatNumber(value)} ${unit}`;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 匹配整串为 ISO 8601 / RFC 3339 日期时间的 extra（如重置时间）。
 * 只在整串匹配时转换，避免把 "expires 2026-01-01" 这类自由文本改写掉。
 */
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * 用量脚本返回的 extra 常见为 UTC 的重置时间字符串。
 * 整串是日期时间时按本机时区渲染；其它自由文本原样返回。
 */
export function formatUsageExtra(extra: string, locale?: string): string {
  const trimmed = extra.trim();
  if (!ISO_DATETIME_RE.test(trimmed)) {
    return extra;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? extra : date.toLocaleString(locale);
}

function formatUsed(
  data: UsageData,
  labels: UsageSummaryLabels,
): string | null {
  if (!isNumber(data.used)) {
    return null;
  }

  if (isNumber(data.total) && data.total > 0) {
    const usedPercent = (data.used / data.total) * 100;

    if (data.unit === "%" && data.total === 100) {
      return `${labels.used} ${formatValue(data.used, "%")}`;
    }

    return `${labels.used} ${formatNumber(usedPercent)}%`;
  }

  return `${labels.used} ${formatValue(data.used, data.unit)}`;
}

export function formatUsageDataSummary(
  data: UsageData,
  labels: UsageSummaryLabels,
  locale?: string,
): string {
  const planPrefix = data.planName ? `[${data.planName}] ` : "";

  if (data.isValid === false) {
    return `${planPrefix}${data.invalidMessage || labels.invalid}`;
  }

  const parts = [
    formatUsed(data, labels),
    isNumber(data.remaining)
      ? `${labels.remaining} ${formatValue(data.remaining, data.unit)}`
      : null,
    data.extra ? formatUsageExtra(data.extra, locale) : null,
  ].filter((part): part is string => Boolean(part));

  return `${planPrefix}${parts.join(" / ") || labels.invalid}`;
}
