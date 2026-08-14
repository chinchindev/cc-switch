import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsQuery } from "@/lib/query";
import type { Settings } from "@/types";

export type Language = "zh" | "zh-TW" | "en" | "ja" | "vi";

export type SettingsFormState = Omit<Settings, "language"> & {
  language: Language;
};

export const normalizeLanguage = (lang?: string | null): Language => {
  if (!lang) return "zh";
  const normalized = lang.toLowerCase().replace(/_/g, "-");

  if (normalized === "zh") {
    return "zh";
  }

  if (
    normalized === "zh-tw" ||
    normalized.startsWith("zh-hant") ||
    normalized.startsWith("zh-hk") ||
    normalized.startsWith("zh-mo")
  ) {
    return "zh-TW";
  }

  if (normalized === "en" || normalized === "ja" || normalized === "vi") {
    return normalized;
  }

  if (normalized.startsWith("vi")) {
    return "vi";
  }

  if (normalized.startsWith("zh")) {
    return "zh";
  }

  return "zh";
};

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

const sanitizeDir = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export interface UseSettingsFormResult {
  settings: SettingsFormState | null;
  isLoading: boolean;
  initialLanguage: Language;
  updateSettings: (updates: Partial<SettingsFormState>) => void;
  resetSettings: (serverData: Settings | null) => void;
  readPersistedLanguage: () => Language;
  syncLanguage: (lang: Language) => void;
}

/**
 * useSettingsForm - 表单状态管理
 * 负责：
 * - 表单数据状态
 * - 表单字段更新
 * - 语言同步
 * - 表单重置
 */
export function useSettingsForm(): UseSettingsFormResult {
  const { i18n } = useTranslation();
  const { data, isLoading } = useSettingsQuery();

  const [settingsState, setSettingsState] = useState<SettingsFormState | null>(
    null,
  );

  const initialLanguageRef = useRef<Language>("zh");

  const readPersistedLanguage = useCallback((): Language => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("language");
      if (isSupportedLanguage(stored)) {
        return normalizeLanguage(stored);
      }
    }
    return normalizeLanguage(i18n.language);
  }, [i18n]);

  const syncLanguage = useCallback(
    (lang: Language) => {
      const current = normalizeLanguage(i18n.language);
      if (current !== lang) {
        void i18n.changeLanguage(lang);
      }
    },
    [i18n],
  );

  // 初始化设置数据
  useEffect(() => {
    if (!data) return;

    const normalizedLanguage = normalizeLanguage(
      data.language ?? readPersistedLanguage(),
    );

    const normalized: SettingsFormState = {
      ...data,
      showInTray: data.showInTray ?? true,
      minimizeToTrayOnClose: data.minimizeToTrayOnClose ?? true,
      useAppWindowControls: data.useAppWindowControls ?? false,
      enableClaudePluginIntegration:
        data.enableClaudePluginIntegration ?? false,
      silentStartup: data.silentStartup ?? false,
      skipClaudeOnboarding: data.skipClaudeOnboarding ?? false,
      preserveCodexOfficialAuthOnSwitch:
        data.preserveCodexOfficialAuthOnSwitch ?? false,
      unifyCodexSessionHistory: data.unifyCodexSessionHistory ?? false,
      claudeConfigDir: sanitizeDir(data.claudeConfigDir),
      codexConfigDir: sanitizeDir(data.codexConfigDir),
      geminiConfigDir: sanitizeDir(data.geminiConfigDir),
      grokConfigDir: sanitizeDir(data.grokConfigDir),
      opencodeConfigDir: sanitizeDir(data.opencodeConfigDir),
      openclawConfigDir: sanitizeDir(data.openclawConfigDir),
      language: normalizedLanguage,
    };

    setSettingsState(normalized);
    initialLanguageRef.current = normalizedLanguage;
    syncLanguage(normalizedLanguage);
    // readPersistedLanguage/syncLanguage intentionally omitted: they wrap
    // i18n from useTranslation(), whose reference churns for a render or two
    // right after any changeLanguage() call. Depending on them here re-fires
    // this effect and clobbers local edits (resetSettings/updateSettings)
    // with stale server `data`. Both read i18n.language live, so using the
    // closure from whichever render last saw a new `data` is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const updateSettings = useCallback(
    (updates: Partial<SettingsFormState>) => {
      // syncLanguage (i18n.changeLanguage) is a side effect and must run
      // outside the setState updater below — React may invoke that updater
      // more than once per commit, and in production changeLanguage emits
      // 'languageChanged', which forces a render of every useTranslation()
      // consumer; doing that from inside another component's state updater
      // triggers React's "Cannot update a component while rendering a
      // different component" warning.
      const normalizedLanguage = updates.language
        ? normalizeLanguage(updates.language)
        : undefined;
      if (normalizedLanguage) {
        syncLanguage(normalizedLanguage);
      }

      setSettingsState((prev) => {
        const base =
          prev ??
          ({
            showInTray: true,
            minimizeToTrayOnClose: true,
            useAppWindowControls: false,
            enableClaudePluginIntegration: false,
            skipClaudeOnboarding: false,
            preserveCodexOfficialAuthOnSwitch: false,
            unifyCodexSessionHistory: false,
            language: readPersistedLanguage(),
          } as SettingsFormState);

        const next: SettingsFormState = {
          ...base,
          ...updates,
        };

        if (normalizedLanguage) {
          next.language = normalizedLanguage;
        }

        return next;
      });
    },
    [readPersistedLanguage, syncLanguage],
  );

  const resetSettings = useCallback(
    (serverData: Settings | null) => {
      if (!serverData) return;

      const normalizedLanguage = normalizeLanguage(
        serverData.language ?? readPersistedLanguage(),
      );

      const normalized: SettingsFormState = {
        ...serverData,
        showInTray: serverData.showInTray ?? true,
        minimizeToTrayOnClose: serverData.minimizeToTrayOnClose ?? true,
        useAppWindowControls: serverData.useAppWindowControls ?? false,
        enableClaudePluginIntegration:
          serverData.enableClaudePluginIntegration ?? false,
        silentStartup: serverData.silentStartup ?? false,
        skipClaudeOnboarding: serverData.skipClaudeOnboarding ?? false,
        preserveCodexOfficialAuthOnSwitch:
          serverData.preserveCodexOfficialAuthOnSwitch ?? false,
        unifyCodexSessionHistory: serverData.unifyCodexSessionHistory ?? false,
        claudeConfigDir: sanitizeDir(serverData.claudeConfigDir),
        codexConfigDir: sanitizeDir(serverData.codexConfigDir),
        geminiConfigDir: sanitizeDir(serverData.geminiConfigDir),
        grokConfigDir: sanitizeDir(serverData.grokConfigDir),
        opencodeConfigDir: sanitizeDir(serverData.opencodeConfigDir),
        openclawConfigDir: sanitizeDir(serverData.openclawConfigDir),
        language: normalizedLanguage,
      };

      setSettingsState(normalized);
      syncLanguage(initialLanguageRef.current);
    },
    [readPersistedLanguage, syncLanguage],
  );

  return {
    settings: settingsState,
    isLoading,
    initialLanguage: initialLanguageRef.current,
    updateSettings,
    resetSettings,
    readPersistedLanguage,
    syncLanguage,
  };
}
