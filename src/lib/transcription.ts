import type { PreciseMoney } from "./api";
import type { ISODate } from "./types";

/**
 * Contract for `transcriptions.create`: POST /api/v1/transcriptions.
 *
 * Request: multipart/form-data with a file field, `audio`, and an optional
 * text field, `model` (a `TRANSCRIPTION_MODELS` id; defaults to
 * `TRANSCRIPTION_DEFAULT_MODEL`, or the first model the server can run).
 * Response 200: `Transcription`. Errors: `ApiErrorBody` whose code is a
 * `TranscriptionErrorCode`.
 *
 * Nothing is stored. The server forwards the clip to the speech model and
 * keeps no copy, so the command needs no client-supplied id.
 */

export interface Transcription {
  text: string;
  /** The model that produced the text. */
  model: string;
  /** What the service billed for this clip, when it reports it (AI Gateway does). */
  cost?: PreciseMoney;
  /** The clip's cost at list price, for services that don't report a bill (Groq). */
  estimatedCost?: PreciseMoney;
}

/** The service the server calls. Each needs its own key on the server. */
export type TranscriptionService = "ai-gateway" | "groq";

export interface TranscriptionModel {
  /** Stable id clients store and send. */
  id: string;
  service: TranscriptionService;
  /** The model id within that service. */
  serviceModel: string;
  name: string;
  /** Who receives the audio. */
  provider: string;
  /** Approximate USD per minute of audio, from list prices and measurements on 23 Nov 2026. */
  usdPerMinute: string;
  /** Shorter clips are billed as this many seconds. */
  minimumBilledSeconds?: number;
  /** The service has a free plan with a daily allowance. */
  freePlan?: boolean;
  /** The provider removes the model on this date. */
  retiresOn?: ISODate;
}

/**
 * Models that read browser recordings (webm and mp4) and come from providers
 * that don't train on the audio. Cheapest first. Removing an id is a
 * breaking change (Article 5), so a model the provider retires stays listed
 * with `retiresOn` until clients have moved off it.
 */
export const TRANSCRIPTION_MODELS: readonly TranscriptionModel[] = [
  {
    id: "groq/whisper-large-v3-turbo",
    service: "groq",
    serviceModel: "whisper-large-v3-turbo",
    name: "Whisper Large v3 Turbo",
    provider: "Groq",
    usdPerMinute: "0.000667",
    minimumBilledSeconds: 10,
    freePlan: true,
  },
  {
    id: "openai/gpt-4o-mini-transcribe",
    service: "ai-gateway",
    serviceModel: "openai/gpt-4o-mini-transcribe",
    name: "GPT-4o mini Transcribe",
    provider: "OpenAI",
    usdPerMinute: "0.0017",
    retiresOn: "2027-02-26",
  },
  {
    id: "groq/whisper-large-v3",
    service: "groq",
    serviceModel: "whisper-large-v3",
    name: "Whisper Large v3",
    provider: "Groq",
    usdPerMinute: "0.00185",
    minimumBilledSeconds: 10,
    freePlan: true,
  },
  {
    id: "openai/gpt-4o-transcribe",
    service: "ai-gateway",
    serviceModel: "openai/gpt-4o-transcribe",
    name: "GPT-4o Transcribe",
    provider: "OpenAI",
    usdPerMinute: "0.0034",
    retiresOn: "2027-02-26",
  },
  { id: "openai/gpt-transcribe", service: "ai-gateway", serviceModel: "openai/gpt-transcribe", name: "GPT Transcribe", provider: "OpenAI", usdPerMinute: "0.0045" },
  { id: "google/gemini-3.5-transcribe", service: "ai-gateway", serviceModel: "google/gemini-3.5-transcribe", name: "Gemini 3.5 Transcribe", provider: "Google", usdPerMinute: "0.0049" },
];

export const TRANSCRIPTION_DEFAULT_MODEL = "groq/whisper-large-v3-turbo";

/**
 * A clip's cost at list price, for services that don't report what they
 * billed. A display estimate, not a ledger amount: sub-cent, so it can't go
 * through minor-unit rounding.
 */
export function estimateTranscriptionCost(model: TranscriptionModel, seconds: number): PreciseMoney | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  const billedSeconds = Math.max(seconds, model.minimumBilledSeconds ?? 0);
  const usd = (billedSeconds / 60) * Number(model.usdPerMinute);
  return { amount: usd.toFixed(10).replace(/\.?0+$/, ""), currency: "USD" };
}

export const transcriptionModel = (id: string) => TRANSCRIPTION_MODELS.find((model) => model.id === id);

export const TRANSCRIPTION_AUDIO_FIELD = "audio";
export const TRANSCRIPTION_MODEL_FIELD = "model";

/** Vercel Functions reject request bodies over 4.5 MB, so clips stay under 4 MB. */
export const TRANSCRIPTION_MAX_BYTES = 4_000_000;

/** Clients stop recording here. At speech bitrates this keeps a clip far below the size cap. */
export const TRANSCRIPTION_MAX_SECONDS = 120;

/**
 * Formats the speech model reads. Chrome and Firefox record webm, Safari
 * records mp4, iOS records m4a, and Android records mp4, ogg or webm.
 */
export const TRANSCRIPTION_MEDIA_TYPES: readonly string[] = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
];

export type TranscriptionErrorCode =
  | "invalid_request" // the body isn't multipart/form-data
  | "audio_missing" // no `audio` file, or it is empty
  | "audio_too_large" // over TRANSCRIPTION_MAX_BYTES
  | "audio_unsupported_type" // not one of TRANSCRIPTION_MEDIA_TYPES
  | "model_unsupported" // `model` isn't a TRANSCRIPTION_MODELS id
  | "model_unavailable" // the server has no key for that model's service
  | "no_speech" // the model found nothing to transcribe
  | "transcription_failed"; // the speech service failed; safe to retry

/**
 * Checks a clip before upload (clients) and again on receipt (server).
 * Returns null when the clip can be sent.
 */
export function validateTranscriptionAudio(audio: { type: string; size: number }): TranscriptionErrorCode | null {
  if (audio.size <= 0) return "audio_missing";
  if (audio.size > TRANSCRIPTION_MAX_BYTES) return "audio_too_large";
  const mediaType = audio.type.split(";")[0].trim().toLowerCase();
  if (!TRANSCRIPTION_MEDIA_TYPES.includes(mediaType)) return "audio_unsupported_type";
  return null;
}
