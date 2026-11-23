"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowUp, ArrowUpLeft, MessageCircle, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cx } from "@/components/ui/cx";
import { previewTransport, starterPrompts } from "./preview-transport";

export function ChatPanel({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({
    id,
    transport: previewTransport,
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    const mobile = window.matchMedia("(width < 48rem)");
    const viewport = window.visualViewport;
    const resizeSheet = () => {
      if (!mobile.matches || !viewport) return;
      const bottom = window.innerHeight - viewport.height - viewport.offsetTop;
      dialog.style.setProperty("--chat-sheet-bottom", `${Math.max(0, bottom)}px`);
      dialog.style.setProperty("--chat-sheet-height", `${viewport.height}px`);
    };
    const show = () => {
      if (dialog.open) dialog.close();
      if (mobile.matches) dialog.showModal();
      else dialog.show();
      if (!mobile.matches) inputRef.current?.focus({ preventScroll: true });
      resizeSheet();
    };

    show();
    mobile.addEventListener("change", show);
    viewport?.addEventListener("resize", resizeSheet);
    viewport?.addEventListener("scroll", resizeSheet);
    return () => {
      mobile.removeEventListener("change", show);
      viewport?.removeEventListener("resize", resizeSheet);
      viewport?.removeEventListener("scroll", resizeSheet);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, messages, busy]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void sendMessage({ text });
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby="chat-title"
      aria-describedby="chat-preview"
      data-noprint
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        onClose();
      }}
      className="anim-inspector fixed inset-x-0 top-auto bottom-[var(--chat-sheet-bottom,0px)] z-[45] m-0 h-[min(38rem,calc(var(--chat-sheet-height,100dvh)-0.75rem))] max-h-none w-screen max-w-none overflow-hidden rounded-t-lg border border-rule-2 bg-paper p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/35 md:inset-x-auto md:right-5 md:bottom-5 md:h-[min(37rem,calc(100dvh-2.5rem))] md:w-[28rem] md:rounded-lg"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-rule px-4 py-1.5 md:px-5">
          <MessageCircle size={19} strokeWidth={1.8} className="shrink-0 text-pen" aria-hidden />
          <h2 id="chat-title" className="min-w-0 flex-1 text-lg font-semibold">Ask AI</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon size-11 text-ink-2 md:size-8"
            aria-label="New chat"
            title="New chat"
            disabled={busy || (messages.length === 0 && !draft)}
            onClick={() => {
              clearError();
              setMessages([]);
              setDraft("");
              inputRef.current?.focus({ preventScroll: true });
            }}
          >
            <SquarePen size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-ghost btn-icon size-11 text-ink-2 md:size-8" aria-label="Close chat" title="Close chat" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </header>

        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-sm pt-2 md:pt-6">
              <h3 className="text-2xl font-semibold tracking-tight">What would you like to ask?</h3>
              <p className="mt-1.5 text-base text-ink-2">Ask about money, work, or anything else.</p>
              <ul className="mt-7 divide-y divide-rule border-y border-rule">
                {starterPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(prompt);
                        inputRef.current?.focus();
                      }}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-base text-ink-2 hover:bg-paper-2 hover:text-ink"
                    >
                      <span>{prompt}</span>
                      <ArrowUpLeft size={15} className="shrink-0 text-ink-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div role="log" aria-label="Chat messages" className="space-y-5">
            {messages.map((message) => (
              <div key={message.id} className={cx("text-base", message.role === "user" && "ml-auto max-w-[85%]")}>
                <p className={cx("mb-1 text-xs font-semibold", message.role === "user" ? "text-right text-pen" : "text-ink-2")}>
                  {message.role === "user" ? "You" : "Preview reply"}
                </p>
                <div className={cx("space-y-2 whitespace-pre-wrap [overflow-wrap:anywhere]", message.role === "user" && "rounded-md bg-pen-wash px-3 py-2")}>
                  {message.parts.map((part, index) => part.type === "text" && <p key={index}>{part.text}</p>)}
                </div>
              </div>
            ))}
          </div>
          {busy && <p className="mt-4 text-sm text-ink-3" role="status">Preparing a preview reply…</p>}
          {error && <p className="mt-4 text-sm text-ink-2" role="alert">The preview couldn’t reply. Try sending your question again.</p>}
        </div>

        <div className="shrink-0 border-t border-rule bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
          <form onSubmit={submit} className="flex items-end gap-2 rounded-md border border-rule-2 bg-paper-2 p-1.5 focus-within:border-pen">
            <textarea
              ref={inputRef}
              aria-label="Your message"
              placeholder="Ask a question…"
              enterKeyHint="send"
              value={draft}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-lg leading-snug outline-none placeholder:text-ink-3 focus-visible:outline-none md:text-base"
            />
            <button type="submit" className="btn btn-primary btn-icon size-11 md:size-9" aria-label="Send message" title="Send message" disabled={!draft.trim() || busy}>
              <ArrowUp size={18} aria-hidden />
            </button>
          </form>
          <p id="chat-preview" className="mt-2 text-xs text-ink-3">Sample replies only. Messages stay in this tab.</p>
        </div>
      </div>
    </dialog>
  );
}
