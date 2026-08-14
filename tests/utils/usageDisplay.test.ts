// 时区断言必须先于任何 Date 使用固定，否则 CI（通常为 UTC）结果会与本地开发机不一致。
process.env.TZ = "Asia/Bangkok"; // UTC+7，无夏令时

import { describe, expect, it } from "vitest";
import { formatUsageDataSummary, formatUsageExtra } from "@/utils/usageDisplay";

const labels = {
  invalid: "Invalid",
  remaining: "Remaining:",
  used: "Used:",
};

describe("formatUsageDataSummary", () => {
  it("formats used percentage when remaining is omitted", () => {
    expect(
      formatUsageDataSummary(
        {
          planName: "Coco OpenRouter",
          used: 55,
          total: 100,
          unit: "%",
        },
        labels,
      ),
    ).toBe("[Coco OpenRouter] Used: 55%");
  });

  it("formats remaining when present", () => {
    expect(
      formatUsageDataSummary(
        {
          planName: "Balance",
          remaining: 12.5,
          unit: "USD",
        },
        labels,
      ),
    ).toBe("[Balance] Remaining: 12.50 USD");
  });

  it("formats invalid results without requiring quota fields", () => {
    expect(
      formatUsageDataSummary(
        {
          isValid: false,
          invalidMessage: "Unauthorized",
        },
        labels,
      ),
    ).toBe("Unauthorized");
  });

  it("renders an ISO reset time in extra as local time", () => {
    const summary = formatUsageDataSummary(
      { planName: "five_hour", extra: "2026-07-30T07:29:59.935706+00:00" },
      labels,
      "en",
    );

    expect(summary).not.toContain("2026-07-30T07:29:59.935706+00:00");
    expect(summary).toMatch(/2:29:59/); // 07:29:59 UTC → 14:29:59 (UTC+7)
  });
});

describe("formatUsageExtra", () => {
  it("converts UTC reset timestamps to local time", () => {
    // 只断言时分秒，避开不同 ICU 版本在 AM/PM 前用普通空格或窄空格的差异
    expect(formatUsageExtra("2026-07-30T07:29:59.935706+00:00", "en")).toMatch(
      /2:29:59/,
    );
    expect(formatUsageExtra("2026-07-30T07:29:59Z", "en")).toMatch(/2:29:59/);
    expect(formatUsageExtra("2026-07-30 07:29:59+00:00", "en")).toMatch(
      /2:29:59/,
    );
  });

  it("shifts the date when the local offset crosses midnight", () => {
    // 08-03 23:59:59 UTC → 08-04 06:59:59 (UTC+7)
    const result = formatUsageExtra("2026-08-03T23:59:59.935730+00:00", "en");
    expect(result).toMatch(/8\/4\/2026/);
    expect(result).toMatch(/6:59:59/);
  });

  it("leaves free-form text untouched", () => {
    expect(formatUsageExtra("expires 2026-01-01")).toBe("expires 2026-01-01");
    expect(formatUsageExtra("Gói tháng còn 12 ngày")).toBe(
      "Gói tháng còn 12 ngày",
    );
    expect(formatUsageExtra("")).toBe("");
  });

  it("leaves unparseable date-shaped strings untouched", () => {
    expect(formatUsageExtra("2026-13-45T99:99:99Z")).toBe(
      "2026-13-45T99:99:99Z",
    );
  });
});
