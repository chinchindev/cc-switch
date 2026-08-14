import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type TauriConfig = {
  bundle?: {
    createUpdaterArtifacts?: boolean;
    macOS?: {
      minimumSystemVersion?: string;
      signingIdentity?: string;
    };
  };
};

function readJsonConfig(relativePath: string): TauriConfig {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as TauriConfig;
}

describe("macOS development release config", () => {
  it("uses only an ad-hoc signing identity in the development override", () => {
    const config = readJsonConfig("../../src-tauri/tauri.dev-macos.conf.json");

    expect(config).toEqual({
      bundle: {
        createUpdaterArtifacts: false,
        macOS: {
          signingIdentity: "-",
        },
      },
    });
  });

  it("keeps the supported macOS version in the primary config", () => {
    const config = readJsonConfig("../../src-tauri/tauri.conf.json");

    expect(config.bundle?.macOS?.minimumSystemVersion).toBe("12.0");
    expect(config.bundle?.macOS?.signingIdentity).toBeUndefined();
  });
});
