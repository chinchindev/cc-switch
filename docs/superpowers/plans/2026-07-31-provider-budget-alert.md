# Provider Budget Alert UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the UI for provider spending-limit alerts — the backend (`check_provider_limits`, `ProviderMeta.limit_daily_usd/limit_monthly_usd`) already exists and works; this plan adds the missing TypeScript type fields, the budget-input form section, and a read-only over-budget badge on `ProviderCard`.

**Architecture:** Pure frontend wiring, no Rust changes. `ProviderMeta` (TS) gains two optional string fields → `ProviderAdvancedConfig` gets a new always-visible "Budget" section (parallel to the existing collapsible pricing section, but not collapsible itself) → `ProviderForm` holds `budgetConfig` state, validates it, and includes it in the save payload → a new `ProviderBudgetBadge` component (props-only, no fetching) renders next to `ProviderHealthBadge` on `ProviderCard`, fed by the already-existing `useProviderLimits` hook (extended to accept an `enabled` option so it only queries when a provider actually has a limit set).

**Tech Stack:** React + TypeScript, react-i18next, TanStack Query, vitest + @testing-library/react.

---

## Reference: spec

Full design rationale lives in `docs/superpowers/specs/2026-07-31-provider-budget-alert-design.md`. This plan implements it exactly; consult it if a step here seems ambiguous.

---

### Task 1: `ProviderMeta` type fields

**Files:**
- Modify: `src/types.ts:188-192`

- [ ] **Step 1: Add the two fields**

In `src/types.ts`, the `ProviderMeta` interface currently has (around line 188-192):

```ts
  partnerPromotionKey?: string;
  // 供应商成本倍率
  costMultiplier?: string;
  // 供应商计费模式来源
  pricingModelSource?: string;
```

Insert two new fields immediately after `pricingModelSource?: string;`:

```ts
  partnerPromotionKey?: string;
  // 供应商成本倍率
  costMultiplier?: string;
  // 供应商计费模式来源
  pricingModelSource?: string;
  // 每日消费限额（USD）
  limitDailyUsd?: string;
  // 每月消费限额（USD）
  limitMonthlyUsd?: string;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no consumers reference these fields yet, so this is a pure addition — nothing should break)

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add limitDailyUsd/limitMonthlyUsd to ProviderMeta"
```

---

### Task 2: extend `useProviderLimits` with an `enabled` option

**Files:**
- Modify: `src/lib/query/usage.ts:349-355`

- [ ] **Step 1: Write the failing test**

Create `tests/hooks/useProviderLimits.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/hooks/useProviderLimits.test.tsx`
Expected: FAIL — first test fails because current `useProviderLimits` ignores the third argument and always queries (or a TS error if strict about the extra arg).

- [ ] **Step 3: Update the hook**

In `src/lib/query/usage.ts`, replace lines 349-355:

```ts
export function useProviderLimits(providerId: string, appType: string) {
  return useQuery({
    queryKey: usageKeys.limits(providerId, appType),
    queryFn: () => usageApi.checkProviderLimits(providerId, appType),
    enabled: !!providerId && !!appType,
  });
}
```

with:

```ts
export function useProviderLimits(
  providerId: string,
  appType: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: usageKeys.limits(providerId, appType),
    queryFn: () => usageApi.checkProviderLimits(providerId, appType),
    enabled: !!providerId && !!appType && (options?.enabled ?? true),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/hooks/useProviderLimits.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/query/usage.ts tests/hooks/useProviderLimits.test.tsx
git commit -m "feat(query): let useProviderLimits accept an enabled option"
```

---

### Task 3: i18n keys — all 5 locales

**Files:**
- Modify: `src/i18n/locales/en.json:1283-1295`
- Modify: `src/i18n/locales/vi.json:2952-2964`
- Modify: `src/i18n/locales/zh.json:1283-1295`
- Modify: `src/i18n/locales/zh-TW.json:1254-1266`
- Modify: `src/i18n/locales/ja.json:1283-1295`

Each file has an existing `"providerAdvanced": { ... }` block ending with `"pricingModelSourceHint": "..."` followed by `},`. Add 9 new keys right after `pricingModelSourceHint` in every file (keep them last in the block, before the closing `},`).

- [ ] **Step 1: en.json**

In `src/i18n/locales/en.json`, change lines 1293-1295 from:

```json
    "pricingModelSourceResponse": "Response model",
    "pricingModelSourceHint": "Choose whether to match pricing by request model or response model"
  },
```

to:

```json
    "pricingModelSourceResponse": "Response model",
    "pricingModelSourceHint": "Choose whether to match pricing by request model or response model",
    "budgetConfig": "Budget",
    "budgetConfigDesc": "Set spending limits for this provider; shows a warning badge when exceeded (does not block requests).",
    "limitDailyUsd": "Daily Limit (USD)",
    "limitDailyUsdPlaceholder": "Leave empty for no limit",
    "limitMonthlyUsd": "Monthly Limit (USD)",
    "limitMonthlyUsdPlaceholder": "Leave empty for no limit",
    "budgetExceeded": "Over Budget",
    "limitDailyUsdInvalid": "Daily limit must be a non-negative number",
    "limitMonthlyUsdInvalid": "Monthly limit must be a non-negative number"
  },
```

- [ ] **Step 2: vi.json**

In `src/i18n/locales/vi.json`, change lines 2962-2964 from:

```json
    "pricingModelSourceRequest": "Model của request",
    "pricingModelSourceResponse": "Model của response",
    "pricingModelSourceHint": "Chọn khớp giá theo model của request hay response"
  },
```

to:

```json
    "pricingModelSourceRequest": "Model của request",
    "pricingModelSourceResponse": "Model của response",
    "pricingModelSourceHint": "Chọn khớp giá theo model của request hay response",
    "budgetConfig": "Ngân sách",
    "budgetConfigDesc": "Đặt hạn mức chi tiêu cho provider này, khi vượt sẽ hiện cảnh báo trong danh sách (không chặn request).",
    "limitDailyUsd": "Hạn mức hằng ngày (USD)",
    "limitDailyUsdPlaceholder": "Để trống nếu không giới hạn",
    "limitMonthlyUsd": "Hạn mức hằng tháng (USD)",
    "limitMonthlyUsdPlaceholder": "Để trống nếu không giới hạn",
    "budgetExceeded": "Vượt ngân sách",
    "limitDailyUsdInvalid": "Hạn mức hằng ngày phải là số không âm",
    "limitMonthlyUsdInvalid": "Hạn mức hằng tháng phải là số không âm"
  },
```

- [ ] **Step 3: zh.json**

In `src/i18n/locales/zh.json`, change lines 1293-1295 from:

```json
    "pricingModelSourceResponse": "返回模型",
    "pricingModelSourceHint": "选择按请求模型还是返回模型进行定价匹配"
  },
```

to:

```json
    "pricingModelSourceResponse": "返回模型",
    "pricingModelSourceHint": "选择按请求模型还是返回模型进行定价匹配",
    "budgetConfig": "预算限额",
    "budgetConfigDesc": "设置该供应商的消费上限，超出时在列表中显示提醒（不会阻止请求）。",
    "limitDailyUsd": "每日限额 (USD)",
    "limitDailyUsdPlaceholder": "留空表示不限制",
    "limitMonthlyUsd": "每月限额 (USD)",
    "limitMonthlyUsdPlaceholder": "留空表示不限制",
    "budgetExceeded": "超预算",
    "limitDailyUsdInvalid": "每日限额必须为非负数",
    "limitMonthlyUsdInvalid": "每月限额必须为非负数"
  },
```

- [ ] **Step 4: zh-TW.json**

In `src/i18n/locales/zh-TW.json`, change lines 1264-1266 from:

```json
    "pricingModelSourceResponse": "回傳模型",
    "pricingModelSourceHint": "選擇依請求模型還是回傳模型進行定價比對"
  },
```

to:

```json
    "pricingModelSourceResponse": "回傳模型",
    "pricingModelSourceHint": "選擇依請求模型還是回傳模型進行定價比對",
    "budgetConfig": "預算限額",
    "budgetConfigDesc": "設定該供應商的消費上限，超出時在清單中顯示提醒（不會阻擋請求）。",
    "limitDailyUsd": "每日限額 (USD)",
    "limitDailyUsdPlaceholder": "留空表示不限制",
    "limitMonthlyUsd": "每月限額 (USD)",
    "limitMonthlyUsdPlaceholder": "留空表示不限制",
    "budgetExceeded": "超預算",
    "limitDailyUsdInvalid": "每日限額必須為非負數",
    "limitMonthlyUsdInvalid": "每月限額必須為非負數"
  },
```

- [ ] **Step 5: ja.json**

In `src/i18n/locales/ja.json`, change lines 1293-1295 from:

```json
    "pricingModelSourceResponse": "レスポンスモデル",
    "pricingModelSourceHint": "リクエストモデルまたはレスポンスモデルで価格を照合するかを選択"
  },
```

to:

```json
    "pricingModelSourceResponse": "レスポンスモデル",
    "pricingModelSourceHint": "リクエストモデルまたはレスポンスモデルで価格を照合するかを選択",
    "budgetConfig": "予算上限",
    "budgetConfigDesc": "このプロバイダーの支出上限を設定します。超過するとリストに警告が表示されます（リクエストはブロックされません）。",
    "limitDailyUsd": "1日の上限 (USD)",
    "limitDailyUsdPlaceholder": "空欄の場合は無制限",
    "limitMonthlyUsd": "月間上限 (USD)",
    "limitMonthlyUsdPlaceholder": "空欄の場合は無制限",
    "budgetExceeded": "予算超過",
    "limitDailyUsdInvalid": "1日の上限は0以上の数値にしてください",
    "limitMonthlyUsdInvalid": "月間上限は0以上の数値にしてください"
  },
```

- [ ] **Step 6: run the i18n completeness test**

Run: `pnpm test:unit tests/i18n/vietnameseLocale.test.ts`
Expected: PASS — `providerAdvanced` namespace key sets and placeholders match between `en.json` and `vi.json`.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json src/i18n/locales/zh.json src/i18n/locales/zh-TW.json src/i18n/locales/ja.json
git commit -m "i18n: add providerAdvanced budget keys for all 5 locales"
```

---

### Task 4: `ProviderAdvancedConfig` — Budget section

**Files:**
- Modify: `src/components/providers/forms/ProviderAdvancedConfig.tsx`

- [ ] **Step 1: Add the `Wallet` icon import and new props type**

In `src/components/providers/forms/ProviderAdvancedConfig.tsx`, change line 3 from:

```ts
import { ChevronDown, ChevronRight, Coins } from "lucide-react";
```

to:

```ts
import { ChevronDown, ChevronRight, Coins, Wallet } from "lucide-react";
```

Then change lines 17-26 from:

```ts
interface ProviderPricingConfig {
  enabled: boolean;
  costMultiplier?: string;
  pricingModelSource: PricingModelSourceOption;
}

interface ProviderAdvancedConfigProps {
  pricingConfig: ProviderPricingConfig;
  onPricingConfigChange: (config: ProviderPricingConfig) => void;
}
```

to:

```ts
interface ProviderPricingConfig {
  enabled: boolean;
  costMultiplier?: string;
  pricingModelSource: PricingModelSourceOption;
}

export interface ProviderBudgetConfig {
  limitDailyUsd?: string;
  limitMonthlyUsd?: string;
}

interface ProviderAdvancedConfigProps {
  pricingConfig: ProviderPricingConfig;
  onPricingConfigChange: (config: ProviderPricingConfig) => void;
  budgetConfig: ProviderBudgetConfig;
  onBudgetConfigChange: (config: ProviderBudgetConfig) => void;
}
```

- [ ] **Step 2: Accept the new props and render the Budget section**

Change the component signature (lines 28-31) from:

```tsx
export function ProviderAdvancedConfig({
  pricingConfig,
  onPricingConfigChange,
}: ProviderAdvancedConfigProps) {
```

to:

```tsx
export function ProviderAdvancedConfig({
  pricingConfig,
  onPricingConfigChange,
  budgetConfig,
  onBudgetConfigChange,
}: ProviderAdvancedConfigProps) {
```

Then, in the returned JSX, the pricing section's outer `<div>` currently closes right before the component's final `</div>` (end of the `space-y-4` wrapper, around what is now line 179-182 after the icon-import edit shifts nothing — the closing tags are unchanged text):

```tsx
        </div>
      </div>
    </div>
  );
}
```

Replace that closing block with a new Budget section inserted between the pricing section's closing `</div>` and the wrapper's closing `</div>`:

```tsx
        </div>
      </div>

      {/* 预算限额 */}
      <div className="rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 p-4">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {t("providerAdvanced.budgetConfig", { defaultValue: "预算限额" })}
          </span>
        </div>
        <div className="border-t border-border/50 p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("providerAdvanced.budgetConfigDesc", {
              defaultValue:
                "设置该供应商的消费上限，超出时在列表中显示提醒（不会阻止请求）。",
            })}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit-daily-usd">
                {t("providerAdvanced.limitDailyUsd", {
                  defaultValue: "每日限额 (USD)",
                })}
              </Label>
              <Input
                id="limit-daily-usd"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={budgetConfig.limitDailyUsd || ""}
                onChange={(e) =>
                  onBudgetConfigChange({
                    ...budgetConfig,
                    limitDailyUsd: e.target.value || undefined,
                  })
                }
                placeholder={t("providerAdvanced.limitDailyUsdPlaceholder", {
                  defaultValue: "留空表示不限制",
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit-monthly-usd">
                {t("providerAdvanced.limitMonthlyUsd", {
                  defaultValue: "每月限额 (USD)",
                })}
              </Label>
              <Input
                id="limit-monthly-usd"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={budgetConfig.limitMonthlyUsd || ""}
                onChange={(e) =>
                  onBudgetConfigChange({
                    ...budgetConfig,
                    limitMonthlyUsd: e.target.value || undefined,
                  })
                }
                placeholder={t("providerAdvanced.limitMonthlyUsdPlaceholder", {
                  defaultValue: "留空表示不限制",
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: FAIL — `ProviderForm.tsx` doesn't pass `budgetConfig`/`onBudgetConfigChange` yet. This is expected; Task 5 fixes the caller. Confirm the *only* errors are about the missing props at the `<ProviderAdvancedConfig>` call site in `ProviderForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/providers/forms/ProviderAdvancedConfig.tsx
git commit -m "feat(ui): add budget limit inputs to ProviderAdvancedConfig"
```

---

### Task 5: `ProviderForm` — budget state, validation, save payload

**Files:**
- Modify: `src/components/providers/forms/ProviderForm.tsx`

- [ ] **Step 1: Add `budgetConfig` state next to `pricingConfig`**

In `src/components/providers/forms/ProviderForm.tsx`, after the `pricingConfig` state block (lines 321-333):

```ts
  const [pricingConfig, setPricingConfig] = useState<{
    enabled: boolean;
    costMultiplier?: string;
    pricingModelSource: PricingModelSourceOption;
  }>(() => ({
    enabled:
      initialData?.meta?.costMultiplier !== undefined ||
      initialData?.meta?.pricingModelSource !== undefined,
    costMultiplier: initialData?.meta?.costMultiplier,
    pricingModelSource: normalizePricingSource(
      initialData?.meta?.pricingModelSource,
    ),
  }));
```

add:

```ts
  const [budgetConfig, setBudgetConfig] = useState<{
    limitDailyUsd?: string;
    limitMonthlyUsd?: string;
  }>(() => ({
    limitDailyUsd: initialData?.meta?.limitDailyUsd,
    limitMonthlyUsd: initialData?.meta?.limitMonthlyUsd,
  }));
```

- [ ] **Step 2: Resync `budgetConfig` in the `initialData`-change effect**

In the `useEffect` that resyncs `pricingConfig` (lines 356-364):

```ts
    setPricingConfig({
      enabled:
        initialData?.meta?.costMultiplier !== undefined ||
        initialData?.meta?.pricingModelSource !== undefined,
      costMultiplier: initialData?.meta?.costMultiplier,
      pricingModelSource: normalizePricingSource(
        initialData?.meta?.pricingModelSource,
      ),
    });
```

add right after it:

```ts
    setBudgetConfig({
      limitDailyUsd: initialData?.meta?.limitDailyUsd,
      limitMonthlyUsd: initialData?.meta?.limitMonthlyUsd,
    });
```

- [ ] **Step 3: Add validation after the `costMultiplier` check**

The existing `costMultiplier` validation is at lines 1064-1076:

```ts
    const costMultiplier = pricingConfig.costMultiplier?.trim();
    if (
      pricingConfig.enabled &&
      costMultiplier &&
      !isNonNegativeDecimalString(costMultiplier)
    ) {
      toast.error(
        t("settings.globalProxy.defaultCostMultiplierInvalid", {
          defaultValue: "成本倍率必须为非负数",
        }),
      );
      return;
    }
```

Immediately after this block, add:

```ts
    const limitDailyUsd = budgetConfig.limitDailyUsd?.trim();
    if (limitDailyUsd && !isNonNegativeDecimalString(limitDailyUsd)) {
      toast.error(
        t("providerAdvanced.limitDailyUsdInvalid", {
          defaultValue: "每日限额必须为非负数",
        }),
      );
      return;
    }
    const limitMonthlyUsd = budgetConfig.limitMonthlyUsd?.trim();
    if (limitMonthlyUsd && !isNonNegativeDecimalString(limitMonthlyUsd)) {
      toast.error(
        t("providerAdvanced.limitMonthlyUsdInvalid", {
          defaultValue: "每月限额必须为非负数",
        }),
      );
      return;
    }
```

- [ ] **Step 4: Include the fields in the save payload**

Near the `costMultiplier`/`pricingModelSource` payload fields (lines 1605-1611):

```ts
      costMultiplier: pricingConfig.enabled
        ? pricingConfig.costMultiplier
        : undefined,
      pricingModelSource:
        pricingConfig.enabled && pricingConfig.pricingModelSource !== "inherit"
          ? pricingConfig.pricingModelSource
          : undefined,
```

add right after:

```ts
      limitDailyUsd: budgetConfig.limitDailyUsd?.trim() || undefined,
      limitMonthlyUsd: budgetConfig.limitMonthlyUsd?.trim() || undefined,
```

- [ ] **Step 5: Pass the new props at the `<ProviderAdvancedConfig>` call site**

Current call site (lines 2602-2605):

```tsx
              <ProviderAdvancedConfig
                pricingConfig={pricingConfig}
                onPricingConfigChange={setPricingConfig}
              />
```

Change to:

```tsx
              <ProviderAdvancedConfig
                pricingConfig={pricingConfig}
                onPricingConfigChange={setPricingConfig}
                budgetConfig={budgetConfig}
                onBudgetConfigChange={setBudgetConfig}
              />
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (this resolves the errors introduced in Task 4 Step 3)

- [ ] **Step 7: Run the existing ProviderForm-adjacent test suites**

Run: `pnpm test:unit tests/components/AddProviderDialog.test.tsx tests/components/EditProviderDialog.test.tsx`
Expected: PASS — these exercise `ProviderForm` end-to-end via the add/edit dialogs; confirm nothing regressed.

- [ ] **Step 8: Commit**

```bash
git add src/components/providers/forms/ProviderForm.tsx
git commit -m "feat(ui): wire budget limit fields through ProviderForm state and save payload"
```

---

### Task 6: `ProviderBudgetBadge` component

**Files:**
- Create: `src/components/providers/ProviderBudgetBadge.tsx`
- Test: `tests/components/ProviderBudgetBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ProviderBudgetBadge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
    expect(screen.getByText("Over Budget")).toBeInTheDocument();
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
    const badge = screen.getByText("Over Budget").closest("div");
    expect(badge?.getAttribute("title")).toContain("$5.00 / $1.00");
    expect(badge?.getAttribute("title")).toContain("$50.00 / $10.00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/components/ProviderBudgetBadge.test.tsx`
Expected: FAIL with "Cannot find module '@/components/providers/ProviderBudgetBadge'"

- [ ] **Step 3: Create the component**

Create `src/components/providers/ProviderBudgetBadge.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit tests/components/ProviderBudgetBadge.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/providers/ProviderBudgetBadge.tsx tests/components/ProviderBudgetBadge.test.tsx
git commit -m "feat(ui): add ProviderBudgetBadge component"
```

---

### Task 7: Wire the badge into `ProviderCard`

**Files:**
- Modify: `src/components/providers/ProviderCard.tsx`

- [ ] **Step 1: Import the badge and the hook**

Near the existing `ProviderHealthBadge` import (line 20):

```ts
import { ProviderHealthBadge } from "@/components/providers/ProviderHealthBadge";
```

add:

```ts
import { ProviderBudgetBadge } from "@/components/providers/ProviderBudgetBadge";
```

Near the existing `useProviderHealth` import (line 30):

```ts
import { useProviderHealth } from "@/lib/query/failover";
```

add:

```ts
import { useProviderLimits } from "@/lib/query/usage";
```

- [ ] **Step 2: Add the budget-status query**

Right after `const { data: health } = useProviderHealth(provider.id, appId);` (line 177), add:

```ts
  const hasBudgetLimit = !!(
    provider.meta?.limitDailyUsd || provider.meta?.limitMonthlyUsd
  );
  const { data: budgetStatus } = useProviderLimits(provider.id, appId, {
    enabled: hasBudgetLimit,
  });
```

- [ ] **Step 3: Render the badge next to `ProviderHealthBadge`**

Current block (lines 426-431):

```tsx
              {isProxyRunning && isInFailoverQueue && health && (
                <ProviderHealthBadge
                  consecutiveFailures={health.consecutive_failures}
                  isHealthy={health.is_healthy}
                />
              )}
```

Add right after it:

```tsx

              {budgetStatus && (
                <ProviderBudgetBadge
                  dailyUsage={budgetStatus.dailyUsage}
                  dailyLimit={budgetStatus.dailyLimit}
                  dailyExceeded={budgetStatus.dailyExceeded}
                  monthlyUsage={budgetStatus.monthlyUsage}
                  monthlyLimit={budgetStatus.monthlyLimit}
                  monthlyExceeded={budgetStatus.monthlyExceeded}
                />
              )}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Run the ProviderList test suite (renders ProviderCard)**

Run: `pnpm test:unit tests/components/ProviderList.test.tsx`
Expected: PASS — confirms `ProviderCard` still renders correctly with the new hook wired in (providers without `limitDailyUsd`/`limitMonthlyUsd` in that suite's fixtures will have `hasBudgetLimit === false`, so the query stays disabled and no badge renders).

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/ProviderCard.tsx
git commit -m "feat(ui): show ProviderBudgetBadge on ProviderCard when a limit is exceeded"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Full unit test suite**

Run: `pnpm test:unit`
Expected: PASS — all suites including the new `useProviderLimits`, `ProviderBudgetBadge`, and the i18n completeness test.

- [ ] **Step 3: Format check**

Run: `pnpm format:check`
Expected: PASS. If it fails, run `pnpm format` and re-check the diff before committing.

- [ ] **Step 4: Manual smoke test (frontend only — no Rust rebuild needed)**

Run: `pnpm dev`

Manual steps:
1. Open a provider's edit form → confirm the new "预算限额" (Budget) section appears below Pricing Config, with two empty inputs and placeholder "留空表示不限制".
2. Set "每日限额 (USD)" to `0.01` for a provider that already has today's usage > $0.01 (check Usage Dashboard first to find one, or lower an existing provider's usage isn't needed — just pick any actively-used provider).
3. Save. Reopen the main provider list (or refocus the window) → the card should show a red "超预算"/"Over Budget" badge next to the health badge, with a tooltip showing the daily figures.
4. Clear the daily limit and save again → badge should disappear after the query refetches (on next mount/focus).

- [ ] **Step 5: If everything passes, this feature is complete — no further commit needed here (each task already committed its own changes).**

---

## Self-review notes

- Spec §4.1–4.5 are covered by Tasks 1, 4, 5, 6, 7 respectively.
- Spec §5 (i18n) covered by Task 3, all 9 keys × 5 locales.
- Spec §4.5's `useProviderLimits` signature change is covered by Task 2, done as its own TDD task since it's a behavioral change to shared code (not just a new file).
- Spec §7 (testing) covered by Tasks 2, 6 (unit/component tests) and Task 3 Step 6 / Task 8 Step 2 (i18n regression via existing test).
- Spec §8 (verification commands) covered by Task 8.
