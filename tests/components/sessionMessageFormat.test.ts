import { describe, expect, it } from "vitest";
import {
  isSystemContextContent,
  parseMarkdownBlocks,
  prepareSessionContent,
} from "@/components/sessions/sessionMessageFormat";

describe("session message formatting", () => {
  it("turns Claude slash-command XML into a compact command", () => {
    const content = [
      "<command-name>/clear</command-name>",
      "<command-message>clear</command-message>",
      "<command-args></command-args>",
    ].join("\n");

    expect(prepareSessionContent(content, "user")).toMatchObject({
      kind: "command",
      command: "/clear",
      args: undefined,
    });
  });

  it("keeps command arguments without exposing internal tags", () => {
    const content = [
      "<command-name>/compact</command-name>",
      "<command-message>compact</command-message>",
      "<command-args>focus on tests</command-args>",
    ].join("\n");

    expect(prepareSessionContent(content, "user")).toMatchObject({
      kind: "command",
      command: "/compact",
      args: "focus on tests",
    });
  });

  it("renders tool results as terminal output", () => {
    expect(prepareSessionContent("line 1\nline 2", "tool")).toEqual({
      kind: "tool-output",
      content: "line 1\nline 2",
    });
  });

  it.each([
    "<multi_agent_mode>Default</multi_agent_mode>",
    "<multiagentmode>Default</multiagentmode>",
    "<permissions instructions>Local permissions</permissions instructions>",
    "# AGENTS.md instructions\n\n<INSTRUCTIONS>Use UTF-8</INSTRUCTIONS>",
  ])("classifies injected context instead of user text: %s", (content) => {
    expect(isSystemContextContent(content, "user")).toBe(true);
    expect(prepareSessionContent(content, "user")).toEqual({
      kind: "system-context",
      content,
    });
  });

  it("classifies Codex developer messages as system context", () => {
    expect(
      prepareSessionContent("Internal runtime policy", "developer"),
    ).toEqual({
      kind: "system-context",
      content: "Internal runtime policy",
    });
  });

  it("does not hide a normal user message mentioning an internal tag", () => {
    expect(
      isSystemContextContent("Why is <INSTRUCTIONS> visible?", "user"),
    ).toBe(false);
  });

  it("parses common Markdown and tool-call blocks", () => {
    const blocks = parseMarkdownBlocks(
      [
        "# Plan",
        "",
        "[Tool: Read]",
        "",
        "- inspect code",
        "- run tests",
        "",
        "```ts",
        "const ok = true;",
        "```",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      { type: "heading", level: 1, content: "Plan" },
      { type: "tool-call", name: "Read" },
      {
        type: "list",
        ordered: false,
        items: ["inspect code", "run tests"],
      },
      { type: "code", language: "ts", content: "const ok = true;" },
    ]);
  });

  it("parses a Markdown table with alignment and inline code", () => {
    const blocks = parseMarkdownBlocks(
      [
        "| File | Thay đổi | Trạng thái |",
        "| :--- | --- | ---: |",
        "| `MainActivity.kt` | Tôn trọng **Stop** | Xong |",
        "| `build.gradle.kts` | Thêm JUnit | 9 tests |",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      {
        type: "table",
        headers: ["File", "Thay đổi", "Trạng thái"],
        alignments: ["left", "left", "right"],
        rows: [
          ["`MainActivity.kt`", "Tôn trọng **Stop**", "Xong"],
          ["`build.gradle.kts`", "Thêm JUnit", "9 tests"],
        ],
      },
    ]);
  });

  it("does not split pipes inside inline code in a table cell", () => {
    const [table] = parseMarkdownBlocks(
      "| Mẫu | Mô tả |\n| --- | --- |\n| `A | B` | giữ nguyên |",
    );

    expect(table).toMatchObject({
      type: "table",
      rows: [["`A | B`", "giữ nguyên"]],
    });
  });

  it("preserves Windows paths in table cells", () => {
    const [table] = parseMarkdownBlocks(
      "| File | Trạng thái |\n| --- | --- |\n| `C:\\work\\app.kt` | Xong |",
    );

    expect(table).toMatchObject({
      type: "table",
      rows: [["`C:\\work\\app.kt`", "Xong"]],
    });
  });
});
