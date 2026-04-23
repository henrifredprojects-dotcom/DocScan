import OpenAI from "openai";

import { requireServerEnv } from "@/lib/env";
import { normalizeExtraction } from "@/lib/ocr/normalize";
import type { NormalizedExtraction } from "@/lib/types";

const COMMON_FIELDS = `
- date: document date (ISO YYYY-MM-DD)
- vendor: business / supplier name
- total_amount: total amount including VAT (number)
- currency: currency code, default PHP
- vat_amount: VAT / tax amount (12% standard in Philippines, number or null)
- net_amount: total minus VAT (number or null)
- payment_method: Cash / GCash / Maya / Card / Transfer / Check / null
- document_type: one of → receipt | invoice | delivery_note | credit_note | other
- reference_number: OR number, invoice number, PO number, delivery ref, or null
- due_date: payment due date ISO YYYY-MM-DD — invoices only, null for receipts
- period: billing period as text e.g. "January 2025", "Q1 2025" — utilities/rent/subscriptions, null otherwise
- suggested_category: best match from → Transport, Meals & Entertainment, Medical supplies, Equipment, Rent, Utilities, Marketing, Salaries, Bank fees, Other
- confidence: 0.0–1.0 overall extraction confidence`.trim();

const TYPE_GUIDANCE = `
Document-type specific rules:
• receipt        — focus on total_amount, payment_method, vendor. due_date=null, period=null.
• invoice        — extract reference_number (invoice #), due_date (if shown), net_amount, vat_amount. period if recurring.
• delivery_note  — reference_number = delivery/PO ref. total_amount may be 0. due_date=null.
• credit_note    — total_amount is the credited amount (positive number). reference_number = original invoice ref. due_date=null.
• other          — extract what is visible, set confidence low.`.trim();

function buildPrompt(
  examples: Array<{ extracted: Record<string, unknown>; validated: Record<string, unknown> }>,
) {
  const base = `You are processing Philippine business accounting documents.
Extract the following fields and return a strict JSON object with no extra text.
If a field is absent or illegible, return null. Do not invent data.

Fields:
${COMMON_FIELDS}

${TYPE_GUIDANCE}`;

  if (examples.length === 0) return base;

  // Build diff examples: only show fields that were actually corrected
  const exampleLines = examples
    .map((ex, i) => {
      const corrections: string[] = [];
      for (const key of Object.keys(ex.validated)) {
        const vVal = ex.validated[key];
        const eVal = ex.extracted[key];
        if (vVal !== null && vVal !== undefined && String(vVal) !== String(eVal ?? "")) {
          corrections.push(`    ${key}: "${eVal ?? "null"}" → "${vVal}"`);
        }
      }
      if (corrections.length === 0) return null;
      return `Example ${i + 1} (human corrections for this workspace):\n${corrections.join("\n")}`;
    })
    .filter(Boolean);

  if (exampleLines.length === 0) return base;

  return `${base}

The following are human-verified corrections from previous documents in this workspace.
Use them to improve accuracy for this workspace's specific vendors, categories and formats:

${exampleLines.join("\n\n")}`;
}

const MAX_RETRIES = 3;

async function callOpenAI(
  client: OpenAI,
  imageUrl: string,
  prompt: string,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: "You are an OCR parser for accounting documents." }],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageUrl, detail: "high" },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      });
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export async function extractDocumentData(
  imageUrl: string,
  examples: Array<{ extracted: Record<string, unknown>; validated: Record<string, unknown> }> = [],
): Promise<NormalizedExtraction> {
  const env = requireServerEnv();
  const client = new OpenAI({ apiKey: env.openAiApiKey });

  const response = await callOpenAI(client, imageUrl, buildPrompt(examples));
  if (response.error) throw new Error(`OpenAI error: ${response.error.message}`);
  if (!response.output_text) throw new Error("OpenAI returned an empty response");
  const parsed = JSON.parse(response.output_text) as unknown;
  return normalizeExtraction(parsed);
}

