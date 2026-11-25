"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowUp, ArrowUpLeft, MessageCircle, Mic, Square, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cx } from "@/components/ui/cx";
import { usePrefs } from "@/components/workspace/state";
import { formatUsd } from "@myfinancespace/core/format";
import { TRANSCRIPTION_MAX_SECONDS, transcriptionModel, type Transcription } from "@myfinancespace/core/transcription";
import { previewTransport, starterPrompts } from "./preview-transport";
import { dictationMessage, useDictation, type DictationState } from "./useDictation";

const MOBILE_QUERY = "(width < 48rem)";

const dictationLabels: Record<DictationState, string> = {
  idle: "Dictate a message",
  starting: "Starting microphone",
  recording: "Stop and transcribe",
  transcribing: "Transcribing",
};

const dictationStatus: Record<DictationState, string> = {
  idle: "",
  starting: "Starting microphone…",
  recording: "Listening",
  transcribing: "Transcribing…",
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Dictated text joins the end of the draft so it can be reviewed before sending. */
function appendDictation(draft: string, text: string) {
  if (!draft.trim()) return text;
  return /\s$/.test(draft) ? draft + text : `${draft} ${text}`;
}

export function ChatPanel({ id, open, dockClassName, onClose }: {
  id: string;
  open: boolean;
  /** Overrides the floating panel's right offset so it stays above the launcher. */
  dockClassName?: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({
    id,
    transport: previewTransport,
  });
  const busy = status === "submitted" || status === "streaming";
  const { prefs } = usePrefs();
  const voiceModel = transcriptionModel(prefs.transcriptionModel);
  const [lastClip, setLastClip] = useState<Transcription | null>(null);
  const clipModel = lastClip ? transcriptionModel(lastClip.model) : undefined;
  const clipModelName = clipModel?.name ?? lastClip?.model;
  const dictation = useDictation((result) => {
    setDraft((current) => appendDictation(current, result.text));
    setLastClip(result);
    if (!window.matchMedia(MOBILE_QUERY).matches) inputRef.current?.focus({ preventScroll: true });
  });
  const dictating = dictation.state !== "idle";
  const recording = dictation.state === "recording";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    const mobile = window.matchMedia(MOBILE_QUERY);
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
    setLastClip(null);
    dictation.clearError();
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
        if (event.currentTarget.open) return;
        dictation.cancel();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        if (dictating) dictation.cancel();
        else onClose();
      }}
      className={cx(
        "anim-chat fixed inset-x-0 top-auto bottom-[var(--chat-sheet-bottom,0px)] z-[45] m-0 h-[min(38rem,calc(var(--chat-sheet-height,100dvh)-0.75rem))] max-h-none w-screen max-w-none overflow-hidden rounded-t-lg border border-rule-2 bg-paper p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/35",
        // From md the chat floats just above the launcher (1rem from the corner, 3rem tall, then a 0.75rem gap).
        "md:inset-x-auto md:right-4 md:bottom-19 md:h-[min(37rem,calc(100dvh-5.75rem))] md:w-[28rem] md:rounded-lg",
        dockClassName,
      )}
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
              dictation.clearError();
              setLastClip(null);
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
          <p role="status" className="sr-only">{dictationStatus[dictation.state]}</p>
          {dictating && (
            <div className="mb-2 flex items-center gap-2 text-sm">
              {recording && <span aria-hidden className="size-2 shrink-0 rounded-full bg-pen" />}
              <span aria-hidden className="font-semibold text-pen">{dictationStatus[dictation.state]}</span>
              {recording && (
                <span aria-hidden className="num text-ink-2">
                  {clock(dictation.seconds)} / {clock(TRANSCRIPTION_MAX_SECONDS)}
                </span>
              )}
              <button type="button" className="btn btn-ghost ml-auto h-11 text-ink-2 md:h-8" title="Discard recording (Esc)" onClick={dictation.cancel}>
                Cancel
              </button>
            </div>
          )}
          {dictation.error && (
            <p role="alert" className="mb-2 text-sm text-ink-2">{dictationMessage(dictation.error)}</p>
          )}
          {!dictating && !dictation.error && lastClip && (lastClip.cost || lastClip.estimatedCost) && (
            <p className="mb-2 text-xs text-ink-3">
              {lastClip.cost && (
                <>
                  Last clip cost <span className="num text-ink-2">{formatUsd(lastClip.cost.amount)}</span> to transcribe with {clipModelName}.
                </>
              )}
              {!lastClip.cost && lastClip.estimatedCost && (
                <>
                  Last clip cost about <span className="num text-ink-2">{formatUsd(lastClip.estimatedCost.amount)}</span> with {clipModelName} at list price
                  {clipModel?.freePlan ? `, or free on ${clipModel.provider}’s free plan.` : "."}
                </>
              )}
            </p>
          )}
          <form onSubmit={submit} className={cx("flex items-end gap-2 rounded-md border border-rule-2 bg-paper-2 p-1.5 focus-within:border-pen", dictating && "border-pen")}>
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
            <button
              type="button"
              className={cx(
                "btn btn-icon size-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 md:size-9",
                recording ? "border-pen bg-pen-wash text-pen hover:bg-pen-wash-2" : "btn-ghost text-ink-2",
              )}
              aria-label={dictationLabels[dictation.state]}
              title={dictationLabels[dictation.state]}
              aria-disabled={(dictating && !recording) || undefined}
              onClick={() => {
                if (dictation.state === "idle") {
                  setLastClip(null);
                  void dictation.start(prefs.transcriptionModel);
                } else if (recording) dictation.stop();
              }}
            >
              {recording ? <Square size={14} fill="currentColor" aria-hidden /> : <Mic size={18} aria-hidden />}
            </button>
            <button type="submit" className="btn btn-primary btn-icon size-11 md:size-9" aria-label="Send message" title="Send message" disabled={!draft.trim() || busy}>
              <ArrowUp size={18} aria-hidden />
            </button>
          </form>
          <p id="chat-preview" className="mt-2 text-xs text-ink-3">
            Sample replies only. Messages stay in this tab.{" "}
            {voiceModel
              ? `Voice input goes to ${voiceModel.provider} ${voiceModel.name}, about ${formatUsd(voiceModel.usdPerMinute)} a minute.`
              : "Voice input goes to the transcription model chosen in Settings."}{" "}
            <Link
              href="/settings#voice"
              className="font-medium text-pen hover:underline"
              onClick={() => {
                // On phones the chat covers the page, so get out of the way.
                if (window.matchMedia(MOBILE_QUERY).matches) onClose();
              }}
            >
              Change model
            </Link>
          </p>
        </div>
      </div>
    </dialog>
  );
}
