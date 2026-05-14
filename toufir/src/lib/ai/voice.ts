// Whisper voice transcription. Supports Darija when language is "ar".

export async function transcribeVoice(
  audioBuffer: Buffer,
  mimeType: string,
  lang: "ar" | "fr" | "en" = "ar"
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
    "voice.ogg"
  );
  form.append("model", "whisper-1");
  form.append("language", lang);
  form.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Whisper failed (${res.status}): ${detail}`);
  }
  return (await res.text()).trim();
}
