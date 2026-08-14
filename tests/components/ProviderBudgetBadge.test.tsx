import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProviderBudgetBadge } from "@/components/providers/ProviderBudgetBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: string | { defaultValue?: string }) =>
      typeof options === "string" ? options : (options?.defaultValue ?? key),
  }),
}));

describe("ProviderBudgetBadge", () => {
  it("renders nothing when neither limit is exceeded", () => {
    const { container } = render(
      <ProviderBudgetBadge
        dailyUsage="1"
        dailyExceeded={false}
        monthlyUsage="1"
        monthlyExceeded={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the badge when the daily limit is exceeded", () => {
    render(
      <ProviderBudgetBadge
        dailyUsage="5"
        dailyLimit="1"
        dailyExceeded={true}
        monthlyUsage="5"
        monthlyExceeded={false}
      />,
    );
    expect(screen.getByText("超预算")).toBeInTheDocument();
  });

  it("includes both daily and monthly figures in the tooltip when both exceed", () => {
    render(
      <ProviderBudgetBadge
        dailyUsage="5"
        dailyLimit="1"
        dailyExceeded={true}
        monthlyUsage="50"
        monthlyLimit="10"
        monthlyExceeded={true}
      />,
    );
    const badge = screen.getByText("超预算").closest("div");
    expect(badge?.getAttribute("title")).toContain("$5.00 / $1.00");
    expect(badge?.getAttribute("title")).toContain("$50.00 / $10.00");
  });
});
