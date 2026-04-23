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
    case "date":           return String(validatedData.date ?? "");
    case "vendor":         return String(validatedData.vendor ?? "");
    case "total_amount":   return Number(validatedData.total_amount ?? 0);
    case "vat_amount":     return Number(validatedData.vat_amount ?? 0);
    case "net_amount": {
      const net = Number(validatedData.net_amount ?? 0)
        || Number(validatedData.total_amount ?? 0) - Number(validatedData.vat_amount ?? 0);
      return Number(net.toFixed(2));
    }
    case "currency":       return String(validatedData.currency ?? workspace.currency ?? "PHP");
    case "category_name":  return String(validatedData.category_name ?? validatedData.suggested_category ?? "");
    case "payment_method": return String(validatedData.payment_method ?? "");
    case "note":           return String(validatedData.note ?? "");
    case "source":         return doc.source;
    case "file_url":       return fileSignedUrl;
    case "status":         return doc.status;
    case "user_email":     return String(validatedData.user_email ?? "");
    case "document_type":  return String(validatedData.document_type ?? "");
    case "reference_number": return String(validatedData.reference_number ?? "");
    case "due_date":       return String(validatedData.due_date ?? "");
    case "period":         return String(validatedData.period ?? "");
    default:               return "";
  }
}

// ── Template definitions ──────────────────────────────────────────────────────

export const SHEET_TEMPLATES: SheetTemplate[] = [
  {
    id: "standard",
    label: "Standard",
    description: "All fields — suitable for most workspaces.",
    columns: [
      { header: "Date",           field: "date",             width: 100 },
      { header: "Fournisseur",    field: "vendor",           width: 220 },
      { header: "Montant TTC",    field: "total_amount",     width: 110, numeric: true },
      { header: "TVA",            field: "vat_amount",       width: 90,  numeric: true },
      { header: "Montant HT",     field: "net_amount",       width: 110, numeric: true },
      { header: "Devise",         field: "currency",         width: 70  },
      { header: "Catégorie",      field: "category_name",    width: 150 },
      { header: "Mode paiement",  field: "payment_method",   width: 130 },
      { header: "Notes",          field: "note",             width: 220 },
      { header: "Source",         field: "source",           width: 70  },
      { header: "Lien document",  field: "file_url",         width: 320 },
      { header: "Statut",         field: "status",           width: 90  },
      { header: "Ajouté par",     field: "user_email",       width: 200 },
      { header: "Type",           field: "document_type",    width: 100 },
      { header: "Référence",      field: "reference_number", width: 150 },
      { header: "Échéance",       field: "due_date",         width: 100 },
      { header: "Période",        field: "period",           width: 120 },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Quick overview — date, vendor, amount, category, status.",
    columns: [
      { header: "Date",          field: "date",          width: 100 },
      { header: "Fournisseur",   field: "vendor",        width: 220 },
      { header: "Montant TTC",   field: "total_amount",  width: 120, numeric: true },
      { header: "Devise",        field: "currency",      width: 70  },
      { header: "Catégorie",     field: "category_name", width: 160 },
      { header: "Statut",        field: "status",        width: 90  },
      { header: "Ajouté par",    field: "user_email",    width: 200 },
    ],
  },
  {
    id: "comptable",
    label: "Comptable",
    description: "Optimised for accountants — HT, TVA, TTC, échéances, références.",
    columns: [
      { header: "Date",           field: "date",             width: 100 },
      { header: "Type",           field: "document_type",    width: 110 },
      { header: "Référence",      field: "reference_number", width: 150 },
      { header: "Fournisseur",    field: "vendor",           width: 220 },
      { header: "Montant HT",     field: "net_amount",       width: 110, numeric: true },
      { header: "TVA",            field: "vat_amount",       width: 90,  numeric: true },
      { header: "Montant TTC",    field: "total_amount",     width: 110, numeric: true },
      { header: "Devise",         field: "currency",         width: 70  },
      { header: "Catégorie",      field: "category_name",    width: 150 },
      { header: "Échéance",       field: "due_date",         width: 100 },
      { header: "Mode paiement",  field: "payment_method",   width: 130 },
      { header: "Notes",          field: "note",             width: 220 },
      { header: "Statut",         field: "status",           width: 90  },
      { header: "Ajouté par",     field: "user_email",       width: 200 },
    ],
  },
  {
    id: "clinique",
    label: "Clinique",
    description: "Optimisé pour les cliniques dentaires Philippines — fournitures, équipements, loyers.",
    columns: [
      { header: "Date",           field: "date",             width: 100 },
      { header: "Fournisseur",    field: "vendor",           width: 220 },
      { header: "Type",           field: "document_type",    width: 110 },
      { header: "Référence",      field: "reference_number", width: 150 },
      { header: "Montant TTC",    field: "total_amount",     width: 110, numeric: true },
      { header: "TVA (12%)",      field: "vat_amount",       width: 90,  numeric: true },
      { header: "Montant HT",     field: "net_amount",       width: 110, numeric: true },
      { header: "Devise",         field: "currency",         width: 70  },
      { header: "Catégorie",      field: "category_name",    width: 160 },
      { header: "Mode paiement",  field: "payment_method",   width: 130 },
      { header: "Période",        field: "period",           width: 120 },
      { header: "Notes",          field: "note",             width: 220 },
      { header: "Lien document",  field: "file_url",         width: 320 },
      { header: "Statut",         field: "status",           width: 90  },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID = "standard";

export function getTemplate(id: string | null | undefined): SheetTemplate {
  return SHEET_TEMPLATES.find((t) => t.id === id) ?? SHEET_TEMPLATES[0];
}
