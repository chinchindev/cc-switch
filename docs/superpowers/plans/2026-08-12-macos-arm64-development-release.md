# macOS Apple Silicon Development Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an ad-hoc-signed macOS ARM64 DMG for M1–M4 alongside the existing Windows development release.

**Architecture:** Keep the official Tauri config and tag-based signed release untouched. Add one development-only Tauri override, then split the existing branch workflow into Windows build, macOS ARM64 build, and a single release publisher that consumes platform artifacts.

**Tech Stack:** GitHub Actions, Tauri v2, Rust, pnpm, Vitest, PowerShell, Bash, macOS `codesign`/`file`.

## Global Constraints

- Target exactly `aarch64-apple-darwin`; one ARM64 artifact supports M1, M2, M3, and M4.
- Keep `bundle.macOS.minimumSystemVersion` at `12.0` in the primary Tauri config.
- Use ad-hoc signing identity `-`; do not reference Apple certificate, Apple ID, team ID, or notarization secrets.
- Do not modify `.github/workflows/release.yml` or the official updater/signing flow.
- Publish `cc-switch-windows-release.zip` and `cc-switch-macos-arm64-release.dmg` into the same `dev-release-<run_number>` prerelease.
- Only release-profile runs create/publish the DMG; ordinary branch pushes retain debug validation without publishing.
- Preserve UTF-8 without BOM in every created or modified file.

---

## File Structure

- Create `src-tauri/tauri.dev-macos.conf.json`: development-only Tauri config merge containing the ad-hoc macOS signing identity.
- Create `tests/config/macosDevelopmentReleaseConfig.test.ts`: contract test for the override and the unchanged macOS version floor.
- Modify `.github/workflows/build-windows.yml`: retain branch triggers/profile semantics while splitting build and publish responsibilities across Windows and macOS ARM64 jobs.

### Task 1: Development-only Tauri ad-hoc signing override

**Files:**
- Create: `src-tauri/tauri.dev-macos.conf.json`
- Create: `tests/config/macosDevelopmentReleaseConfig.test.ts`

**Interfaces:**
- Consumes: Tauri v2 config merge through CLI option `--config src-tauri/tauri.dev-macos.conf.json`.
- Produces: JSON object `{ bundle: { macOS: { signingIdentity: "-" } } }` without changing the primary config.

- [ ] **Step 1: Write the failing config contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));

describe("macOS development release config", () => {
  it("uses ad-hoc signing only in the development override", () => {
    const override = readJson("src-tauri/tauri.dev-macos.conf.json");
    const primary = readJson("src-tauri/tauri.conf.json");

    expect(override).toEqual({
      bundle: { macOS: { signingIdentity: "-" } },
    });
    expect(primary.bundle.macOS.minimumSystemVersion).toBe("12.0");
    expect(primary.bundle.macOS.signingIdentity).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify the missing override fails**

Run:

```powershell
pnpm vitest run tests/config/macosDevelopmentReleaseConfig.test.ts
```

Expected: FAIL because `src-tauri/tauri.dev-macos.conf.json` does not exist.

- [ ] **Step 3: Add the minimal development override**

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"
    }
  }
}
```

- [ ] **Step 4: Run the config test and JSON/UTF-8 checks**

Run:

```powershell
pnpm vitest run tests/config/macosDevelopmentReleaseConfig.test.ts
Get-Content -Raw -Encoding UTF8 src-tauri/tauri.dev-macos.conf.json | ConvertFrom-Json | Out-Null
```

Expected: one test passes; PowerShell exits successfully.

- [ ] **Step 5: Commit the isolated config change**

```powershell
git add -- src-tauri/tauri.dev-macos.conf.json tests/config/macosDevelopmentReleaseConfig.test.ts
git commit -m "ci: add macOS ad-hoc signing config"
```

### Task 2: Cross-platform development release workflow

**Files:**
- Modify: `.github/workflows/build-windows.yml`

**Interfaces:**
- Consumes: top-level `PROFILE`, branch push/dispatch triggers, and the override from Task 1.
- Produces: jobs `build-windows`, `build-macos-arm64`, and `publish-release`; release artifact uploads named `release-windows` and `release-macos-arm64`.

- [ ] **Step 1: Verify the existing workflow has a valid YAML baseline**

Run:

```powershell
pnpm exec prettier --check .github/workflows/build-windows.yml
```

Expected: Prettier parses the existing YAML and exits 0.

- [ ] **Step 2: Refactor the Windows job without changing its build behavior**

Rename `build` to `build-windows`. Keep `windows-latest`, Cargo tests, Tauri `--no-bundle`, EXE collection, and the existing debug workflow artifact. Add a release-only upload containing only `out/cc-switch-windows-release.zip`:

```yaml
      - name: Upload Windows release asset
        if: env.PROFILE == 'release'
        uses: actions/upload-artifact@v7
        with:
          name: release-windows
          path: out/cc-switch-windows-release.zip
          if-no-files-found: error
          retention-days: 14
```

Remove the platform-local `softprops/action-gh-release` step so publishing has one owner.

- [ ] **Step 3: Add the macOS ARM64 build job**

Add `build-macos-arm64` on `macos-14` with Node, pnpm, Rust, target-specific Cargo cache, dependency installation, and Rust tests. Its build script must branch on `PROFILE`:

```yaml
      - name: Build
        shell: bash
        run: |
          set -euo pipefail
          if [ "$PROFILE" = "release" ]; then
            pnpm tauri build \
              --target aarch64-apple-darwin \
              --bundles dmg \
              --config src-tauri/tauri.dev-macos.conf.json
          else
            pnpm tauri build \
              --target aarch64-apple-darwin \
              --no-bundle \
              --debug \
              --config src-tauri/tauri.dev-macos.conf.json
          fi
```

For release profile, locate the `.app`, dynamically locate its executable, require `file` output to contain `arm64`, run `codesign --verify --deep --strict --verbose=2`, copy the generated DMG to `out/cc-switch-macos-arm64-release.dmg`, and upload it as artifact `release-macos-arm64`.

- [ ] **Step 4: Add the single release publisher**

Create `publish-release` with the exact release condition rather than relying on job-level `env` availability:

```yaml
  publish-release:
    if: >-
      inputs.profile == 'release' ||
      (github.event_name == 'push' && contains(github.event.head_commit.message, '[release]'))
    needs: [build-windows, build-macos-arm64]
    runs-on: ubuntu-latest
```

Use `actions/download-artifact@v8` with `pattern: release-*`, `merge-multiple: true`, and `path: release-assets`. Publish `release-assets/*` with `softprops/action-gh-release@v3`, retaining tag/name conventions and adding the `xattr`/`open` instructions to the release body.

- [ ] **Step 5: Run YAML/JSON parser and config contract checks**

Run:

```powershell
pnpm vitest run tests/config/macosDevelopmentReleaseConfig.test.ts
pnpm exec prettier --check .github/workflows/build-windows.yml src-tauri/tauri.dev-macos.conf.json tests/config/macosDevelopmentReleaseConfig.test.ts
```

Expected: the config contract test passes and Prettier parses/checks every changed YAML/JSON/TypeScript file.

- [ ] **Step 6: Commit the workflow refactor**

```powershell
git add -- .github/workflows/build-windows.yml
git commit -m "ci: build Apple Silicon development release"
```

### Task 3: Full verification and live release proof

**Files:**
- Verify: `.github/workflows/build-windows.yml`
- Verify: `src-tauri/tauri.dev-macos.conf.json`
- Verify: `tests/config/macosDevelopmentReleaseConfig.test.ts`

**Interfaces:**
- Consumes: commits from Tasks 1–2 and remote `fork`.
- Produces: one successful GitHub Actions release run with Windows ZIP and macOS ARM64 DMG.

- [ ] **Step 1: Run the complete local frontend verification suite**

Run:

```powershell
pnpm typecheck
pnpm vitest run
pnpm build:renderer
git diff --check
```

Expected: all commands exit 0. Existing expected test warnings do not count as failures.

- [ ] **Step 2: Verify encoding and repository scope**

Use strict `.NET UTF8Encoding(false, true)` to read all four changed/created files, reject an `EF BB BF` prefix, parse both JSON configs, and confirm `git diff --name-only` does not include `.github/workflows/release.yml`.

Expected: UTF-8 valid without BOM; official release workflow unchanged.

- [ ] **Step 3: Push implementation commits to the fork**

```powershell
git push fork feat/vietnamese-locale
```

Expected: push updates only `chinchindev/cc-switch`.

- [ ] **Step 4: Trigger a real release build**

```powershell
git commit --allow-empty -m "ci: build Windows and macOS ARM64 development release [release]"
git push fork feat/vietnamese-locale
```

Expected: branch workflow starts a release-profile run; the superseded debug run may be cancelled by concurrency.

- [ ] **Step 5: Monitor GitHub Actions to a terminal state**

Use the public GitHub Actions API/page to verify `build-windows`, `build-macos-arm64`, and `publish-release` all complete with conclusion `success`.

Expected: Rust tests and platform builds pass; publish job completes successfully.

- [ ] **Step 6: Verify release assets and final worktree**

Open the generated `dev-release-<run_number>` page and verify:

```text
cc-switch-windows-release.zip
cc-switch-macos-arm64-release.dmg
```

Verify release notes contain the `xattr` command, the release commit matches the trigger commit, and `git status --short --branch` is clean.

Expected: both download links are public and the local worktree has no pending changes.
