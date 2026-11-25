import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe, NoTranscriptGeneratedError } from "ai";
import type { ApiErrorBody } from "@myfinancespace/core/api";
import {
  estimateTranscriptionCost,
  TRANSCRIPTION_AUDIO_FIELD,
  TRANSCRIPTION_DEFAULT_MODEL,
  TRANSCRIPTION_MAX_BYTES,
  TRANSCRIPTION_MODEL_FIELD,
  TRANSCRIPTION_MODELS,
  transcriptionModel,
  validateTranscriptionAudio,
  type Transcription,
  type TranscriptionErrorCode,
  type TranscriptionModel,
  type TranscriptionService,
} from "@myfinancespace/core/transcription";

/** Room for multipart boundaries and headers around the clip itself. */
const FORM_OVERHEAD_BYTES = 16 * 1024;

/**
 * Whether this server can call each service. AI Gateway authenticates with
 * AI_GATEWAY_API_KEY locally or Vercel OIDC when deployed, so it is assumed
 * available; Groq needs GROQ_API_KEY.
 */
const configured: Record<TranscriptionService, () => boolean> = {
  "ai-gateway": () => true,
  groq: () => Boolean(process.env.GROQ_API_KEY),
};

const failures: Record<TranscriptionErrorCode, { status: number; message: string }> = {
  invalid_request: { status: 400, message: `Send multipart/form-data with an "${TRANSCRIPTION_AUDIO_FIELD}" file field.` },
  audio_missing: { status: 400, message: `The "${TRANSCRIPTION_AUDIO_FIELD}" file is missing or empty.` },
  audio_too_large: { status: 413, message: `Audio must be ${TRANSCRIPTION_MAX_BYTES} bytes or smaller.` },
  audio_unsupported_type: { status: 415, message: "Send webm, ogg, mp4, m4a, mp3, wav or flac audio." },
  model_unsupported: { status: 400, message: `"${TRANSCRIPTION_MODEL_FIELD}" must be one of the supported transcription model ids.` },
  model_unavailable: { status: 503, message: "This server isn't set up for that transcription model. Choose another." },
  no_speech: { status: 422, message: "No speech was found in the audio." },
  transcription_failed: { status: 502, message: "The speech service couldn't transcribe the audio. Try again." },
};

function fail(code: TranscriptionErrorCode) {
  const { status, message } = failures[code];
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, { status });
}

/** The requested model, or the default when none is named (falling back to the first model this server can run). */
function pickModel(requested: FormDataEntryValue | null): TranscriptionModel | TranscriptionErrorCode {
  if (typeof requested === "string" && requested) {
    const model = transcriptionModel(requested);
    if (!model) return "model_unsupported";
    return configured[model.service]() ? model : "model_unavailable";
  }
  const fallback = [transcriptionModel(TRANSCRIPTION_DEFAULT_MODEL), ...TRANSCRIPTION_MODELS];
  return fallback.find((model) => model && configured[model.service]()) ?? "model_unavailable";
}

async function run(model: TranscriptionModel, audio: Uint8Array, abortSignal: AbortSignal) {
  if (model.service === "groq") {
    // verbose_json returns the clip's duration, which the cost estimate needs.
    const result = await transcribe({
      model: groq.transcription(model.serviceModel),
      audio,
      abortSignal,
      providerOptions: { groq: { responseFormat: "verbose_json" } },
    });
    const estimatedCost = result.durationInSeconds === undefined ? undefined : estimateTranscriptionCost(model, result.durationInSeconds);
    return { text: result.text, ...(estimatedCost && { estimatedCost }) };
  }

  const result = await transcribe({ model: model.serviceModel, audio, abortSignal });
  const cost = result.providerMetadata?.gateway?.cost;
  return { text: result.text, ...(typeof cost === "string" && { cost: { amount: cost, currency: "USD" } }) };
}

/** transcriptions.create */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > TRANSCRIPTION_MAX_BYTES + FORM_OVERHEAD_BYTES) {
    return fail("audio_too_large");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_request");
  }

  const audio = form.get(TRANSCRIPTION_AUDIO_FIELD);
  if (!(audio instanceof Blob)) return fail("audio_missing");
  const invalid = validateTranscriptionAudio(audio);
  if (invalid) return fail(invalid);

  const model = pickModel(form.get(TRANSCRIPTION_MODEL_FIELD));
  if (typeof model === "string") return fail(model);

  try {
    const { text, ...billing } = await run(model, new Uint8Array(await audio.arrayBuffer()), request.signal);
    const transcript = text.trim();
    if (!transcript) return fail("no_speech");
    return Response.json({ text: transcript, model: model.id, ...billing } satisfies Transcription);
  } catch (error) {
    if (NoTranscriptGeneratedError.isInstance(error)) return fail("no_speech");
    // Log the name and message only: SDK errors carry the request body, which is the audio itself.
    console.error(`transcriptions.create failed (${model.id}):`, error instanceof Error ? `${error.name}: ${error.message}` : error);
    return fail("transcription_failed");
  }
}
