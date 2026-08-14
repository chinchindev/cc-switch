# Hoàn thiện cảnh báo ngân sách cho Provider

**Ngày:** 2026-07-31
**Nhánh:** tách từ `feat/vietnamese-locale` (fork cá nhân, không gửi PR upstream)
**Trạng thái:** Đã duyệt thiết kế, chờ triển khai

---

## 1. Bối cảnh

Khảo sát backend cho thấy tính năng "cảnh báo vượt ngân sách" đã được xây gần xong nhưng bị bỏ dở giữa chừng:

- `ProviderMeta` phía Rust (`src-tauri/src/provider.rs:453-458`) đã có sẵn `limit_daily_usd` / `limit_monthly_usd` (camelCase khi serialize: `limitDailyUsd` / `limitMonthlyUsd`)
- `UsageStatsService::check_provider_limits()` (`src-tauri/src/services/usage_stats.rs:1670-1756`) đã tính đúng usage hôm nay + tháng này (gộp cả `proxy_request_logs` lẫn `usage_daily_rollups`), so với ngưỡng, trả về `ProviderLimitStatus { daily_usage, daily_limit, daily_exceeded, monthly_usage, monthly_limit, monthly_exceeded }`
- Command `check_provider_limits` đã đăng ký trong `lib.rs`, đã có API wrapper `usageApi.checkProviderLimits()` (`src/lib/api/usage.ts:194-198`) và hook `useProviderLimits(providerId, appType)` (`src/lib/query/usage.ts:349-355`)

Nhưng: **`ProviderMeta` phía TypeScript** (`src/types.ts:172+`) **không khai báo `limitDailyUsd`/`limitMonthlyUsd`**, và **không có UI nào** cho phép nhập ngưỡng hay hiển thị trạng thái vượt ngưỡng. `grep` toàn bộ `src/components/providers/` cho các field này ra 0 kết quả.

Mục tiêu: nối nốt phần UI còn thiếu, tận dụng toàn bộ logic backend đã có sẵn — không sửa gì ở tầng Rust.

## 2. Phạm vi

**Trong phạm vi:**
- Thêm 2 field vào `ProviderMeta` (TypeScript)
- Thêm ô nhập ngưỡng vào form sửa provider (section riêng, không gộp vào cost multiplier)
- Thêm badge cảnh báo trên `ProviderCard`, chỉ hiện khi vượt ngưỡng, chỉ xem không tương tác
- i18n cho cả 5 ngôn ngữ (en/zh/zh-TW/ja/vi)

**Ngoài phạm vi (không làm trong đợt này):**
- Không polling/real-time cho badge — chấp nhận độ trễ tới lần mount/focus tiếp theo
- Không có banner tổng hợp "các provider đang vượt ngân sách" trên Usage Dashboard
- Không chặn request khi vượt ngưỡng (đây là cảnh báo, không phải hard limit chặn proxy)
- Badge không bấm được, không điều hướng sang form sửa

## 3. Luồng dữ liệu

Không có luồng mới — chỉ nối các mắt xích đã tồn tại:

```
ProviderAdvancedConfig.tsx (input)
  → ProviderForm.tsx state → provider.meta.limitDailyUsd/limitMonthlyUsd
  → lưu qua add_provider/update_provider (Rust, đã hoạt động — ProviderMeta có field sẵn)

ProviderCard.tsx
  → useProviderLimits(provider.id, appId)   [đã có sẵn, chỉ cần gọi]
  → check_provider_limits (Rust, đã có sẵn)
  → ProviderBudgetBadge (mới, thuần hiển thị)
```

Badge tự làm mới theo cơ chế đã có: `usageKeys.limits(...)` nằm dưới prefix `usageKeys.all`. `useUsageEventBridge` (`src/hooks/useUsageEventBridge.ts`) đã invalidate `usageKeys.all` mỗi khi có request mới ghi log — nhưng hook đó **chỉ mount trên UsageDashboard** (theo đúng comment trong code, tránh trigger vô ích ở nơi khác). Kết quả: badge trên trang chính sẽ làm mới khi mount/focus lại cửa sổ, không real-time tuyệt đối khi app đang mở tab khác. Với cảnh báo ngân sách (không cần chính xác tới giây) thì mức này chấp nhận được — **không thêm polling** để tránh tải DB không cần thiết.

## 4. Các điểm cần sửa

### 4.1 `src/types.ts` — mở rộng `ProviderMeta`

Thêm sau `pricingModelSource?: string;` (theo đúng vị trí tương ứng bên Rust):

```ts
// Hạn mức chi tiêu hằng ngày (USD)
limitDailyUsd?: string;
// Hạn mức chi tiêu hằng tháng (USD)
limitMonthlyUsd?: string;
```

### 4.2 `src/components/providers/forms/ProviderAdvancedConfig.tsx` — thêm section Ngân sách

Component hiện có 1 section collapsible "计费配置" (pricing config) theo pattern: icon + tiêu đề + switch bật/tắt + nội dung 2 cột trong `overflow-hidden` animate.

Thêm props mới:

```ts
interface ProviderBudgetConfig {
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

Section mới **độc lập** với section pricing (không chung switch enable — 2 ô nhập luôn hiện, để trống nghĩa là không giới hạn, giống hệt cách `costMultiplier` xử lý "để trống = dùng mặc định"):

```tsx
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
        defaultValue: "设置该供应商的消费上限，超出时在列表中显示提醒（不会阻止请求）。",
      })}
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="limit-daily-usd">
          {t("providerAdvanced.limitDailyUsd", { defaultValue: "每日限额 (USD)" })}
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
          {t("providerAdvanced.limitMonthlyUsd", { defaultValue: "每月限额 (USD)" })}
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
```

Không cần collapsible/toggle riêng cho section này (không giống pricing config vốn có nhiều field cần ẩn bớt) — nhưng **giữ đúng khung `rounded-lg border` để đồng bộ hình ảnh** với section pricing ngay phía trên nó.

### 4.3 `src/components/providers/forms/ProviderForm.tsx` — state + validate + save

Tại chỗ khai báo `pricingConfig` (dòng ~321), thêm state song song:

```ts
const [budgetConfig, setBudgetConfig] = useState<{
  limitDailyUsd?: string;
  limitMonthlyUsd?: string;
}>({
  limitDailyUsd: initialData?.meta?.limitDailyUsd,
  limitMonthlyUsd: initialData?.meta?.limitMonthlyUsd,
});
```

Và trong effect đồng bộ lại state khi `initialData` đổi (đi cùng khối tại dòng ~358-362), thêm 2 dòng tương ứng.

Validate ngay sau khối `costMultiplier` validate (dòng ~1064-1074), theo đúng cơ chế `toast.error` + `return` sớm mà `costMultiplier` đang dùng tại chỗ này (không dùng `issues.push` như validate tên provider ở trên — đây là lỗi B loại "hard reject", không phải lỗi tổng hợp), tái dùng `isNonNegativeDecimalString` đã import sẵn từ `@/types/usage`:

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

Hai key `limitDailyUsdInvalid`/`limitMonthlyUsdInvalid` cần thêm vào bảng i18n ở mục 5.

Khi build object gửi lên backend (cạnh khối `costMultiplier`/`pricingModelSource` ở dòng ~1605-1610):

```ts
limitDailyUsd: budgetConfig.limitDailyUsd?.trim() || undefined,
limitMonthlyUsd: budgetConfig.limitMonthlyUsd?.trim() || undefined,
```

Truyền `budgetConfig`/`onBudgetConfigChange` xuống `<ProviderAdvancedConfig>` tại chỗ gọi hiện có (dòng ~2602).

### 4.4 `src/components/providers/ProviderBudgetBadge.tsx` — component mới

Theo đúng khuôn `ProviderHealthBadge.tsx` (thuần hiển thị, nhận data qua props, không tự fetch):

```tsx
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
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
      <span>{t("providerAdvanced.budgetExceeded", { defaultValue: "超预算" })}</span>
    </div>
  );
}
```

### 4.5 `src/components/providers/ProviderCard.tsx` — gắn badge

Cạnh `useProviderHealth` (dòng ~177), thêm:

```ts
const hasBudgetLimit = !!(
  provider.meta?.limitDailyUsd || provider.meta?.limitMonthlyUsd
);
const { data: budgetStatus } = useProviderLimits(provider.id, appId, {
  enabled: hasBudgetLimit,
});
```

Cần kiểm tra chữ ký hiện tại của `useProviderLimits` — bản gốc (`src/lib/query/usage.ts:349`) chỉ nhận `(providerId, appType)`, `enabled` được viết cứng bên trong hook (`enabled: !!providerId && !!appType`). Sửa hook để nhận thêm option `enabled` từ caller, AND với điều kiện gốc:

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

Render badge cạnh `ProviderHealthBadge`/`FailoverPriorityBadge` (khu vực dòng ~427-440):

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

## 5. i18n — 5 ngôn ngữ

Key mới, tất cả thuộc namespace `providerAdvanced` (đã tồn tại ở cả 5 file):

| Key | vi | en |
|---|---|---|
| `budgetConfig` | Ngân sách | Budget |
| `budgetConfigDesc` | Đặt hạn mức chi tiêu cho provider này, khi vượt sẽ hiện cảnh báo trong danh sách (không chặn request). | Set spending limits for this provider; shows a warning badge when exceeded (does not block requests). |
| `limitDailyUsd` | Hạn mức hằng ngày (USD) | Daily Limit (USD) |
| `limitDailyUsdPlaceholder` | Để trống nếu không giới hạn | Leave empty for no limit |
| `limitMonthlyUsd` | Hạn mức hằng tháng (USD) | Monthly Limit (USD) |
| `limitMonthlyUsdPlaceholder` | Để trống nếu không giới hạn | Leave empty for no limit |
| `budgetExceeded` | Vượt ngân sách | Over Budget |
| `limitDailyUsdInvalid` | Hạn mức hằng ngày phải là số không âm | Daily limit must be a non-negative number |
| `limitMonthlyUsdInvalid` | Hạn mức hằng tháng phải là số không âm | Monthly limit must be a non-negative number |

zh/zh-TW/ja dịch tương ứng theo đúng văn phong các key `providerAdvanced.*` hiện có trong từng file.

Test toàn vẹn key (`tests/i18n/vietnameseLocale.test.ts`) sẽ tự bắt lỗi nếu thiếu key ở vi.json so với en.json — không cần viết test riêng cho việc này, tận dụng hạ tầng đã có.

## 6. Xử lý lỗi

Không có đường lỗi mới:
- Ngưỡng nhập sai định dạng → chặn ngay ở validate form (giống `costMultiplier`)
- `check_provider_limits` lỗi (provider không tồn tại, DB lỗi) → React Query trả `data: undefined`, badge tự ẩn (không throw, không crash card)
- Provider không đặt ngưỡng → `hasBudgetLimit = false` → không gọi query, không có badge

## 7. Kiểm thử

- **Unit test** cho validate: ngưỡng âm/chữ/để trống — thêm vào test suite hiện có của `ProviderForm` nếu có, hoặc test riêng cho hàm validate nếu tách được
- **Component test** cho `ProviderBudgetBadge`: render `null` khi cả 2 cờ `false`; render đúng nội dung tooltip khi 1 hoặc cả 2 cờ `true`
- **i18n test**: chạy lại `tests/i18n/vietnameseLocale.test.ts` sau khi thêm key — tự xác nhận đủ key + placeholder khớp

## 8. Xác minh

```bash
pnpm typecheck
pnpm test:unit
pnpm format:check
```

Kiểm tra thủ công: đặt `limitDailyUsd` rất thấp (ví dụ `0.01`) cho 1 provider đang có usage log > 0.01 USD hôm nay → badge "超预算"/"Vượt ngân sách" phải hiện trên card đó ngay sau khi mount lại trang chính.

**Lưu ý môi trường:** phần Rust không đổi gì trong đợt này (chỉ dùng lại `check_provider_limits` có sẵn), nên không cần build lại binary Rust để test — chỉ cần `pnpm dev` (frontend) là đủ để thấy thay đổi, vì command Tauri đã tồn tại trong build hiện tại.
