import { memo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SessionMessage } from "@/types";
import { formatTokensShort, getResolvedLang } from "@/components/usage/format";
import { formatTimestamp, getRoleLabel, getRoleTone } from "./utils";
import { SessionMessageContent } from "./SessionMessageContent";
import { isSystemContextContent } from "./sessionMessageFormat";

const COLLAPSE_THRESHOLD = 3000;
const COLLAPSED_LENGTH = 1500;

interface SessionMessageItemProps {
  message: SessionMessage;
  isActive: boolean;
  searchQuery?: string;
  onCopy: (content: string) => void;
}

export const SessionMessageItem = memo(function SessionMessageItem({
  message,
  isActive,
  searchQuery,
  onCopy,
}: SessionMessageItemProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isSystemContext = isSystemContextContent(message.content, message.role);

  const isLong =
    !isSystemContext && message.content.length > COLLAPSE_THRESHOLD;
  const hasSearchMatch =
    isLong &&
    !expanded &&
    !!searchQuery &&
    message.content.toLowerCase().includes(searchQuery.toLowerCase());
  const collapsed = isLong && !expanded && !hasSearchMatch;
  const displayContent = collapsed
    ? message.content.slice(0, COLLAPSED_LENGTH) + "…"
    : message.content;
  const contextUsage = message.usage;
  const contextPercent =
    contextUsage?.contextWindow && contextUsage.contextWindow > 0
      ? (contextUsage.contextTokens / contextUsage.contextWindow) * 100
      : null;
  const contextUsedLabel = contextUsage
    ? formatTokensShort(contextUsage.contextTokens, getResolvedLang(i18n))
    : "";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 relative group transition-shadow min-w-0",
        isSystemContext
          ? "bg-muted/20 border-border/50 border-dashed"
          : message.role.toLowerCase() === "user"
            ? "bg-primary/5 border-primary/20 ml-8"
            : message.role.toLowerCase() === "assistant"
              ? "bg-blue-500/5 border-blue-500/20 mr-8"
              : "bg-muted/40 border-border/60",
        isActive && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onCopy(message.content)}
          >
            <Copy className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t("sessionManager.copyMessage", {
            defaultValue: "复制内容",
          })}
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center justify-between text-xs mb-1.5 pr-6">
        <span
          className={cn(
            "font-semibold",
            isSystemContext
              ? "text-muted-foreground"
              : getRoleTone(message.role),
          )}
        >
          {isSystemContext
            ? t("sessionManager.systemContext", {
                defaultValue: "System context",
              })
            : getRoleLabel(message.role, t)}
        </span>
        {message.ts && (
          <span className="text-muted-foreground">
            {formatTimestamp(message.ts)}
          </span>
        )}
      </div>
      <SessionMessageContent
        content={displayContent}
        role={message.role}
        searchQuery={searchQuery}
      />
      {contextUsage && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-2 flex w-fit max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[10px] text-muted-foreground">
              <Gauge className="size-3 shrink-0" />
              <span className="truncate">
                {t("sessionManager.contextUsage", {
                  defaultValue: "Context",
                })}
                {": "}
                {contextPercent !== null && contextUsage.contextWindow
                  ? t("sessionManager.contextUsageWithLimit", {
                      defaultValue: "{{used}} / {{limit}} · {{percent}}%",
                      used: contextUsedLabel,
                      limit: formatTokensShort(
                        contextUsage.contextWindow,
                        getResolvedLang(i18n),
                      ),
                      percent: contextPercent.toFixed(1),
                    })
                  : t("sessionManager.contextUsageTokens", {
                      defaultValue: "{{used}} tokens",
                      used: contextUsedLabel,
                    })}
              </span>
              {contextPercent !== null && (
                <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      contextPercent >= 90
                        ? "bg-destructive"
                        : contextPercent >= 70
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, contextPercent)}%` }}
                  />
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {t("sessionManager.contextUsageDetails", {
              defaultValue:
                "Context after this response · Output: {{output}} tokens",
              output: formatTokensShort(
                contextUsage.outputTokens,
                getResolvedLang(i18n),
              ),
            })}
          </TooltipContent>
        </Tooltip>
      )}
      {isLong && !hasSearchMatch && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              {t("sessionManager.collapseContent", {
                defaultValue: "收起",
              })}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {t("sessionManager.expandContent", {
                defaultValue: "展开完整内容",
              })}
              <span className="text-muted-foreground/60">
                ({Math.round(message.content.length / 1000)}k)
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
});
