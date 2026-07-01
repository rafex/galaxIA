export interface OcrInput {
  imageBase64: string;
}

export interface OcrOutput {
  text: string;
}

export class OcrBridge {
  private serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl.replace(/\/$/, "");
  }

  async extract(input: OcrInput): Promise<OcrOutput> {
    const url = `${this.serviceUrl}/mcp`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "ocr_extract",
          arguments: { image_base64: input.imageBase64 },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `OCR request failed: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
      );
    }

    const data = (await response.json()) as {
      result?: {
        content?: Array<{ type: string; text: string }>;
      };
    };

    const content = data.result?.content;
    const textContent = content?.find((c) => c.type === "text")?.text || "";
    return { text: textContent || "No se detectó texto en la imagen." };
  }
}
