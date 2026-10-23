export async function requestGeminiJson(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not configured.");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!response.ok) {
    const errorPayload: unknown = await response.json().catch(() => null);
    const detail = errorPayload && typeof errorPayload === "object"
      ? (errorPayload as { error?: { message?: unknown } }).error?.message
      : undefined;
    const message = typeof detail === "string" ? detail : "No provider error details were returned.";
    throw new Error(`Gemini returned HTTP ${response.status}: ${message.replaceAll(apiKey, "[REDACTED]")}`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Gemini returned an invalid response.");
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Gemini did not return summary text.");
  return text;
}
