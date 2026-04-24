import { z } from "zod";

import type { NormalizedExtraction } from "@/lib/types";

const extractionSchema = z.object({
  date: z.string().min(1).default(""),
  vendor: z.string().min(1).default(""),
  total_amount: z.coerce.number().nonnegative().default(0),
  currency: z.string().min(1).default("PHP"),
  vat_amount: z.coerce.number().nonnegative().nullable().optional(),
  net_amount: z.coerce.number().nonnegative().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  document_type: z.string().min(1).default("receipt"),
  reference_number: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  suggested_category: z.string().nullable().optional(),
  confidence: z.coerce.number().min(0).max(1).default(0),
  tin_number: z.string().nullable().optional(),
  nature_of_expense: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type_of_expense: z.string().nullable().optional(),
  or_number: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  receipt_validity: z.string().nullable().optional(),
});

export function normalizeExtraction(input: unknown): NormalizedExtraction {
  const parsed = extractionSchema.parse(input);
  const required_fields_complete = Boolean(
    parsed.date &&
      parsed.vendor &&
      parsed.total_amount > 0 &&
      parsed.currency &&
      parsed.document_type,
  );

  return {
    date: parsed.date,
    vendor: parsed.vendor,
    total_amount: Number(parsed.total_amount.toFixed(2)),
    currency: parsed.currency.toUpperCase(),
    vat_amount: parsed.vat_amount ?? null,
    net_amount: parsed.net_amount ?? null,
    payment_method: parsed.payment_method ?? null,
    document_type: parsed.document_type.toLowerCase(),
    reference_number: parsed.reference_number ?? null,
    due_date: parsed.due_date ?? null,
    period: parsed.period ?? null,
    suggested_category: parsed.suggested_category ?? null,
    confidence: Number(parsed.confidence.toFixed(2)),
    required_fields_complete,
    tin_number: parsed.tin_number ?? null,
    nature_of_expense: parsed.nature_of_expense ?? "Expense",
    category: parsed.category ?? null,
    type_of_expense: parsed.type_of_expense ?? null,
    or_number: parsed.or_number ?? null,
    description: parsed.description ?? null,
    receipt_validity: parsed.receipt_validity ?? null,
  };
}
