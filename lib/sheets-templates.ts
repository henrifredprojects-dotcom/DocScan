import type { DocumentRow, Workspace } from "@/lib/types";

export interface SheetColumnDef {
  header: string;
  field: string;
  width: number;
  numeric?: boolean;
}

export interface SheetTemplate {
  id: string;
  label: string;
  description: string;
  columns: SheetColumnDef[];
}

// All fields that can appear in a sheet row
export function resolveField(
  field: string,
  doc: DocumentRow,
  workspace: Workspace,
  validatedData: Record<string, unknown>,
  fileSignedUrl: string,
): unknown {
  switch (field) {
    case "date":             return String(validatedData.date ?? "");
    case "nature_of_expense": return String(validatedData.nature_of_expense ?? "Expense");
    case "payment_method":   return String(validatedData.payment_method ?? "");
    case "category":         return String(validatedData.category ?? "");
    case "type_of_expense":  return String(validatedData.type_of_expense ?? validatedData.category_name ?? validatedData.suggested_category ?? "");
    case "vendor":           return String(validatedData.vendor ?? "");
    case "tin_payee":        return String(validatedData.tin_number ?? "");
    case "description":      return String(validatedData.description ?? validatedData.note ?? "");
    case "total_amount":     return Number(validatedData.total_amount ?? 0);
    case "or_number":        return String(validatedData.or_number ?? validatedData.reference_number ?? validatedData.invoice_number ?? "");
    case "file_url":         return fileSignedUrl;
    case "tag":              return String(validatedData.tag ?? "");
    case "receipt_validity": return String(validatedData.receipt_validity ?? "");
    case "vat_amount":       return Number(validatedData.vat_amount ?? 0);
    case "net_amount": {
      const net = Number(validatedData.net_amount ?? 0)
        || Number(validatedData.total_amount ?? 0) - Number(validatedData.vat_amount ?? 0);
      return Number(net.toFixed(2));
    }
    case "currency":         return String(validatedData.currency ?? workspace.currency ?? "PHP");
    case "category_name":    return String(validatedData.category_name ?? validatedData.suggested_category ?? "");
    case "note":             return String(validatedData.note ?? "");
    case "source":           return doc.source;
    case "status":           return doc.status;
    case "user_email":       return String(validatedData.user_email ?? "");
    case "document_type":    return String(validatedData.document_type ?? "");
    case "reference_number": return String(validatedData.reference_number ?? "");
    case "due_date":         return String(validatedData.due_date ?? "");
    case "period":           return String(validatedData.period ?? "");
    default:                 return "";
  }
}

// ── Template definitions ──────────────────────────────────────────────────────

export const SHEET_TEMPLATES: SheetTemplate[] = [
  {
    id: "disbursement",
    label: "Disbursement Book",
    description: "Matches the standard Philippines disbursement book format.",
    columns: [
      { header: "Date",                       field: "date",             width: 100 },
      { header: "Nature of expense",          field: "nature_of_expense",width: 110 },
      { header: "Mode of Payment",            field: "payment_method",   width: 150 },
      { header: "Category",                   field: "category",         width: 140 },
      { header: "Type of expense",            field: "type_of_expense",  width: 260 },
      { header: "Payee",                      field: "vendor",           width: 220 },
      { header: "Tin Payee #",                field: "tin_payee",        width: 150 },
      { header: "Description",               field: "description",      width: 300 },
      { header: "Amount",                     field: "total_amount",     width: 110, numeric: true },
      { header: "OR # or PCV",                field: "or_number",        width: 160 },
      { header: "Link",                       field: "file_url",         width: 320 },
      { header: "Tag",                        field: "tag",              width: 120 },
      { header: "Receipt Validity (OK or NV)",field: "receipt_validity", width: 180 },
    ],
  },
  {
    id: "disbursement_full",
    label: "Disbursement Full",
    description: "Disbursement book with VAT breakdown (net + VAT + total).",
    columns: [
      { header: "Date",                       field: "date",             width: 100 },
      { header: "Nature of expense",          field: "nature_of_expense",width: 110 },
      { header: "Mode of Payment",            field: "payment_method",   width: 150 },
      { header: "Category",                   field: "category",         width: 140 },
      { header: "Type of expense",            field: "type_of_expense",  width: 260 },
      { header: "Payee",                      field: "vendor",           width: 220 },
      { header: "Tin Payee #",                field: "tin_payee",        width: 150 },
      { header: "Description",               field: "description",      width: 300 },
      { header: "Net Amount",                 field: "net_amount",       width: 110, numeric: true },
      { header: "VAT (12%)",                  field: "vat_amount",       width: 90,  numeric: true },
      { header: "Amount (Total)",             field: "total_amount",     width: 110, numeric: true },
      { header: "OR # or PCV",                field: "or_number",        width: 160 },
      { header: "Link",                       field: "file_url",         width: 320 },
      { header: "Tag",                        field: "tag",              width: 120 },
      { header: "Receipt Validity (OK or NV)",field: "receipt_validity", width: 180 },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Quick overview — date, payee, amount, type, OR number.",
    columns: [
      { header: "Date",            field: "date",            width: 100 },
      { header: "Payee",           field: "vendor",          width: 220 },
      { header: "Type of expense", field: "type_of_expense", width: 220 },
      { header: "Amount",          field: "total_amount",    width: 120, numeric: true },
      { header: "OR # or PCV",     field: "or_number",       width: 160 },
      { header: "Mode of Payment", field: "payment_method",  width: 150 },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID = "disbursement";

export function getTemplate(id: string | null | undefined): SheetTemplate {
  return SHEET_TEMPLATES.find((t) => t.id === id) ?? SHEET_TEMPLATES[0];
}
