import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const checkProviderLimits = vi.fn().mockResolvedValue({
  providerId: "p1",
  dailyUsage: "0",
  dailyExceeded: false,
  monthlyUsage: "0",
  monthlyExceeded: false,
});

vi.mock("@/lib/api/usage", () => ({
  usageApi: {
    checkProviderLimits: (...args: unknown[]) => checkProviderLimits(...args),
  },
}));

import { useProviderLimits } from "@/lib/query/usage";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProviderLimits", () => {
  beforeEach(() => {
    checkProviderLimits.mockClear();
  });

  it("does not query when enabled option is false", () => {
    const { result } = renderHook(
      () => useProviderLimits("p1", "claude", { enabled: false }),
      { wrapper },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(checkProviderLimits).not.toHaveBeenCalled();
  });

  it("queries when enabled option is true and ids are present", () => {
    renderHook(() => useProviderLimits("p1", "claude", { enabled: true }), {
      wrapper,
    });
    expect(checkProviderLimits).toHaveBeenCalledWith("p1", "claude");
  });

  it("defaults to enabled when no options are passed", () => {
    renderHook(() => useProviderLimits("p1", "claude"), { wrapper });
    expect(checkProviderLimits).toHaveBeenCalledWith("p1", "claude");
  });
});
