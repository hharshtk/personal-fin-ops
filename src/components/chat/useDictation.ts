"use client";

import { useEffect, useRef, useState } from "react";
import { isApiErrorBody, type PreciseMoney } from "@/lib/api";
import {
  TRANSCRIPTION_AUDIO_FIELD,
  TRANSCRIPTION_MAX_SECONDS,
  TRANSCRIPTION_MODEL_FIELD,
  validateTranscriptionAudio,
  type Transcription,
} from "@/lib/transcription";

const TRANSCRIPTIONS_URL = "/api/v1/transcriptions";

/** Recorder formats to ask for, best first. Chrome and Firefox record webm; Safari records mp4. */
const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

/** Plenty for speech, and keeps a full-length clip under 1 MB. */
const RECORDING_BITRATE = 64_000;

export type DictationState = "idle" | "starting" | "recording" | "transcribing";

/** Words for server codes (TranscriptionErrorCode) and for failures on this device. */
const errorMessages: Record<string, string> = {
  insecure_context: "Voice input needs a secure connection. Open the app over HTTPS or on localhost.",
  unsupported: "This browser can’t record audio.",
  permission_denied: "Microphone access is blocked. Allow it in your browser’s site settings, then try again.",
  no_microphone: "No microphone was found.",
  recorder_failed: "Recording stopped unexpectedly. Try again.",
  network: "Couldn’t reach the server. Check your connection and try again.",
  audio_missing: "Nothing was recorded. Start speaking once the timer is running.",
  audio_too_large: "That recording is too long to transcribe.",
  audio_unsupported_type: "This browser records audio in a format the speech service can’t read.",
  no_speech: "No speech was heard. Try again a little closer to the microphone.",
  model_unsupported: "That transcription model isn’t available. Choose another in Settings.",
  model_unavailable: "That transcription model isn’t set up on this server. Choose another in Settings.",
};

/** Unknown codes get a neutral fallback, so new server codes never break older clients. */
export const dictationMessage = (code: string) => errorMessages[code] ?? "Couldn’t transcribe that recording. Try again.";

interface Session {
  model: string;
  controller: AbortController;
  stream?: MediaStream;
  recorder?: MediaRecorder;
}

function release(session: Session) {
  session.stream?.getTracks().forEach((track) => track.stop());
}

/** Ends the recording and turns the microphone off at once. The recorder already holds the audio. */
function stopRecording(session: Session) {
  if (session.recorder?.state === "recording") session.recorder.stop();
  release(session);
}

function abandon(session: Session) {
  session.controller.abort();
  stopRecording(session);
}

function microphoneError(cause: unknown) {
  if (cause instanceof DOMException && (cause.name === "NotAllowedError" || cause.name === "SecurityError")) return "permission_denied";
  if (cause instanceof DOMException && cause.name === "NotFoundError") return "no_microphone";
  return "recorder_failed";
}

function readMoney(value: unknown): PreciseMoney | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { amount, currency } = value as Record<string, unknown>;
  return typeof amount === "string" && typeof currency === "string" ? { amount, currency } : undefined;
}

/** Reads a 200 response defensively: text is required, costs only if well formed. */
function readTranscription(payload: unknown, model: string): Transcription | null {
  if (typeof payload !== "object" || payload === null || !("text" in payload) || typeof payload.text !== "string") return null;
  const fields = payload as Record<string, unknown>;
  const result: Transcription = { text: payload.text, model: typeof fields.model === "string" ? fields.model : model };
  const cost = readMoney(fields.cost);
  const estimatedCost = readMoney(fields.estimatedCost);
  if (cost) result.cost = cost;
  if (estimatedCost) result.estimatedCost = estimatedCost;
  return result;
}

/**
 * Records one clip from the microphone, sends it to `transcriptions.create`
 * with the chosen model, and hands back the result. The microphone is
 * released as soon as recording stops, is cancelled, or the component unmounts.
 */
export function useDictation(onTranscript: (result: Transcription) => void) {
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const active = useRef<Session | null>(null);
  const deliver = useRef(onTranscript);

  useEffect(() => {
    deliver.current = onTranscript;
  });

  useEffect(() => () => {
    if (active.current) abandon(active.current);
    active.current = null;
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= TRANSCRIPTION_MAX_SECONDS && active.current) stopRecording(active.current);
    }, 250);
    return () => window.clearInterval(timer);
  }, [state]);

  function finish(session: Session, failure: string | null = null) {
    if (active.current !== session) return;
    active.current = null;
    release(session);
    setState("idle");
    setError(failure);
  }

  async function upload(session: Session, clip: Blob) {
    setState("transcribing");
    const invalid = validateTranscriptionAudio(clip);
    if (invalid) return finish(session, invalid);

    const body = new FormData();
    body.append(TRANSCRIPTION_AUDIO_FIELD, clip, "dictation");
    body.append(TRANSCRIPTION_MODEL_FIELD, session.model);
    try {
      const response = await fetch(TRANSCRIPTIONS_URL, { method: "POST", body, signal: session.controller.signal });
      const payload: unknown = await response.json().catch(() => null);
      if (active.current !== session) return;
      if (!response.ok) return finish(session, isApiErrorBody(payload) ? payload.error.code : "transcription_failed");
      const result = readTranscription(payload, session.model);
      if (!result) return finish(session, "transcription_failed");
      finish(session);
      deliver.current(result);
    } catch {
      finish(session, "network");
    }
  }

  /** Starts recording. `model` is the AI Gateway model id that will transcribe this clip. */
  async function start(model: string) {
    if (active.current) return;
    setError(null);
    if (!window.isSecureContext) return setError("insecure_context");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return setError("unsupported");

    const session: Session = { model, controller: new AbortController() };
    active.current = session;
    setSeconds(0);
    setState("starting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      return finish(session, microphoneError(cause));
    }
    session.stream = stream;
    // Cancelled while the permission prompt was open.
    if (active.current !== session) return release(session);

    const mimeType = RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: RECORDING_BITRATE });
    } catch {
      return finish(session, "recorder_failed");
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      session.controller.abort();
      finish(session, "recorder_failed");
    };
    recorder.onstop = () => {
      release(session);
      if (session.controller.signal.aborted) return;
      void upload(session, new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
    session.recorder = recorder;
    recorder.start();
    setState("recording");
  }

  /** Stops recording and transcribes what was said. */
  function stop() {
    if (active.current) stopRecording(active.current);
  }

  /** Discards the clip, or the pending transcription, without sending anything back. */
  function cancel() {
    const session = active.current;
    if (!session) return;
    abandon(session);
    finish(session);
  }

  return { state, seconds, error, start, stop, cancel, clearError: () => setError(null) };
}
