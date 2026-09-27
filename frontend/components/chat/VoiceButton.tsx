"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, TriangleAlert } from "lucide-react";
import { processAudio } from "@/lib/api";
import type { ProcessAudioResponse, VoiceState } from "@/lib/types";

const LABELS: Record<VoiceState, string> = {
  idle: "Hold to talk",
  recording: "Listening…",
  processing: "Understanding…",
  error: "Something went wrong. Try again.",
};

/**
 * The backend decodes uploads with soundfile (via librosa), which cannot
 * read WebM/Opus — and this machine has no ffmpeg to transcode server-side.
 * So the browser records 16-bit PCM WAV at 16 kHz mono instead: exactly what
 * `librosa.load(sr=16000, mono=True)` expects. No new dependencies needed.
 */
const TARGET_SAMPLE_RATE = 16000;
/** Recordings shorter than this are treated as an accidental empty tap. */
const MIN_SAMPLES = 1600; // 0.1 s at 16 kHz

function downsampleTo16k(
  chunks: Float32Array[],
  inputRate: number,
): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    input.set(chunk, offset);
    offset += chunk.length;
  }
  if (inputRate === TARGET_SAMPLE_RATE) return input;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outLength = Math.floor(total / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (at: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(at + i, text.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  let at = 44;
  for (let i = 0; i < samples.length; i += 1, at += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

interface Props {
  onResult: (response: ProcessAudioResponse) => void;
  onError: (message: string) => void;
}

export default function VoiceButton({ onResult, onError }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sinkRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const teardownAudio = () => {
    try {
      processorRef.current?.disconnect();
    } catch {
      // Already disconnected — safe to ignore.
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      // Already disconnected — safe to ignore.
    }
    try {
      sinkRef.current?.disconnect();
    } catch {
      // Already disconnected — safe to ignore.
    }
    const ctx = ctxRef.current;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
    ctxRef.current = null;
    sourceRef.current = null;
    processorRef.current = null;
    sinkRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Tear down any in-progress recording if the component unmounts.
  useEffect(() => {
    return () => {
      teardownAudio();
    };
  }, []);

  const fail = (message: string) => {
    teardownAudio();
    chunksRef.current = [];
    setState("error");
    onError(message);
  };

  const startRecording = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      fail(
        "This browser doesn't support microphone recording. Try Chrome or Edge on desktop.",
      );
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      fail(
        "This browser doesn't support microphone recording. Try Chrome or Edge on desktop.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        chunksRef.current.push(
          new Float32Array(event.inputBuffer.getChannelData(0)),
        );
      };
      // Zero-gain sink: the processor must be connected for buffers to flow,
      // but nothing should play back out of the speakers.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      sinkRef.current = sink;
      source.connect(processor);
      processor.connect(sink);
      sink.connect(ctx.destination);
      setState("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        fail(
          "Microphone access was denied. Allow the microphone in the browser, then tap the mic to try again.",
        );
      } else {
        fail("Could not start recording. Tap the mic to try again.");
      }
    }
  };

  const stopAndUpload = async () => {
    const inputRate = ctxRef.current?.sampleRate ?? 48000;
    const chunks = chunksRef.current;
    teardownAudio();
    chunksRef.current = [];

    const pcm = downsampleTo16k(chunks, inputRate);
    if (pcm.length < MIN_SAMPLES) {
      fail("The recording was empty. Tap the mic, speak, then tap stop.");
      return;
    }

    setState("processing");
    try {
      const response = await processAudio(
        encodeWav(pcm, TARGET_SAMPLE_RATE),
        "recording.wav",
      );
      onResult(response);
      setState("idle");
    } catch (err) {
      fail(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    }
  };

  const handlePress = () => {
    if (state === "processing") return; // prevent duplicate submissions
    if (state === "recording") {
      void stopAndUpload(); // tap again to stop
      return;
    }
    void startRecording();
  };

  const circleClass =
    state === "recording"
      ? "bg-clay-600 hover:bg-clay-600"
      : state === "processing"
        ? "bg-pine-600"
        : state === "error"
          ? "bg-clay-700 hover:bg-clay-700"
          : "bg-pine-700 hover:bg-pine-900";

  return (
    <div aria-live="polite" className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handlePress}
        disabled={state === "processing"}
        aria-label={LABELS[state]}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2 disabled:cursor-wait ${circleClass}`}
      >
        {state === "recording" && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-clay-500/40"
          />
        )}
        {state === "idle" && <Mic size={24} aria-hidden="true" />}
        {state === "recording" && (
          <Mic size={24} aria-hidden="true" className="animate-pulse" />
        )}
        {state === "processing" && (
          <LoaderCircle size={24} aria-hidden="true" className="animate-spin" />
        )}
        {state === "error" && (
          <TriangleAlert size={24} aria-hidden="true" />
        )}
      </button>
      <span className="text-xs leading-4 text-ink-500">{LABELS[state]}</span>
    </div>
  );
}
