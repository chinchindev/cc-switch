export type SessionContentKind =
  "command" | "markdown" | "system-context" | "tool-output";

export interface SessionDisplayContent {
  kind: SessionContentKind;
  content: string;
  command?: string;
  args?: string;
}

export type MarkdownBlock =
  | { type: "code"; content: string; language?: string }
  | { type: "heading"; content: string; level: number }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "quote"; content: string }
  | { type: "rule" }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
      alignments: Array<"left" | "center" | "right">;
    }
  | { type: "tool-call"; name: string }
  | { type: "paragraph"; content: string };

const COMMAND_NAME_PATTERN = /<command-name>\s*([^<]+?)\s*<\/command-name>/i;
const COMMAND_ARGS_PATTERN = /<command-args>\s*([\s\S]*?)\s*<\/command-args>/i;
const TOOL_CALL_PATTERN = /^\[Tool:\s*(.+?)\]$/i;
const SYSTEM_CONTEXT_OPEN_PATTERN =
  /^<(?:permissions instructions|multi[_-]?agent[_-]?mode|multiagentmode|environment_context|collaboration_mode|apps_instructions|plugins_instructions|skills_instructions|instructions)(?:\s[^>]*)?>/i;
const AGENTS_INSTRUCTIONS_PATTERN =
  /^#\s*AGENTS\.md instructions\b[\s\S]*?<INSTRUCTIONS(?:\s[^>]*)?>/i;

export const isSystemContextContent = (content: string, role: string) => {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === "system" || normalizedRole === "developer") {
    return true;
  }

  const trimmed = content.replace(/\r\n?/g, "\n").trimStart();
  return (
    SYSTEM_CONTEXT_OPEN_PATTERN.test(trimmed) ||
    AGENTS_INSTRUCTIONS_PATTERN.test(trimmed)
  );
};

export const prepareSessionContent = (
  content: string,
  role: string,
): SessionDisplayContent => {
  const normalized = content.replace(/\r\n?/g, "\n");
  const command = normalized.match(COMMAND_NAME_PATTERN)?.[1]?.trim();

  if (isSystemContextContent(normalized, role)) {
    return { kind: "system-context", content: normalized };
  }

  if (command) {
    return {
      kind: "command",
      content: normalized,
      command,
      args: normalized.match(COMMAND_ARGS_PATTERN)?.[1]?.trim() || undefined,
    };
  }

  if (role.toLowerCase() === "tool") {
    return { kind: "tool-output", content: normalized };
  }

  return { kind: "markdown", content: normalized };
};

const isSpecialBlockStart = (line: string) =>
  /^```/.test(line) ||
  /^#{1,6}\s+/.test(line) ||
  /^>\s?/.test(line) ||
  /^\s*\|.*\|\s*$/.test(line) ||
  /^(?:[-*+]\s+|\d+[.)]\s+)/.test(line) ||
  /^(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line) ||
  TOOL_CALL_PATTERN.test(line.trim());

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let inCode = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === "\\") {
      const next = trimmed[index + 1];
      if (next === "|" || next === "\\" || next === "`") {
        current += next;
        index += 1;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "`") {
      inCode = !inCode;
      current += char;
      continue;
    }
    if (char === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
};

const parseTableAlignments = (
  line: string,
): Array<"left" | "center" | "right"> | null => {
  const cells = splitTableRow(line);
  if (cells.length === 0 || cells.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
    return null;
  }
  return cells.map((cell) =>
    cell.startsWith(":") && cell.endsWith(":")
      ? "center"
      : cell.endsWith(":")
        ? "right"
        : "left",
  );
};

export const parseMarkdownBlocks = (content: string): MarkdownBlock[] => {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([^\s`]*)/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        type: "code",
        content: code.join("\n"),
        language: fence[1] || undefined,
      });
      continue;
    }

    const toolCall = line.trim().match(TOOL_CALL_PATTERN);
    if (toolCall) {
      blocks.push({ type: "tool-call", name: toolCall[1].trim() });
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes("|")) {
      const headers = splitTableRow(line);
      const alignments = parseTableAlignments(lines[index + 1]);
      if (alignments && headers.length === alignments.length) {
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].trim().includes("|")) {
          const cells = splitTableRow(lines[index]);
          rows.push(
            headers.map((_, cellIndex) => cells[cellIndex]?.trim() ?? ""),
          );
          index += 1;
        }
        blocks.push({ type: "table", headers, rows, alignments });
        continue;
      }
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", content: quote.join("\n") });
      continue;
    }

    const listItem = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
    if (listItem) {
      const ordered = /^\d/.test(listItem[2]);
      const items: string[] = [];
      while (index < lines.length) {
        const nextItem = lines[index].match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
        if (!nextItem || /^\d/.test(nextItem[2]) !== ordered) break;
        items.push(nextItem[3]);
        index += 1;
      }
      blocks.push({ type: "list", items, ordered });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isSpecialBlockStart(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraph.join("\n") });
  }

  return blocks;
};
