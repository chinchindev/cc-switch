import type { ReactNode } from "react";
import { ShieldCheck, Terminal, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { highlightText } from "./utils";
import {
  parseMarkdownBlocks,
  prepareSessionContent,
} from "./sessionMessageFormat";

interface SessionMessageContentProps {
  content: string;
  role: string;
  searchQuery?: string;
}

const renderText = (text: string, searchQuery?: string): ReactNode =>
  searchQuery ? highlightText(text, searchQuery) : text;

const renderInline = (text: string, searchQuery?: string): ReactNode[] => {
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      nodes.push(renderText(text.slice(cursor, start), searchQuery));
    }

    const token = match[0];
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      nodes.push(
        <a
          key={`${start}-link`}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {renderText(link[1], searchQuery)}
        </a>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${start}-code`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
        >
          {renderText(token.slice(1, -1), searchQuery)}
        </code>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong
          key={`${start}-strong`}
          className="font-semibold text-foreground"
        >
          {renderText(token.slice(2, -2), searchQuery)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={`${start}-em`}>
          {renderText(token.slice(1, -1), searchQuery)}
        </em>,
      );
    }
    cursor = start + token.length;
  }

  if (cursor < text.length) {
    nodes.push(renderText(text.slice(cursor), searchQuery));
  }
  return nodes;
};

function MarkdownContent({
  content,
  searchQuery,
}: Pick<SessionMessageContentProps, "content" | "searchQuery">) {
  const { t } = useTranslation();
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2 text-sm leading-relaxed min-w-0">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return (
              <div
                key={key}
                role="heading"
                aria-level={block.level}
                className={cn(
                  "font-semibold text-foreground",
                  block.level === 1
                    ? "text-base"
                    : block.level === 2
                      ? "text-[15px]"
                      : "text-sm",
                )}
              >
                {renderInline(block.content, searchQuery)}
              </div>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={key}
                className={cn(
                  "space-y-1 pl-5",
                  block.ordered ? "list-decimal" : "list-disc",
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`} className="pl-0.5">
                    {renderInline(item, searchQuery)}
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-primary/40 pl-3 text-muted-foreground whitespace-pre-wrap"
              >
                {renderInline(block.content, searchQuery)}
              </blockquote>
            );
          case "table":
            return (
              <div
                key={key}
                className="max-w-full overflow-x-auto rounded-md border border-border/70"
              >
                <table className="w-full min-w-max border-collapse text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      {block.headers.map((header, cellIndex) => (
                        <th
                          key={`${key}-header-${cellIndex}`}
                          className={cn(
                            "border-b border-r border-border/70 px-3 py-2 font-semibold last:border-r-0",
                            block.alignments[cellIndex] === "center"
                              ? "text-center"
                              : block.alignments[cellIndex] === "right"
                                ? "text-right"
                                : "text-left",
                          )}
                        >
                          {renderInline(header, searchQuery)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr
                        key={`${key}-row-${rowIndex}`}
                        className="border-b border-border/50 last:border-b-0 even:bg-muted/20"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${key}-row-${rowIndex}-${cellIndex}`}
                            className={cn(
                              "border-r border-border/50 px-3 py-2 align-top last:border-r-0",
                              block.alignments[cellIndex] === "center"
                                ? "text-center"
                                : block.alignments[cellIndex] === "right"
                                  ? "text-right"
                                  : "text-left",
                            )}
                          >
                            {renderInline(cell, searchQuery)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <div
                key={key}
                className="overflow-hidden rounded-md border bg-background/70"
              >
                {block.language && (
                  <div className="border-b bg-muted/50 px-3 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                    {block.language}
                  </div>
                )}
                <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
                  <code>{renderText(block.content, searchQuery)}</code>
                </pre>
              </div>
            );
          case "tool-call":
            return (
              <div
                key={key}
                className="flex w-fit items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-2.5 py-1.5 font-mono text-xs"
              >
                <Wrench className="size-3.5 text-purple-500" />
                <span className="text-muted-foreground">
                  {t("sessionManager.roleTool", { defaultValue: "Tool" })}
                </span>
                <span className="font-medium text-foreground">
                  {renderText(block.name, searchQuery)}
                </span>
              </div>
            );
          case "rule":
            return <hr key={key} className="border-border/60" />;
          case "paragraph":
            return (
              <p
                key={key}
                className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
              >
                {renderInline(block.content, searchQuery)}
              </p>
            );
        }
      })}
    </div>
  );
}

export function SessionMessageContent({
  content,
  role,
  searchQuery,
}: SessionMessageContentProps) {
  const { t } = useTranslation();
  const display = prepareSessionContent(content, role);

  if (display.kind === "command") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-background/70 px-2.5 py-1 font-mono font-medium text-foreground">
          <Terminal className="size-3.5 text-emerald-500" />
          {renderText(display.command ?? "", searchQuery)}
        </span>
        {display.args && (
          <span className="font-mono text-xs text-muted-foreground break-all">
            {renderText(display.args, searchQuery)}
          </span>
        )}
      </div>
    );
  }

  if (display.kind === "tool-output") {
    return (
      <div className="overflow-hidden rounded-md border border-purple-500/15 bg-background/70">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Terminal className="size-3" />
          {t("sessionManager.toolOutput", { defaultValue: "Output" })}
        </div>
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
          <code>{renderText(display.content, searchQuery)}</code>
        </pre>
      </div>
    );
  }

  if (display.kind === "system-context") {
    return (
      <details className="group/context overflow-hidden rounded-md border border-dashed border-border/70 bg-background/40">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="size-3.5 shrink-0" />
          <span className="font-medium">
            {t("sessionManager.systemContextHint", {
              defaultValue:
                "Injected by the CLI · hidden from the conversation",
            })}
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wide opacity-70">
            {t("sessionManager.showSystemContext", {
              defaultValue: "Show raw context",
            })}
          </span>
        </summary>
        <pre className="max-h-96 overflow-auto border-t bg-muted/20 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          <code>{renderText(display.content, searchQuery)}</code>
        </pre>
      </details>
    );
  }

  return (
    <MarkdownContent content={display.content} searchQuery={searchQuery} />
  );
}
