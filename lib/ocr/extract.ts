import OpenAI from "openai";

import { requireServerEnv } from "@/lib/env";
import { normalizeExtraction } from "@/lib/ocr/normalize";
import type { NormalizedExtraction } from "@/lib/types";

const COMMON_FIELDS = `
- date: document date (ISO YYYY-MM-DD)
- vendor: business / supplier name
- tin_number: vendor TIN number as printed (e.g. "000-101-528-000" or "009-560-864-00001"), null if absent
- total_amount: total amount including VAT (number)
- currency: currency code, default PHP
- vat_amount: VAT / tax amount (12% standard in Philippines, number or null)
- net_amount: total minus VAT (number or null)
- payment_method: Cash / GCash / Maya / Visa / Mastercard / Check / Union Bank / BDO / BPI / Online Banking / null
- document_type: one of → receipt | invoice | utility_bill | digital_receipt | delivery_note | credit_note | other
- or_number: Official Receipt number, invoice number, OR No., SI No., transaction ID — exactly as printed, null if absent
- reference_number: PO number, account number, statement number, or secondary reference, null if absent
- due_date: payment due date ISO YYYY-MM-DD — invoices/bills only, null for receipts
- period: billing period as text e.g. "October 2023", "Sep 16 – Oct 15 2023" — utilities/subscriptions, null otherwise
- nature_of_expense: "Expense" for disbursements, "Income" for revenues — default "Expense"
- category: classify as exactly one of → "Goods - VAT" | "Goods - Non VAT" | "Service - VAT" | "Service - Non VAT" | "Salary" | null
  Rules: use "Goods" for physical products (IKEA, supplies, equipment). Use "Service" for utilities, telecoms, digital ads, subscriptions, transport. Use "Salary" for payroll only. Add "- VAT" if VAT is charged (vendor has VAT Reg TIN), "- Non VAT" otherwise.
- type_of_expense: most specific account name from this list (pick the closest match):
  Utilities:Electricity | Utilities:Water | Utilities:Gas
  Dues and subscriptions:Internet | Dues and subscriptions:Phone | Dues and subscriptions:TV | Dues and subscriptions:Software | Dues and subscriptions:Channel Manager
  Marketing:Social media ads | Marketing:Other advertising
  Food & Drinks - COS | Housekeeping - COS | Guest Transportation - COS | Laundry and dry cleaning - COS | Toiletries - COS
  Operating Supplies:Dental supplies | Operating Supplies:Medical supplies | Operating Supplies:Office supplies | Operating Supplies:Hotel Supplies | Operating Supplies:Printing and stationery
  Maintenance Expenses:Appliances & Electricity | Maintenance Expenses:Furniture, fixtures, decor | Maintenance Expenses:Garden and Landscaping | Maintenance Expenses:Removal of Waste Matter | Maintenance Expenses:Other expenses
  Salaries and Wages - COS | Employee Benefits - COS
  Outsourced Services:Admin, Accounting & Payroll Services | Outsourced Services:Other
  Administrative expenses:Bank charge | Administrative expenses:Other expenses
  Equipment | Rent | Other
- description: concise description of what was purchased (1–2 sentences, in English), null if nothing useful to add
- suggested_category: legacy field — best match from → Utilities, Marketing, Supplies, Equipment, Rent, Salaries, Bank fees, Other
- receipt_validity: "OK" if the document has a visible BIR-accredited OR/SI number and appears valid; "NV" if the receipt is missing OR number, expired, or not BIR-accredited; null if cannot determine
- confidence: 0.0–1.0 overall extraction confidence`.trim();

const TYPE_GUIDANCE = `
Document-type specific rules:
• receipt        — extract or_number (OR No. or SI No.), tin_number, total_amount, payment_method, vendor.
• invoice        — extract or_number (invoice #), due_date (if shown), net_amount, vat_amount, tin_number. period if recurring.
• utility_bill   — extract vendor (Meralco/PLDT/Globe/etc.), period (billing period), due_date, total_amount. or_number = statement/billing number. reference_number = account number.
• digital_receipt — extract vendor (Meta/Google/Webflow/etc.), or_number = transaction ID or reference number. payment_method from card shown.
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

