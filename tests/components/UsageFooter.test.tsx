// 该文件断言"重置时间按本机时区渲染"，必须先于任何 Date 使用固定时区，
// 否则 CI（通常为 UTC）与本地开发机的结果会不一致。
process.env.TZ = "Asia/Bangkok"; // UTC+7，无夏令时

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UsageFooter from "@/components/UsageFooter";
import type { Provider, UsageData } from "@/types";

const useUsageQueryMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
    i18n: {
      resolvedLanguage: "en",
      language: "en",
    },
  }),
}));

vi.mock("@/lib/query/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/query/queries")>(
    "@/lib/query/queries",
  );
  return {
    ...actual,
    useUsageQuery: (...args: unknown[]) => useUsageQueryMock(...args),
  };
});

/** Anthropic 官方额度接口返回的重置时间：始终为 UTC */
const FIVE_HOUR_RESET_UTC = "2026-07-30T07:29:59.935706+00:00";
const SEVEN_DAY_RESET_UTC = "2026-08-03T23:59:59.935730+00:00";

const provider: Provider = {
  id: "claude-official",
  name: "Claude Official",
  settingsConfig: {},
};

function mockUsage(data: UsageData[]) {
  useUsageQueryMock.mockReturnValue({
    data: { success: true, data },
    isFetching: false,
    isError: false,
    lastQueriedAt: Date.now(),
    refetch: vi.fn(),
  });
}

function renderFooter() {
  return render(
    <UsageFooter
      provider={provider}
      providerId={provider.id}
      appId="claude"
      usageEnabled
      isCurrent
      inline={false}
    />,
  );
}

describe("UsageFooter plan reset time", () => {
  it("renders the reset time in local time instead of the raw UTC string", () => {
    mockUsage([
      {
        planName: "five_hour",
        extra: FIVE_HOUR_RESET_UTC,
        total: 100,
        used: 7,
        remaining: 93,
        unit: "%",
      },
      {
        planName: "seven_day",
        extra: SEVEN_DAY_RESET_UTC,
        total: 100,
        used: 31,
        remaining: 69,
        unit: "%",
      },
    ]);

    renderFooter();

    // 回归护栏：原始 UTC ISO 串不得再出现在界面上
    expect(screen.queryByText(FIVE_HOUR_RESET_UTC)).toBeNull();
    expect(screen.queryByText(SEVEN_DAY_RESET_UTC)).toBeNull();

    // 07:29:59 UTC → 14:29:59 (UTC+7)；03日 23:59:59 UTC → 04日 06:59:59
    // 只断言时分秒，避开不同 ICU 版本在 AM/PM 前用普通空格或窄空格的差异
    expect(screen.getByText(/2:29:59/)).toBeInTheDocument();
    expect(screen.getByText(/6:59:59/)).toBeInTheDocument();
  });

  it("leaves free-form extra text untouched", () => {
    const freeText = "Gói tháng còn 12 ngày";
    mockUsage([
      { planName: "monthly", extra: freeText, total: 100, used: 10 },
      { planName: "credits", extra: "expires 2026-01-01", total: 50, used: 5 },
    ]);

    renderFooter();

    expect(screen.getByText(freeText)).toBeInTheDocument();
    expect(screen.getByText("expires 2026-01-01")).toBeInTheDocument();
  });
});
