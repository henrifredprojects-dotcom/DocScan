import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "documents";

// Accepts either a bare storage path ("workspace/doc/file.jpg")
// or a legacy full public URL — extracts the path in that case.
function toStoragePath(fileUrlOrPath: string): string {
  if (!fileUrlOrPath.startsWith("http")) return fileUrlOrPath;
  const match = fileUrlOrPath.match(/\/(?:public|sign)\/documents\/(.+?)(?:\?|$)/);
  return match ? match[1] : fileUrlOrPath;
}

export async function getSignedDocumentUrl(
  fileUrlOrPath: string,
  expiresIn = 3600,
): Promise<string> {
  const admin = getSupabaseAdminClient();
  const path = toStoragePath(fileUrlOrPath);
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(`Failed to create signed URL: ${error?.message}`);
  return data.signedUrl;
}
