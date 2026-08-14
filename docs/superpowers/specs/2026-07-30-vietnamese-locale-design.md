# Thêm ngôn ngữ tiếng Việt cho CC Switch

**Ngày:** 2026-07-30
**Nhánh:** `feat/vietnamese-locale`, chồng trên `fix/usage-reset-time-local-tz` tại `82cbae4e`
**Trạng thái:** Đã duyệt thiết kế, chờ triển khai

Nhánh này cố tình xếp chồng lên nhánh fix timezone thay vì tách thẳng từ `main`, vì cần giữ hai thứ ở đó: bản vá hiển thị giờ reset theo múi giờ máy, và workflow `.github/workflows/build-windows.yml` — thứ duy nhất build được exe trên máy dev này (xem mục 9).

---

## 1. Bối cảnh

CC Switch hiện hỗ trợ 4 ngôn ngữ: `zh` (giản thể, mặc định), `zh-TW` (phồn thể), `en`, `ja`. Chủ fork là người Việt và dùng ứng dụng hằng ngày, nên muốn có giao diện tiếng Việt.

Đây là fork cá nhân (`chinchindev/cc-switch`), **không nhằm gửi PR ngược lên `farion1231/cc-switch`**. Vì vẫn phải merge upstream định kỳ, thiết kế ưu tiên **thêm nhánh mới vào cấu trúc sẵn có** thay vì sửa logic — giảm tối đa xung đột khi merge.

Kết quả mong muốn: chọn được "Tiếng Việt" trong Cài đặt, các màn hình dùng hằng ngày hiển thị tiếng Việt, phần chưa dịch tự động hiện tiếng Anh thay vì vỡ giao diện.

## 2. Phạm vi

### 2.1 Trong phạm vi — đợt 1: 1.070 key

`src/i18n/locales/en.json` có tổng cộng 2.669 key. Đợt 1 dịch 10 namespace tương ứng các màn hình dùng thường xuyên nhất:

| Namespace | Số key | Màn hình |
|---|---:|---|
| `settings` | 485 | Toàn bộ trang Cài đặt |
| `usage` | 208 | Dashboard chi phí, biểu đồ, log request |
| `providerForm` | 167 | Form thêm/sửa provider |
| `provider` | 72 | Card provider, nút thao tác |
| `notifications` | 46 | Toast thành công/lỗi |
| `common` | 37 | Nút dùng chung |
| `confirm` | 27 | Hộp thoại xác nhận |
| `header` | 12 | Thanh tiêu đề |
| `apps` | 10 | Tên 8 app type |
| `errors` | 6 | Lỗi chung |
| **Tổng** | **1.070** | |

### 2.2 Ngoài phạm vi đợt 1

Các namespace còn lại (`mcp`, `skills`, `proxy`, `omo`, `openclaw`, `sessionManager`, `usageScript`, `deeplink`, `codexConfig`, `hermes`, `opencode`, `universalProvider`, `workspace`, `claudeDesktop`, `copilot`, `profiles`, `endpointTest`, `openclawConfig`, `circuitBreaker`, `env`, `codexOauth`, `subscription`, `xaiOauth`, `geminiConfig`, `console`, `dbUpgrade`, `claudeConfig`, `proxyConfig`, `streamCheck`, `providerPreset`, `providerAdvanced`, `failover`, `providerIcon`, `iconPicker`, `commonConfig`, `grokBuild`, `presetSelector`, `health`, `migration`, `firstRunNotice`, `codex`, `apiKeyInput`, `managedAuth`, `jsonEditor`, `claudeCode`, `app`, `agents`) **không dịch** ở đợt này. Chúng tự hiện tiếng Anh nhờ `fallbackLng`.

Cũng ngoài phạm vi: dịch tài liệu (`README*.md`, `docs/`), dịch comment trong code, đổi ngôn ngữ mặc định của ứng dụng.

## 3. Lưới an toàn: fallback

`src/i18n/index.ts` đã cấu hình:

```ts
fallbackLng: "en",
```

Key nào thiếu trong `vi.json` sẽ tự lấy từ `en.json`. Không hiện key thô, không vỡ layout. Đây là điều kiện cho phép dịch từng đợt — **không được đổi giá trị này**.

## 4. Quy ước dịch

Theo `CLAUDE.md` của chủ fork: *"Code, tên biến, tên hàm, thuật ngữ kỹ thuật giữ nguyên tiếng Anh."*

### 4.1 Giữ nguyên tiếng Anh

`provider`, `proxy`, `token`, `endpoint`, `failover`, `circuit breaker`, `MCP`, `skill`, `prompt`, `session`, `API key`, `base URL`, `model`, `profile`, `workspace`, `deep link`, `OAuth`, `webhook`, `cache`, `log`, `commit`, `backup`, `sync`, `import`/`export`.

Tên sản phẩm giữ nguyên: Claude Code, Claude Desktop, Codex, Gemini CLI, Grok Build, OpenCode, OpenClaw, Hermes.

### 4.2 Dịch sang tiếng Việt

Câu mô tả, nhãn nút, thông báo lỗi, tooltip, hộp thoại xác nhận, tiêu đề mục.

### 4.3 Ví dụ

| Key | ❌ Sai | ✅ Đúng |
|---|---|---|
| `provider.deleteConfirm` | "Xóa nhà cung cấp này?" | "Xóa provider này?" |
| `settings.proxyPort` | "Cổng máy chủ ủy quyền" | "Cổng proxy" |
| `common.save` | — | "Lưu" |
| `usage.totalTokens` | "Tổng số thẻ bài" | "Tổng token" |
| `notifications.switchSuccess` | — | "Đã chuyển sang {{name}}" |

### 4.4 Ràng buộc kỹ thuật khi dịch

- **Giữ nguyên mọi placeholder** `{{name}}`, `{{count}}`, `{{tool}}`… kể cả vị trí trong câu có đổi.
- **Giữ nguyên cấu trúc plural** của i18next (`_one`, `_other`) nếu key gốc có.
- **Encoding UTF-8 không BOM** cho `vi.json`.
- Giữ nguyên thứ tự key như `en.json` để dễ so sánh diff.
- Xưng hô trung tính, không dùng "bạn"/"anh" — dùng thể mệnh lệnh hoặc lược chủ ngữ ("Nhập API key", "Không tìm thấy provider").

## 5. Các điểm cần sửa

### 5.1 `src/i18n/locales/vi.json` — TẠO MỚI

Chép cấu trúc từ `en.json`, chỉ giữ 10 namespace ở mục 2.1, dịch toàn bộ giá trị.

### 5.2 `src/i18n/index.ts`

Ba thay đổi:

```ts
import vi from "./locales/vi.json";                    // thêm import

type Language = "zh" | "zh-TW" | "en" | "ja" | "vi";   // mở rộng type
```

Trong `getInitialLanguage()`, thêm `"vi"` vào danh sách giá trị hợp lệ đọc từ `localStorage`, và thêm nhánh nhận diện `navigator.language` **trước** nhánh `en`:

```ts
if (navigatorLang?.startsWith("vi")) {
  return "vi";
}
```

Trong `resources`, thêm:

```ts
vi: { translation: vi },
```

**Không đổi** `DEFAULT_LANGUAGE` (vẫn `zh`) và `fallbackLng` (vẫn `en`).

### 5.3 `src/components/settings/LanguageSettings.tsx`

Mở rộng type ở dòng 5 và thêm nút thứ 5 sau nút Japanese:

```tsx
type LanguageOption = "zh" | "zh-TW" | "en" | "ja" | "vi";
```

```tsx
<LanguageButton active={value === "vi"} onClick={() => onChange("vi")}>
  {t("settings.languageOptionVietnamese")}
</LanguageButton>
```

Cần thêm key `settings.languageOptionVietnamese` vào **cả 5** file locale (`en`, `ja`, `zh`, `zh-TW`, `vi`) với **cùng một giá trị `"Tiếng Việt"`**.

Đã kiểm chứng: 4 key `languageOption*` hiện có mang giá trị **giống hệt nhau ở cả 4 file locale**, luôn viết bằng chính ngôn ngữ đó — `简体中文`, `繁體中文`, `English`, `日本語`. Không file nào dịch tên ngôn ngữ sang ngôn ngữ của mình. Cứ theo đúng quy ước đó.

Lưu ý layout: hàng nút dùng `inline-flex` với `min-w-[96px]` mỗi nút. Thêm nút thứ 5 làm hàng rộng thêm ~96px — cần kiểm tra ở bề rộng cửa sổ tối thiểu (`minWidth: 900` trong `tauri.conf.json`) xem có tràn không. Nếu tràn, cho phép xuống dòng bằng `flex-wrap`.

### 5.4 `src/hooks/useSettingsForm.ts`

```ts
type Language = "zh" | "zh-TW" | "en" | "ja" | "vi";
```

Trong `normalizeLanguage()`, sửa điều kiện dòng ~29:

```ts
if (normalized === "en" || normalized === "ja" || normalized === "vi") {
  return normalized;
}
```

Và thêm nhận diện tiền tố (cho các giá trị kiểu `vi-VN`), đặt trước nhánh `return "zh"` cuối:

```ts
if (normalized.startsWith("vi")) {
  return "vi";
}
```

Trong `isSupportedLanguage()`:

```ts
return (
  normalized === "en" ||
  normalized === "ja" ||
  normalized.startsWith("vi") ||
  normalized.startsWith("zh")
);
```

### 5.5 `src/components/usage/format.ts`

Trong `getLocaleFromLanguage()`, thêm trước dòng `return "en-US"` cuối:

```ts
if (normalized.startsWith("vi")) return "vi-VN";
```

Ảnh hưởng: định dạng số, tiền tệ và ngày giờ trong dashboard usage sẽ theo chuẩn Việt Nam.

### 5.6 `src-tauri/src/tray.rs`

Menu khay hệ thống được dựng ở Rust, độc lập với i18next.

Thêm nhánh `"vi"` vào `TrayTexts::from_language()` (8 chuỗi):

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

Thêm nhận diện locale vào `map_locale_to_tray_language()`, đặt cùng nhóm với `ja`/`en`:

```rust
} else if locale.starts_with("vi") {
    "vi"
}
```

Hàm này có doc comment mô tả thứ tự phán đoán — **cập nhật comment** cho khớp, vì nó nói rõ là "镜像前端 `i18n/getInitialLanguage` 的判定顺序" (phản chiếu thứ tự của frontend). Thứ tự hai bên phải khớp nhau.

## 6. Luồng dữ liệu

Không thêm luồng mới. Ngôn ngữ đã được lưu song song ở hai nơi:

- `localStorage["language"]` — UI đọc khi khởi động (`getInitialLanguage`)
- `settings.language` trong SQLite — Rust đọc khi dựng menu khay (`tray.rs:647`)

`useSettingsForm.syncLanguage()` giữ hai bên đồng bộ. Việc cần làm chỉ là nới danh sách giá trị hợp lệ ở cả hai phía.

Khi `settings.language` chưa có (cài lần đầu), Rust gọi `detect_system_tray_language()` → `sys_locale::get_locale()` → `map_locale_to_tray_language()`. Đó là lý do 5.6 phải khớp thứ tự với 5.2.

## 7. Xử lý lỗi

Không phát sinh đường lỗi mới:

- Key thiếu trong `vi.json` → fallback `en` (mục 3)
- Locale không nhận diện được → `normalizeLanguage()` trả `"zh"`
- Rust `TrayTexts::from_language()` có nhánh `_` bắt hết → về `zh`
- `getLocaleFromLanguage()` có `return "en-US"` cuối hàm

## 8. Kiểm thử

### 8.1 Rust — `src-tauri/src/tray.rs`

Trong khối `#[cfg(test)]` sẵn có (quanh dòng 1140), thêm test theo đúng khuôn mẫu các test locale hiện có:

```rust
#[test]
fn locale_maps_vietnamese_variants_to_vi() {
    use super::map_locale_to_tray_language;
    for locale in ["vi", "vi-VN", "vi-vn"] {
        assert_eq!(
            map_locale_to_tray_language(locale),
            "vi",
            "expected {locale} -> vi"
        );
    }
}
```

### 8.2 TypeScript

Thêm test mới `tests/i18n/vietnameseLocale.test.ts`:

- `getLocaleFromLanguage("vi") === "vi-VN"`, `getLocaleFromLanguage("vi-VN") === "vi-VN"`
- `normalizeLanguage("vi")` và `normalizeLanguage("vi-VN")` đều trả `"vi"`
- `isSupportedLanguage("vi") === true`
- **Kiểm tra tính toàn vẹn key:** với mỗi namespace trong đợt 1, tập key của `vi.json` phải **bằng đúng** tập key của `en.json` — không thiếu, không thừa. Test này bắt lỗi sót key và lỗi gõ nhầm tên key.
- **Kiểm tra placeholder:** với mỗi key đã dịch, tập placeholder `{{...}}` trong `vi.json` phải bằng tập trong `en.json`. Đây là lỗi dịch phổ biến nhất và không thể phát hiện bằng mắt trên 1.070 chuỗi.

### 8.3 Kiểm tra thủ công

Mở app, vào Cài đặt → chọn Tiếng Việt → kiểm tra: giao diện đổi ngay không cần khởi động lại; menu khay hệ thống đổi sang tiếng Việt; đóng mở lại app vẫn giữ tiếng Việt; các màn hình chưa dịch (MCP, Skills) hiện tiếng Anh chứ không phải key thô.

## 9. Xác minh

```bash
pnpm typecheck              # type Language mở rộng đúng ở cả 3 nơi
pnpm test:unit              # gồm test toàn vẹn key + placeholder
pnpm format:check
cd src-tauri && cargo fmt --check && cargo clippy && cargo test
```

**Lưu ý về máy hiện tại:** máy dev chưa cài Visual Studio C++ Build Tools và không có quyền admin, nên **không build/test Rust cục bộ được** — `cargo` sẽ dừng ở bước link. Phần Rust phải xác minh qua GitHub Actions.

Workflow `.github/workflows/build-windows.yml` đã có sẵn trên nhánh này (thừa hưởng từ nhánh gốc). Nó tự chạy khi push nhánh khớp `feat/**`, mặc định build `debug`; muốn bản `release` thì thêm `[release]` vào commit message. Kết quả đăng thành prerelease asset dạng zip — **không dùng Actions artifact**, vì link tải artifact trỏ sang `*.blob.core.windows.net` và bị mạng của chủ fork chặn.

Nếu build từ Git Bash trên máy Windows: **đừng**. Git Bash có `/usr/bin/link.exe` của GNU coreutils che mất linker MSVC, gây lỗi `link: extra operand` rất khó đoán. Dùng PowerShell.

Baseline: `tests/hooks/useSettingsForm.test.tsx` và `tests/integration/App.test.tsx` **đã fail sẵn trên `main`** (3 test). Không phải do thay đổi này gây ra, đừng mất công sửa.

## 10. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Sót placeholder khi dịch → runtime hiện chuỗi lỗi | Test tự động ở 8.2 |
| Hàng nút ngôn ngữ tràn ở cửa sổ hẹp | Kiểm tra ở 900px, thêm `flex-wrap` nếu cần |
| Thứ tự nhận diện locale lệch giữa TS và Rust | Test ở 8.1 + cập nhật doc comment ở 5.6 |
| Giao diện nửa Việt nửa Anh gây khó chịu | Đợt 1 chọn trọn vẹn theo màn hình, không cắt giữa một màn hình |
| Merge upstream xung đột | Chỉ thêm nhánh vào cấu trúc sẵn có, không sửa logic |
