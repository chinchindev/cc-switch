import { describe, expect, it } from "vitest";
import {
  normalizeLanguage,
  isSupportedLanguage,
} from "@/hooks/useSettingsForm";
import { getLocaleFromLanguage } from "@/components/usage/format";
import en from "@/i18n/locales/en.json";
import vi from "@/i18n/locales/vi.json";

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

/**
 * Các namespace đã dịch. Mỗi task dịch sau phải thêm tên namespace vào đây —
 * test sẽ ép namespace đó phải khớp hoàn toàn với en.json.
 */
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
  "mcp",
  "skills",
  "proxy",
  "omo",
  "openclaw",
  "usageScript",
  "sessionManager",
  "deeplink",
  "codexConfig",
  "hermes",
  "opencode",
  "universalProvider",
  "prompts",
  "workspace",
  "claudeDesktop",
  "copilot",
  "profiles",
  "endpointTest",
  "openclawConfig",
  "env",
  "codexOauth",
  "subscription",
  "xaiOauth",
  "geminiConfig",
  "console",
  "dbUpgrade",
  "claudeConfig",
  "proxyConfig",
  "streamCheck",
  "providerPreset",
  "providerAdvanced",
  "failover",
  "providerIcon",
  "iconPicker",
  "commonConfig",
  "grokBuild",
  "presetSelector",
  "health",
  "migration",
  "firstRunNotice",
  "codex",
  "apiKeyInput",
  "managedAuth",
  "jsonEditor",
  "claudeCode",
  "app",
  "appSwitcher",
  "agents",
];

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
  return [...value.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1].trim()).sort();
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
