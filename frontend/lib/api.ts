import type {
  ProcessAudioResponse,
  SummaryResponse,
} from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Small typed client for the local FastAPI backend.
 * Browser-safe: no secrets here, only the public base URL.
 */
export async function processAudio(
  audioBlob: Blob,
  filename = "recording.wav",
): Promise<ProcessAudioResponse> {
  const form = new FormData();
  form.append("file", audioBlob, filename);

  let res: Response;
  try {
    // NOTE: do NOT set Content-Type manually — the browser generates the
    // multipart/form-data boundary.
    res = await fetch(`${API_URL}/process`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "I couldn't reach the assistant server. Is the backend running? Tap the mic to try again.",
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) detail = ` (${data.error})`;
    } catch {
      // Ignore JSON parse errors on the error path.
    }
    throw new Error(
      `Audio processing failed (status ${res.status})${detail}. Tap the mic to try again.`,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Tap the mic to try again.",
    );
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("result" in data) ||
    typeof (data as { result?: unknown }).result !== "object"
  ) {
    throw new Error(
      "The server returned an unexpected response. Tap the mic to try again.",
    );
  }

  return data as ProcessAudioResponse;
}

export async function getSummary(): Promise<SummaryResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/summary`);
  } catch {
    throw new Error("Could not reach the assistant server.");
  }

  if (!res.ok) {
    throw new Error(`Summary request failed (status ${res.status}).`);
  }

  return (await res.json()) as SummaryResponse;
}
