import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "i18next";
import { beforeEach, describe, expect, it } from "vitest";

import { SessionMessageContent } from "@/components/sessions/SessionMessageContent";
import { SessionMessageItem } from "@/components/sessions/SessionMessageItem";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("SessionMessageContent", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows a Claude slash command without internal XML", () => {
    const { container } = render(
      <SessionMessageContent
        role="user"
        content={[
          "<command-name>/clear</command-name>",
          "<command-message>clear</command-message>",
          "<command-args></command-args>",
        ].join("\n")}
      />,
    );

    expect(screen.getByText("/clear")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("command-name");
    expect(container).not.toHaveTextContent("command-message");
  });

  it("renders Markdown and a tool call as structured content", () => {
    render(
      <SessionMessageContent
        role="assistant"
        content={"# Result\n\n**Done**\n\n[Tool: Read]"}
      />,
    );

    expect(screen.getByRole("heading", { name: "Result" })).toBeInTheDocument();
    expect(screen.getByText("Done").tagName).toBe("STRONG");
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.queryByText("[Tool: Read]")).not.toBeInTheDocument();
  });

  it("renders a Markdown table as responsive table markup", () => {
    const { container } = render(
      <SessionMessageContent
        role="assistant"
        content={[
          "| File | Thay đổi |",
          "| --- | --- |",
          "| `NdefApduProcessor.kt` | **Mới** — logic APDU |",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "File" }),
    ).toBeInTheDocument();
    expect(screen.getByText("NdefApduProcessor.kt").tagName).toBe("CODE");
    expect(screen.getByText("Mới").tagName).toBe("STRONG");
    expect(container.querySelector("table")?.parentElement).toHaveClass(
      "overflow-x-auto",
    );
  });

  it("preserves tool output whitespace in a terminal block", () => {
    const { container } = render(
      <SessionMessageContent role="tool" content={"line 1\n  line 2"} />,
    );

    expect(container.querySelector("pre")).toHaveTextContent("line 1 line 2");
    expect(container.querySelector("code")?.textContent).toBe(
      "line 1\n  line 2",
    );
  });

  it("collapses injected system context but keeps raw content available", () => {
    const content =
      "<permissions instructions>Keep this local</permissions instructions>";
    render(
      <TooltipProvider>
        <SessionMessageItem
          message={{ role: "user", content }}
          isActive={false}
          onCopy={() => undefined}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("System context")).toBeInTheDocument();
    const rawContent = screen.getByText(content);
    expect(rawContent).not.toBeVisible();

    fireEvent.click(screen.getByText("Show raw context"));
    expect(rawContent).toBeVisible();
    expect(screen.queryByText("User")).not.toBeInTheDocument();
  });

  it("shows exact context usage and percentage for a Codex turn", () => {
    render(
      <TooltipProvider>
        <SessionMessageItem
          message={{
            role: "assistant",
            content: "Done.",
            usage: {
              contextTokens: 45_500,
              outputTokens: 500,
              contextWindow: 258_400,
            },
          }}
          isActive={false}
          onCopy={() => undefined}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText(/45\.5K \/ 258\.4K · 17\.6%/)).toBeInTheDocument();
  });

  it("shows Claude context tokens without guessing a model limit", () => {
    render(
      <TooltipProvider>
        <SessionMessageItem
          message={{
            role: "assistant",
            content: "Done.",
            usage: {
              contextTokens: 452_747,
              outputTokens: 297,
            },
          }}
          isActive={false}
          onCopy={() => undefined}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText(/452\.7K tokens/)).toBeInTheDocument();
  });
});
