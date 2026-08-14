# Vietnamese Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tiếng Việt (`vi`) làm ngôn ngữ thứ 5 của CC Switch, dịch 1.070 key thuộc các màn hình dùng hằng ngày.

**Architecture:** Ứng dụng đã có sẵn 4 ngôn ngữ và đủ cơ chế i18n. Việc cần làm chỉ là **thêm nhánh `vi` vào 6 điểm rẽ có sẵn** — không thêm module, không đổi logic. Key chưa dịch tự rơi về tiếng Anh nhờ `fallbackLng: "en"`, nên dịch từng đợt vẫn cho ra ứng dụng chạy được.

**Tech Stack:** React 18 + TypeScript, i18next + react-i18next, Vitest, Rust (Tauri 2) cho menu khay hệ thống.

**Spec:** `docs/superpowers/specs/2026-07-30-vietnamese-locale-design.md`

---

## Bối cảnh cho người thực thi

CC Switch là app desktop Tauri 2 quản lý cấu hình cho 8 công cụ AI coding. Frontend React nằm ở `src/`, backend Rust ở `src-tauri/src/`.

Ngôn ngữ được lưu **song song ở hai nơi**, cả hai đều đã tồn tại:
- `localStorage["language"]` — frontend đọc lúc khởi động
- `settings.language` trong SQLite — Rust đọc khi dựng menu khay hệ thống

Vì vậy phải sửa **cả TypeScript lẫn Rust**, và thứ tự nhận diện locale ở hai bên phải khớp nhau.

### Môi trường build — đọc kỹ

Máy dev **không cài được Visual Studio C++ Build Tools** (không có quyền admin), nên `cargo build` sẽ **thất bại ở bước link**. Điều này là bình thường, không phải lỗi do bạn gây ra.

- Thay đổi TypeScript: verify cục bộ bình thường bằng `pnpm`.
- Thay đổi Rust: **không verify cục bộ được**. Push lên nhánh, GitHub Actions sẽ build.
- **Đừng chạy `cargo` từ Git Bash.** Git Bash có `/usr/bin/link.exe` (GNU coreutils) che mất linker MSVC, gây lỗi `link: extra operand` gây hiểu nhầm. Dùng PowerShell.

### Baseline test đang đỏ sẵn

`tests/hooks/useSettingsForm.test.tsx` và `tests/integration/App.test.tsx` **đã fail sẵn trên `main`** (3 test). Không phải do bạn. Đừng sửa chúng.

### Quy ước dịch — quan trọng nhất

Giữ nguyên tiếng Anh các thuật ngữ kỹ thuật: `provider`, `proxy`, `token`, `endpoint`, `failover`, `circuit breaker`, `MCP`, `skill`, `prompt`, `session`, `API key`, `base URL`, `model`, `profile`, `workspace`, `deep link`, `OAuth`, `cache`, `log`, `backup`, `sync`, `import`, `export`. Tên sản phẩm giữ nguyên (Claude Code, Codex, Gemini CLI…).

Dịch sang tiếng Việt: câu mô tả, nhãn nút, thông báo lỗi, tooltip, tiêu đề mục.

| ❌ Sai | ✅ Đúng |
|---|---|
| "Xóa nhà cung cấp này?" | "Xóa provider này?" |
| "Cổng máy chủ ủy quyền" | "Cổng proxy" |
| "Tổng số thẻ bài" | "Tổng token" |

Ràng buộc bắt buộc:
- **Giữ nguyên mọi placeholder** `{{name}}`, `{{count}}`… kể cả khi vị trí trong câu đổi.
- Giữ nguyên ký tự xuống dòng `\n` có trong chuỗi gốc.
- Xưng hô trung tính — **không dùng "bạn"**. Dùng thể mệnh lệnh hoặc lược chủ ngữ: "Nhập API key", "Không tìm thấy provider".
- File `vi.json` phải là **UTF-8 không BOM**, thứ tự key giống hệt `en.json`.

---

### Về độ chi tiết của các task dịch

Task 1, 2, 3 cho code đầy đủ vì chúng thay đổi **logic**. Task 4-8 thì không — chúng là **công việc dịch thuật**, nội dung sinh ra chính là sản phẩm, không thể viết sẵn trong plan mà không biến plan thành bản triển khai luôn.

Bù lại, mỗi task dịch đều có đủ ba thứ để làm đúng mà không cần đoán:
1. **Lệnh chính xác** để lấy nội dung gốc cần dịch
2. **Bản dịch mẫu hoàn chỉnh** ở Task 3 (90 key) làm chuẩn văn phong — bám sát nó
3. **Test cơ học** đối chiếu key và placeholder với `en.json`, chạy được ngay, sai là báo đỏ

Đây là lý do thứ tự task quan trọng: Task 3 dựng bộ test trước, mọi task dịch sau chỉ việc thêm tên namespace vào mảng và chạy.

## File Structure

| File | Trách nhiệm | Trạng thái |
|---|---|---|
| `src/i18n/locales/vi.json` | Chuỗi dịch tiếng Việt | Tạo mới |
| `src/i18n/index.ts` | Đăng ký locale, nhận diện ngôn ngữ hệ thống | Sửa |
| `src/hooks/useSettingsForm.ts` | Chuẩn hóa + kiểm tra ngôn ngữ hợp lệ | Sửa |
| `src/components/usage/format.ts` | Ánh xạ ngôn ngữ → locale định dạng số/ngày | Sửa |
| `src/components/settings/LanguageSettings.tsx` | Nút chọn ngôn ngữ | Sửa |
| `src/i18n/locales/{en,ja,zh,zh-TW}.json` | Thêm nhãn nút "Tiếng Việt" | Sửa |
| `src-tauri/src/tray.rs` | Menu khay hệ thống | Sửa |
| `tests/i18n/vietnameseLocale.test.ts` | Test plumbing + đối chiếu key/placeholder | Tạo mới |

---

## Task 1: Chuẩn hóa và nhận diện ngôn ngữ (TypeScript)

Task này **không đụng tới `vi.json`** — chỉ dạy cho các hàm tiện ích biết `vi` là ngôn ngữ hợp lệ.

**Files:**
- Modify: `src/hooks/useSettingsForm.ts:6-45`
- Modify: `src/components/usage/format.ts:47-57`
- Test: `tests/i18n/vietnameseLocale.test.ts` (tạo mới)

- [x] **Step 1: Export hai hàm đang là private**

`normalizeLanguage` và `isSupportedLanguage` trong `src/hooks/useSettingsForm.ts` hiện là `const` nội bộ, không test trực tiếp được. Thêm `export`:

```ts
export const normalizeLanguage = (lang?: string | null): Language => {
```

```ts
export const isSupportedLanguage = (lang?: string | null): boolean => {
```

Cũng export type để test dùng:

```ts
export type Language = "zh" | "zh-TW" | "en" | "ja" | "vi";
```

(Dòng 6 hiện là `type Language = "zh" | "zh-TW" | "en" | "ja";` — vừa thêm `"vi"` vừa thêm `export`.)

- [x] **Step 2: Viết test thất bại**

Tạo `tests/i18n/vietnameseLocale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeLanguage,
  isSupportedLanguage,
} from "@/hooks/useSettingsForm";
import { getLocaleFromLanguage } from "@/components/usage/format";

describe("Vietnamese language plumbing", () => {
  it("normalizes Vietnamese tags to vi", () => {
    expect(normalizeLanguage("vi")).toBe("vi");
    expect(normalizeLanguage("vi-VN")).toBe("vi");
    expect(normalizeLanguage("VI-vn")).toBe("vi");
    expect(normalizeLanguage("vi_VN")).toBe("vi");
  });

  it("accepts Vietnamese as a supported language", () => {
    expect(isSupportedLanguage("vi")).toBe(true);
    expect(isSupportedLanguage("vi-VN")).toBe(true);
  });

  it("maps Vietnamese to the vi-VN formatting locale", () => {
    expect(getLocaleFromLanguage("vi")).toBe("vi-VN");
    expect(getLocaleFromLanguage("vi-VN")).toBe("vi-VN");
  });

  it("leaves the existing languages untouched", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("ja")).toBe("ja");
    expect(normalizeLanguage("zh-TW")).toBe("zh-TW");
    expect(normalizeLanguage("zh")).toBe("zh");
    expect(normalizeLanguage("de")).toBe("zh");
    expect(getLocaleFromLanguage("ja")).toBe("ja-JP");
    expect(getLocaleFromLanguage("")).toBe("en-US");
  });
});
```

- [x] **Step 3: Chạy test để xác nhận nó fail**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: FAIL — `normalizeLanguage("vi")` trả `"zh"`, `getLocaleFromLanguage("vi")` trả `"en-US"`.

- [x] **Step 4: Sửa `normalizeLanguage`**

Trong `src/hooks/useSettingsForm.ts`, đổi khối `if` ở dòng ~29:

```ts
  if (normalized === "en" || normalized === "ja" || normalized === "vi") {
    return normalized;
  }
```

Và thêm khối này **ngay trước** `if (normalized.startsWith("zh"))`:

```ts
  if (normalized.startsWith("vi")) {
    return "vi";
  }
```

- [x] **Step 5: Sửa `isSupportedLanguage`**

```ts
export const isSupportedLanguage = (lang?: string | null): boolean => {
  if (!lang) return false;
  const normalized = lang.toLowerCase().replace(/_/g, "-");
  return (
    normalized === "en" ||
    normalized === "ja" ||
    normalized.startsWith("vi") ||
    normalized.startsWith("zh")
  );
};
```

- [x] **Step 6: Sửa `getLocaleFromLanguage`**

Trong `src/components/usage/format.ts`, thêm **ngay trước** `return "en-US";` cuối hàm:

```ts
  if (normalized.startsWith("vi")) return "vi-VN";
```

- [x] **Step 7: Chạy test để xác nhận pass**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS — 4 test.

- [x] **Step 8: Typecheck**

Run: `pnpm typecheck`
Expected: không có output (thành công).

- [x] **Step 9: Commit**

```bash
git add src/hooks/useSettingsForm.ts src/components/usage/format.ts tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): accept vi as a supported language tag"
```

---

## Task 2: Menu khay hệ thống (Rust)

Menu khay được dựng ở Rust, hoàn toàn độc lập với i18next.

**Files:**
- Modify: `src-tauri/src/tray.rs` — `map_locale_to_tray_language()` (~dòng 70), `TrayTexts::from_language()` (~dòng 100), khối test (~dòng 1140)

- [x] **Step 1: Viết test thất bại**

Thêm vào khối `#[cfg(test)] mod tests` sẵn có trong `src-tauri/src/tray.rs`, đặt cạnh các test locale khác:

```rust
    #[test]
    fn locale_maps_vietnamese_variants_to_vi() {
        use super::map_locale_to_tray_language;
        for locale in ["vi", "vi-VN", "vi-vn", "vi_VN"] {
            assert_eq!(
                map_locale_to_tray_language(locale),
                "vi",
                "expected {locale} -> vi"
            );
        }
    }
```

- [x] **Step 2: Ghi nhận là không chạy được test cục bộ**

Không chạy `cargo test` — máy này thiếu MSVC linker (xem mục Môi trường build). Test sẽ được xác minh trên GitHub Actions ở Task 9.

- [x] **Step 3: Thêm nhận diện locale**

Trong `map_locale_to_tray_language()`, thêm nhánh **trước** nhánh `else` cuối:

```rust
    } else if locale.starts_with("vi") {
        "vi"
    } else {
        "zh"
    }
```

Lưu ý: hàm đã gọi `locale.to_lowercase()` ở đầu, nên `vi_VN` cần được xử lý — nếu chuỗi có `_`, `starts_with("vi")` vẫn khớp, không cần thay `_` thành `-`.

- [x] **Step 4: Cập nhật doc comment của hàm**

Doc comment hiện nói rõ hàm này phản chiếu thứ tự phán đoán của frontend. Thêm tiếng Việt vào danh sách:

```rust
/// 繁中系统（zh-TW/HK/MO/Hant）→ `zh-TW`，其余 zh → `zh`，
/// 日文 → `ja`，英文 → `en`，越南语 → `vi`，未知区域回退到 `zh`（与前端默认一致）。
```

- [x] **Step 5: Thêm nhánh `vi` vào `TrayTexts::from_language()`**

Đặt sau nhánh `"zh-TW"`, trước nhánh `_`:

```rust
            "vi" => Self {
                show_main: "Mở cửa sổ chính",
                open_website: "Mở trang chủ",
                no_providers_label: "(chưa có provider)",
                lightweight_mode: "Chế độ nhẹ",
                quit: "Thoát",
                _auto_label: "Tự động (failover)",
                projects_label: "Dự án",
                no_project_label: "Không dùng dự án",
            },
```

- [x] **Step 6: Commit**

```bash
git add src-tauri/src/tray.rs
git commit -m "feat(tray): add Vietnamese tray menu strings"
```

---

## Task 3: Tạo `vi.json`, nối vào i18n, thêm nút chọn

Task này làm cho ứng dụng **thực sự chuyển được sang tiếng Việt**. Dịch luôn 4 namespace nhỏ để có thứ nhìn thấy được, đồng thời dựng bộ test đối chiếu dùng cho mọi task dịch về sau.

**Files:**
- Create: `src/i18n/locales/vi.json`
- Modify: `src/i18n/index.ts`
- Modify: `src/components/settings/LanguageSettings.tsx:5`, `:36-38`
- Modify: `src/i18n/locales/en.json`, `ja.json`, `zh.json`, `zh-TW.json` — thêm 1 key
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Tạo `src/i18n/locales/vi.json`**

Nội dung đầy đủ (đây là chuẩn văn phong cho các task dịch sau — bám sát nó):

```json
{
  "common": {
    "add": "Thêm",
    "edit": "Sửa",
    "delete": "Xóa",
    "save": "Lưu",
    "saving": "Đang lưu...",
    "cancel": "Hủy",
    "confirm": "Xác nhận",
    "close": "Đóng",
    "done": "Xong",
    "settings": "Cài đặt",
    "about": "Giới thiệu",
    "version": "Phiên bản",
    "loading": "Đang tải...",
    "notInstalled": "Chưa cài đặt",
    "success": "Thành công",
    "error": "Lỗi",
    "unknown": "Không rõ",
    "enterValidValue": "Vui lòng nhập giá trị hợp lệ",
    "clear": "Xóa trắng",
    "toggleTheme": "Đổi giao diện sáng/tối",
    "format": "Định dạng",
    "formatSuccess": "Đã định dạng",
    "formatError": "Định dạng thất bại: {{error}}",
    "copy": "Sao chép",
    "view": "Xem",
    "back": "Quay lại",
    "refresh": "Làm mới",
    "refreshing": "Đang làm mới...",
    "import": "Nhập",
    "all": "Tất cả",
    "search": "Tìm kiếm",
    "reset": "Đặt lại",
    "actions": "Thao tác",
    "deleting": "Đang xóa...",
    "auto": "Tự động",
    "enabled": "Đang bật",
    "notSet": "Chưa đặt"
  },
  "apps": {
    "claude": "Claude",
    "claudeCode": "Claude Code",
    "claudeDesktop": "Claude Desktop",
    "claude-desktop": "Claude Desktop",
    "codex": "Codex",
    "gemini": "Gemini",
    "grokbuild": "Grok Build",
    "opencode": "OpenCode",
    "openclaw": "OpenClaw",
    "hermes": "Hermes"
  },
  "header": {
    "viewOnGithub": "Xem trên GitHub",
    "toggleDarkMode": "Chuyển sang giao diện tối",
    "toggleLightMode": "Chuyển sang giao diện sáng",
    "addProvider": "Thêm provider",
    "switchToChinese": "Chuyển sang tiếng Trung",
    "switchToEnglish": "Chuyển sang tiếng Anh",
    "enterEditMode": "Vào chế độ chỉnh sửa",
    "exitEditMode": "Thoát chế độ chỉnh sửa",
    "windowMinimize": "Thu nhỏ cửa sổ",
    "windowMaximize": "Phóng to cửa sổ",
    "windowRestore": "Khôi phục cửa sổ",
    "windowClose": "Đóng cửa sổ"
  },
  "errors": {
    "usage_query_failed": "Truy vấn usage thất bại",
    "configLoadFailedTitle": "Không đọc được cấu hình",
    "configLoadFailedMessage": "Không đọc được file cấu hình:\n{{path}}\n\nChi tiết lỗi:\n{{detail}}\n\nKiểm tra xem JSON có hợp lệ không, hoặc khôi phục từ file backup (ví dụ config.json.bak) trong cùng thư mục.\n\nỨng dụng sẽ thoát để xử lý sự cố này.",
    "frontendCrashTitle": "Giao diện gặp sự cố",
    "frontendCrashMessage": "Lỗi đã được ghi vào log chẩn đoán của ứng dụng. Hãy tải lại giao diện, và đính kèm log khi báo lỗi nếu sự cố còn tiếp diễn.",
    "reloadInterface": "Tải lại giao diện"
  },
  "settings": {
    "languageOptionVietnamese": "Tiếng Việt"
  }
}
```

Chú ý `apps` giữ nguyên tiếng Anh vì toàn bộ là tên sản phẩm.

- [x] **Step 2: Thêm nhãn nút vào 4 locale còn lại**

Trong **mỗi** file `src/i18n/locales/en.json`, `ja.json`, `zh.json`, `zh-TW.json`, thêm vào object `settings`, ngay sau key `languageOptionJapanese`:

```json
    "languageOptionVietnamese": "Tiếng Việt",
```

Giá trị **giống hệt nhau ở cả 4 file**. Đây là quy ước sẵn có của codebase: 4 key `languageOption*` hiện tại đều mang giá trị y hệt nhau ở mọi locale, viết bằng chính ngôn ngữ đó (`简体中文`, `繁體中文`, `English`, `日本語`). Không dịch tên ngôn ngữ.

- [x] **Step 3: Viết test đối chiếu thất bại**

Thêm vào `tests/i18n/vietnameseLocale.test.ts`:

```ts
import en from "@/i18n/locales/en.json";
import vi from "@/i18n/locales/vi.json";

/**
 * Các namespace đã dịch. Mỗi task dịch sau phải thêm tên namespace vào đây —
 * test sẽ ép namespace đó phải khớp hoàn toàn với en.json.
 */
const TRANSLATED_NAMESPACES = ["common", "apps", "header", "errors"];

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Json, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(.*?)\}\}/g)]
    .map((m) => m[1].trim())
    .sort();
}

describe("Vietnamese locale completeness", () => {
  it.each(TRANSLATED_NAMESPACES)(
    "namespace %s has exactly the same keys as en.json",
    (ns) => {
      const enKeys = Object.keys(flatten((en as Json)[ns] as Json)).sort();
      const viKeys = Object.keys(flatten((vi as Json)[ns] as Json)).sort();
      expect(viKeys).toEqual(enKeys);
    },
  );

  it.each(TRANSLATED_NAMESPACES)(
    "namespace %s keeps every interpolation placeholder",
    (ns) => {
      const enFlat = flatten((en as Json)[ns] as Json);
      const viFlat = flatten((vi as Json)[ns] as Json);
      for (const [key, enValue] of Object.entries(enFlat)) {
        expect(placeholders(viFlat[key] ?? "")).toEqual(placeholders(enValue));
      }
    },
  );

  it("exposes the Vietnamese language button label", () => {
    expect((vi as Json).settings).toHaveProperty(
      "languageOptionVietnamese",
      "Tiếng Việt",
    );
  });
});
```

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS. Nếu FAIL ở "same keys" nghĩa là `vi.json` thiếu hoặc thừa key so với `en.json` — sửa `vi.json`, đừng sửa test.

- [x] **Step 5: Đăng ký locale trong `src/i18n/index.ts`**

Bốn thay đổi trong file này.

Thêm import cạnh các import locale khác:

```ts
import vi from "./locales/vi.json";
```

Mở rộng type (dòng 9):

```ts
type Language = "zh" | "zh-TW" | "en" | "ja" | "vi";
```

Trong `getInitialLanguage()`, thêm `stored === "vi"` vào khối kiểm tra `localStorage`:

```ts
      if (
        stored === "zh" ||
        stored === "zh-TW" ||
        stored === "en" ||
        stored === "ja" ||
        stored === "vi"
      ) {
        return stored;
      }
```

Thêm nhận diện `navigator.language`, đặt **trước** nhánh `en`:

```ts
  if (navigatorLang?.startsWith("vi")) {
    return "vi";
  }
```

Thêm vào `resources`:

```ts
  vi: {
    translation: vi,
  },
```

**Không đổi** `DEFAULT_LANGUAGE` (vẫn `"zh"`) và `fallbackLng` (vẫn `"en"`) — fallback chính là thứ giữ cho các namespace chưa dịch không vỡ.

- [x] **Step 6: Thêm nút chọn ngôn ngữ**

Trong `src/components/settings/LanguageSettings.tsx`, mở rộng type ở dòng 5:

```ts
type LanguageOption = "zh" | "zh-TW" | "en" | "ja" | "vi";
```

Thêm nút sau nút Japanese (sau dòng 38):

```tsx
        <LanguageButton active={value === "vi"} onClick={() => onChange("vi")}>
          {t("settings.languageOptionVietnamese")}
        </LanguageButton>
```

- [x] **Step 7: Chống tràn hàng nút**

Hàng nút hiện là `inline-flex` với `min-w-[96px]` mỗi nút. Nút thứ 5 làm hàng rộng thêm ~96px. Cửa sổ tối thiểu là 900px (`src-tauri/tauri.conf.json`, `minWidth`). Thêm `flex-wrap` để an toàn — sửa `className` của div bọc ở dòng 23:

```tsx
      <div className="inline-flex flex-wrap gap-1 rounded-md border border-border-default bg-background p-1">
```

- [x] **Step 8: Typecheck và chạy toàn bộ test**

Run: `pnpm typecheck`
Expected: không có output.

Run: `pnpm test:unit`
Expected: mọi test pass **trừ** 3 test đỏ sẵn ở `tests/hooks/useSettingsForm.test.tsx` và `tests/integration/App.test.tsx`.

- [x] **Step 9: Kiểm tra định dạng**

Run: `pnpm format:check`
Expected: PASS. Nếu fail, chạy `pnpm prettier --write` lên đúng các file vừa sửa.

- [x] **Step 10: Commit**

```bash
git add src/i18n src/components/settings/LanguageSettings.tsx tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): add Vietnamese locale with the first four namespaces"
```

---

## Task 4: Dịch `confirm` (27 key) và `notifications` (46 key)

**Files:**
- Modify: `src/i18n/locales/vi.json`
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Đọc nội dung gốc**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/i18n/locales/en.json',encoding='utf-8'));print(json.dumps({k:d[k] for k in ['confirm','notifications']},ensure_ascii=False,indent=2))"
```

- [x] **Step 2: Dịch và thêm vào `vi.json`**

Thêm hai object `confirm` và `notifications` vào `src/i18n/locales/vi.json`, giữ đúng thứ tự key như `en.json`. Bám quy ước dịch ở đầu plan và văn phong của `common` trong Task 3.

Đây là các chuỗi hộp thoại xác nhận và toast. Ưu tiên ngắn gọn, dùng thể mệnh lệnh. Ví dụ: `"deleteProvider": "Xóa provider \"{{name}}\"?"`.

- [x] **Step 3: Đăng ký namespace vào test**

Trong `tests/i18n/vietnameseLocale.test.ts`:

```ts
const TRANSLATED_NAMESPACES = [
  "common",
  "apps",
  "header",
  "errors",
  "confirm",
  "notifications",
];
```

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS. Fail ở "same keys" = thiếu/thừa key. Fail ở "placeholder" = làm mất `{{...}}` khi dịch.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.json tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): translate confirm and notifications into Vietnamese"
```

---

## Task 5: Dịch `provider` (72 key)

**Files:**
- Modify: `src/i18n/locales/vi.json`
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Đọc nội dung gốc**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/i18n/locales/en.json',encoding='utf-8'));print(json.dumps(d['provider'],ensure_ascii=False,indent=2))"
```

- [x] **Step 2: Dịch và thêm vào `vi.json`**

Đây là nhãn trên card provider và các nút thao tác. Từ `provider` **giữ nguyên tiếng Anh**. Chuỗi ngắn, hiển thị trong không gian hẹp — ưu tiên ngắn gọn.

- [x] **Step 3: Đăng ký namespace vào test**

Thêm `"provider"` vào mảng `TRANSLATED_NAMESPACES`.

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.json tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): translate provider namespace into Vietnamese"
```

---

## Task 6: Dịch `providerForm` (167 key)

**Files:**
- Modify: `src/i18n/locales/vi.json`
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Đọc nội dung gốc**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/i18n/locales/en.json',encoding='utf-8'));print(json.dumps(d['providerForm'],ensure_ascii=False,indent=2))"
```

- [x] **Step 2: Dịch và thêm vào `vi.json`**

Form thêm/sửa provider. Nhiều nhãn trường và text trợ giúp. Giữ nguyên tiếng Anh: `API key`, `base URL`, `model`, `endpoint`, `token`, `proxy`. Dịch phần mô tả và thông báo lỗi validate.

- [x] **Step 3: Đăng ký namespace vào test**

Thêm `"providerForm"` vào mảng `TRANSLATED_NAMESPACES`.

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.json tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): translate providerForm namespace into Vietnamese"
```

---

## Task 7: Dịch `usage` (208 key)

**Files:**
- Modify: `src/i18n/locales/vi.json`
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Đọc nội dung gốc**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/i18n/locales/en.json',encoding='utf-8'));print(json.dumps(d['usage'],ensure_ascii=False,indent=2))"
```

- [x] **Step 2: Dịch và thêm vào `vi.json`**

Dashboard chi phí, biểu đồ, log request. Giữ nguyên: `token`, `cache`, `input`/`output` (khi là tên loại token), `model`, `provider`, `request`. Namespace này có nhiều key dạng số nhiều và nhiều placeholder `{{count}}` — cẩn thận đừng làm mất.

- [x] **Step 3: Đăng ký namespace vào test**

Thêm `"usage"` vào mảng `TRANSLATED_NAMESPACES`.

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.json tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): translate usage namespace into Vietnamese"
```

---

## Task 8: Dịch `settings` (485 key)

Namespace lớn nhất. Lưu ý `settings.languageOptionVietnamese` **đã được thêm ở Task 3** — giữ nguyên, đừng tạo trùng.

**Files:**
- Modify: `src/i18n/locales/vi.json`
- Modify: `tests/i18n/vietnameseLocale.test.ts`

- [x] **Step 1: Đọc nội dung gốc**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "import json;d=json.load(open('src/i18n/locales/en.json',encoding='utf-8'));print(json.dumps(d['settings'],ensure_ascii=False,indent=2))"
```

- [x] **Step 2: Dịch và thêm vào `vi.json`**

Toàn bộ trang Cài đặt: thư mục cấu hình, proxy, WebDAV/S3 sync, backup, cập nhật, khởi động cùng hệ thống, log. Giữ nguyên: `proxy`, `endpoint`, `WebDAV`, `S3`, `backup`, `sync`, `token`, `log`, `MCP`.

Nhiều key là text trợ giúp dài — dịch cho tự nhiên, đừng dịch từng từ.

- [x] **Step 3: Đăng ký namespace vào test**

Thêm `"settings"` vào mảng `TRANSLATED_NAMESPACES`. Mảng cuối cùng phải là:

```ts
const TRANSLATED_NAMESPACES = [
  "common",
  "apps",
  "header",
  "errors",
  "confirm",
  "notifications",
  "provider",
  "providerForm",
  "usage",
  "settings",
];
```

- [x] **Step 4: Chạy test**

Run: `pnpm vitest run tests/i18n/vietnameseLocale.test.ts`
Expected: PASS — 10 namespace đều khớp key và placeholder.

- [x] **Step 5: Commit**

```bash
git add src/i18n/locales/vi.json tests/i18n/vietnameseLocale.test.ts
git commit -m "feat(i18n): translate settings namespace into Vietnamese"
```

---

## Task 9: Xác minh toàn bộ

**Files:** không sửa file nào — chỉ chạy kiểm tra.

- [x] **Step 1: Chạy toàn bộ kiểm tra frontend**

Run:
```bash
pnpm typecheck && pnpm format:check && pnpm test:unit
```
Expected: typecheck và format sạch. Test: mọi test pass **trừ** 3 test đỏ sẵn ở `tests/hooks/useSettingsForm.test.tsx` và `tests/integration/App.test.tsx`.

- [x] **Step 2: Xác nhận số key đã dịch**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "
import json
vi=json.load(open('src/i18n/locales/vi.json',encoding='utf-8'))
def c(o): return sum(c(v) if isinstance(v,dict) else 1 for v in o.values())
print(c(vi),'keys translated')
"
```
Expected: 1.070 (± vài key, do `settings.languageOptionVietnamese` là key mới thêm chứ không có trong bản gốc).

- [x] **Step 3: Xác nhận `vi.json` là UTF-8 không BOM**

Run:
```bash
PYTHONIOENCODING=utf-8 python -c "
raw=open('src/i18n/locales/vi.json','rb').read()
print('BOM detected' if raw.startswith(b'\xef\xbb\xbf') else 'UTF-8 without BOM: OK')
"
```
Expected: `UTF-8 without BOM: OK`

- [x] **Step 4: Đẩy nhánh để GitHub Actions build và chạy test Rust**

Phần Rust ở Task 2 chưa từng được compile. Push để CI xác minh:

```bash
git push fork feat/vietnamese-locale
```

Workflow `.github/workflows/build-windows.yml` tự chạy với nhánh khớp `feat/**`.

- [x] **Step 5: Kiểm tra kết quả CI**

Mở tab Actions của repo, chờ workflow "Build Windows exe" hoàn tất. Nếu bước build đỏ, đọc log — nguyên nhân nhiều khả năng là lỗi cú pháp Rust ở `tray.rs`.

Muốn có bản exe gọn để kiểm tra thủ công, tạo commit rỗng có cờ `[release]`:

```bash
git commit --allow-empty -m "ci: build release exe for manual verification [release]"
git push fork feat/vietnamese-locale
```

Kết quả tải ở tab Releases, prerelease `dev-release-<số run>`, dạng zip.

- [x] **Step 6: Kiểm tra thủ công**

Thoát hoàn toàn mọi bản CC Switch đang chạy (kể cả icon dưới khay hệ thống — app dùng single-instance, mở bản mới khi bản cũ còn sống sẽ chỉ focus cửa sổ cũ). Chạy exe vừa tải, rồi kiểm tra:

1. Cài đặt → hàng nút ngôn ngữ có 5 nút, không tràn, không đè lên nhau
2. Bấm "Tiếng Việt" → giao diện đổi ngay, không cần khởi động lại
3. Menu khay hệ thống đổi sang tiếng Việt ("Mở cửa sổ chính", "Thoát"…)
4. Đóng và mở lại app → vẫn giữ tiếng Việt
5. Mở trang MCP hoặc Skills → hiện **tiếng Anh**, không phải key thô kiểu `mcp.title`
6. Dashboard usage → số và ngày theo định dạng Việt Nam

- [x] **Step 7: Commit kết quả nếu có sửa gì**

Nếu bước 6 lộ ra lỗi, sửa rồi commit. Nếu không, task hoàn tất.
