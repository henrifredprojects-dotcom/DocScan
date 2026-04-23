import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DocumentRow, DocumentStatus } from "@/lib/types";

export async function listWorkspaceDocuments(workspaceId: string): Promise<DocumentRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as DocumentRow[];
}

const PAGE_SIZE = 50;

export async function listWorkspaceDocumentsPaginated(
  workspaceId: string,
  page: number,
  search?: string,
  status?: DocumentStatus,
): Promise<{
  documents: DocumentRow[];
  total: number;
  pageSize: number;
  countsByStatus: Record<DocumentStatus, number>;
}> {
  const supabase = await getSupabaseServerClient();
  const offset = (page - 1) * PAGE_SIZE;
  const q = search?.trim();

  let listQuery = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status) listQuery = listQuery.eq("status", status);
  if (q) {
    listQuery = listQuery.or(
      `extracted_data->>vendor.ilike.%${q}%,extracted_data->>reference_number.ilike.%${q}%,validated_data->>vendor.ilike.%${q}%`,
    );
  }

  const [listResult, pendingResult, validatedResult, rejectedResult] = await Promise.all([
    listQuery,
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "validated"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "rejected"),
  ]);

  return {
    documents: (listResult.data ?? []) as DocumentRow[],
    total: listResult.count ?? 0,
    pageSize: PAGE_SIZE,
    countsByStatus: {
      pending: pendingResult.count ?? 0,
      validated: validatedResult.count ?? 0,
      rejected: rejectedResult.count ?? 0,
    },
  };
}

type PartialDoc = Pick<DocumentRow, "extracted_data" | "validated_data"> & { created_at?: string; exported_at?: string | null };

function getAmount(doc: PartialDoc): number {
  const merged = { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) };
  const v = merged.total_amount;
  return typeof v === "number" ? v : 0;
}

function getCategoryName(doc: PartialDoc): string {
  const merged = { ...(doc.extracted_data ?? {}), ...(doc.validated_data ?? {}) };
  return String(merged.category_name ?? merged.suggested_category ?? "Uncategorized");
}

export async function getDashboardData(workspaceId: string) {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const thisMonthStart = startOfMonth(now).toISOString();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
  const sevenDaysAgo = subDays(now, 7).toISOString();

  const [
    pendingCountResult,
    readyCountResult,
    exportedTotalResult,
    exportedWeekResult,
    thisMonthDocsResult,
    lastMonthDocsResult,
    exportedThisMonthResult,
    pendingDocsResult,
    recentCreatedResult,
    recentExportedResult,
  ] = await Promise.all([
    // 1. Pending count
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending"),

    // 2. Ready to export count (validated, not yet exported)
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "validated")
      .is("exported_at", null),

    // 3. Total exported count
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .not("exported_at", "is", null),

    // 4. Exported this week count
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("exported_at", sevenDaysAgo),

    // 5. This month validated docs (amount + category only)
    supabase
      .from("documents")
      .select("extracted_data, validated_data, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "validated")
      .gte("created_at", thisMonthStart),

    // 6. Last month validated docs
    supabase
      .from("documents")
      .select("extracted_data, validated_data, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "validated")
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd),

    // 7. Exported this month (for amount strip)
    supabase
      .from("documents")
      .select("exported_at, extracted_data, validated_data")
      .eq("workspace_id", workspaceId)
      .gte("exported_at", thisMonthStart),

    // 8. Pending docs for priority queue display
    supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),

    // 9. Recently created (for recent activity)
    supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8),

    // 10. Recently exported (for recent activity)
    supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .not("exported_at", "is", null)
      .order("exported_at", { ascending: false })
      .limit(8),
  ]);

  const thisMonthDocs = (thisMonthDocsResult.data ?? []) as PartialDoc[];
  const lastMonthDocs = (lastMonthDocsResult.data ?? []) as PartialDoc[];
  const exportedThisMonthDocs = (exportedThisMonthResult.data ?? []) as PartialDoc[];

  // Top categories this month
  const catMap: Record<string, { name: string; amount: number; count: number }> = {};
  for (const doc of thisMonthDocs) {
    const name = getCategoryName(doc);
    const amount = getAmount(doc);
    if (!catMap[name]) catMap[name] = { name, amount: 0, count: 0 };
    catMap[name].amount += amount;
    catMap[name].count += 1;
  }
  const topCategories = Object.values(catMap).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Recent activity: merge created + exported, deduplicate, sort by action time
  const recentCreated = (recentCreatedResult.data ?? []) as DocumentRow[];
  const recentExported = (recentExportedResult.data ?? []) as DocumentRow[];
  const seen = new Set<string>();
  const merged: DocumentRow[] = [];
  for (const doc of [...recentCreated, ...recentExported]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  }
  const recentActivity = merged
    .sort((a, b) => {
      const aTime = a.exported_at ?? a.created_at;
      const bTime = b.exported_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 8);

  return {
    pendingCount: pendingCountResult.count ?? 0,
    readyToExportCount: readyCountResult.count ?? 0,
    exportedTotalCount: exportedTotalResult.count ?? 0,
    exportedThisWeekCount: exportedWeekResult.count ?? 0,
    exportedThisMonthAmount: exportedThisMonthDocs.reduce((s, d) => s + getAmount(d), 0),
    thisMonthCount: thisMonthDocs.length,
    thisMonthAmount: thisMonthDocs.reduce((s, d) => s + getAmount(d), 0),
    lastMonthCount: lastMonthDocs.length,
    lastMonthAmount: lastMonthDocs.reduce((s, d) => s + getAmount(d), 0),
    topCategories,
    pendingDocs: (pendingDocsResult.data ?? []) as DocumentRow[],
    recentActivity,
  };
}

export async function getDocumentById(documentId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) throw error;
  return data as DocumentRow;
}

export async function getLastExportedAtByWorkspace(
  workspaceIds: string[],
): Promise<Record<string, string | null>> {
  if (workspaceIds.length === 0) return {};
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select("workspace_id, exported_at")
    .in("workspace_id", workspaceIds)
    .not("exported_at", "is", null)
    .order("exported_at", { ascending: false })
    .limit(workspaceIds.length * 5);

  const result: Record<string, string | null> = {};
  for (const id of workspaceIds) result[id] = null;
  for (const row of data ?? []) {
    const wid = row.workspace_id as string;
    if (result[wid] === null) result[wid] = row.exported_at as string;
  }
  return result;
}

export async function getAnalyticsData(workspaceId: string) {
  const supabase = await getSupabaseServerClient();
  const [validatedResult, allSourcesResult] = await Promise.all([
    supabase
      .from("documents")
      .select("extracted_data, validated_data, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "validated"),
    supabase
      .from("documents")
      .select("source")
      .eq("workspace_id", workspaceId),
  ]);
  return {
    validatedDocs: (validatedResult.data ?? []) as PartialDoc[],
    allDocs: (allSourcesResult.data ?? []) as { source: string }[],
  };
}

export async function getReportData(
  workspaceId: string,
  month: string,
): Promise<Pick<DocumentRow, "id" | "extracted_data" | "validated_data" | "created_at" | "status">[]> {
  const [yearStr, monthStr] = month.split("-");
  const start = new Date(Number(yearStr), Number(monthStr) - 1, 1).toISOString();
  const end = new Date(Number(yearStr), Number(monthStr), 1).toISOString();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select("id, extracted_data, validated_data, created_at, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "validated")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });
  return (data ?? []) as Pick<DocumentRow, "id" | "extracted_data" | "validated_data" | "created_at" | "status">[];
}

export async function getFewShotExamples(workspaceId: string): Promise<
  Array<{ extracted: Record<string, unknown>; validated: Record<string, unknown> }>
> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select("extracted_data, validated_data")
    .eq("workspace_id", workspaceId)
    .eq("status", "validated")
    .not("validated_data", "is", null)
    .order("created_at", { ascending: false })
    .limit(15);

  return (data ?? [])
    .filter((d) => d.extracted_data && d.validated_data)
    .map((d) => ({
      extracted: d.extracted_data as Record<string, unknown>,
      validated: d.validated_data as Record<string, unknown>,
    }));
}

export async function updateDocumentStatus(params: {
  documentId: string;
  status: DocumentStatus;
  validatedData?: Record<string, unknown>;
  exportedAt?: string;
  categoryId?: string | null;
}) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({
      status: params.status,
      validated_data: params.validatedData ?? null,
      exported_at: params.exportedAt ?? null,
      ...(params.categoryId !== undefined && { category_id: params.categoryId || null }),
    })
    .eq("id", params.documentId);

  if (error) throw error;
}
