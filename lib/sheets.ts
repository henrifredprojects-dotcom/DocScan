import { google } from "googleapis";

import { requireServerEnv } from "@/lib/env";
import { getTemplate, resolveField } from "@/lib/sheets-templates";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import type { DocumentRow, Workspace } from "@/lib/types";

// Module-level singletons — JWT auth handles token refresh internally.
// Re-creating them per export call wastes RSA key parsing time (~20ms each).
let _authClient: InstanceType<typeof google.auth.JWT> | null = null;
let _sheetsClient: ReturnType<typeof google.sheets> | null = null;
let _driveAuthClient: InstanceType<typeof google.auth.JWT> | null = null;

function getAuthClient() {
  if (_authClient) return _authClient;
  const env = requireServerEnv();
  _authClient = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googleServiceAccountPrivateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return _authClient;
}

// Separate client with Drive scope — only used for sheet creation/sharing.
function getDriveAuthClient() {
  if (_driveAuthClient) return _driveAuthClient;
  const env = requireServerEnv();
  _driveAuthClient = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googleServiceAccountPrivateKey.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
  return _driveAuthClient;
}

function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;
  _sheetsClient = google.sheets({ version: "v4", auth: getAuthClient() });
  return _sheetsClient;
}

// Creates a new Google Sheet, applies the header row + formatting, then shares
// it with userEmail as writer so the user can open it from their Google Drive.
export async function createAndShareSheet(
  workspaceName: string,
  userEmail: string,
  templateId: string | null,
): Promise<{ sheetId: string; tabName: string }> {
  const auth = getDriveAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const tabName = "Expenses";
  const template = getTemplate(templateId);

  // Create spreadsheet
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `${workspaceName} — DocScan` },
      sheets: [{ properties: { title: tabName } }],
    },
  });

  const spreadsheetId = created.data.spreadsheetId!;
  const sheetId = created.data.sheets?.[0]?.properties?.sheetId ?? 0;

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [template.columns.map((c) => c.header)] },
  });

  // Apply formatting (same as export flow)
  await applySheetFormatting(
    sheets,
    spreadsheetId,
    sheetId,
    template.columns.length,
    template.columns.map((c) => c.width),
    template.columns.map((c, i) => (c.numeric ? i : -1)).filter((i) => i >= 0),
  );

  // Share with the user so they can find it in their Drive
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: userEmail },
    sendNotificationEmail: false,
  });

  return { sheetId: spreadsheetId, tabName };
}

async function applySheetFormatting(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetId: number,
  numCols: number,
  columnWidths: number[],
  numericColIndices: number[],
) {
  const BLUE = { red: 0.24, green: 0.40, blue: 0.82 };
  const WHITE = { red: 1, green: 1, blue: 1 };
  const LIGHT_BLUE = { red: 0.94, green: 0.96, blue: 1 };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Freeze header
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // Bold blue header
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
            cell: {
              userEnteredFormat: {
                backgroundColor: BLUE,
                textFormat: { bold: true, foregroundColor: WHITE, fontSize: 10 },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Number format on numeric columns
        ...numericColIndices.map((colIdx) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: colIdx, endColumnIndex: colIdx + 1 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0.00" } } },
            fields: "userEnteredFormat.numberFormat",
          },
        })),
        // Column widths
        ...columnWidths.map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: "pixelSize",
          },
        })),
        // Header row height
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 36 },
            fields: "pixelSize",
          },
        },
      ],
    },
  });

  // Banding separately — silently ignore if one already exists
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addBanding: {
            bandedRange: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 10000, startColumnIndex: 0, endColumnIndex: numCols },
              rowProperties: {
                headerColor: BLUE,
                firstBandColor: WHITE,
                secondBandColor: LIGHT_BLUE,
              },
            },
          },
        }],
      },
    });
  } catch {
    // Banding already exists — not a blocking error
  }
}

export async function exportToWorkspaceSheet(params: {
  workspace: Workspace;
  document: DocumentRow;
  validatedData: Record<string, unknown>;
}) {
  const { workspace, document, validatedData } = params;

  if (!workspace.sheets_id || !workspace.sheets_tab) {
    throw new Error("Workspace has no sheets_id/sheets_tab configured.");
  }

  const template = getTemplate(workspace.sheets_template);
  const fileSignedUrl = await getSignedDocumentUrl(document.file_url, 31536000).catch(() => document.file_url);

  const headerRow = template.columns.map((c) => c.header);
  const dataRow = template.columns.map((c) =>
    resolveField(c.field, document, workspace, validatedData, fileSignedUrl),
  );
  const columnWidths = template.columns.map((c) => c.width);
  const numericColIndices = template.columns
    .map((c, i) => (c.numeric ? i : -1))
    .filter((i) => i >= 0);

  const sheets = getSheetsClient();

  // Check if sheet tab is empty
  const { data: existing } = await sheets.spreadsheets.values.get({
    spreadsheetId: workspace.sheets_id,
    range: `${workspace.sheets_tab}!A1`,
  });
  const isEmpty = !existing.values || existing.values.length === 0;

  if (isEmpty) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: workspace.sheets_id,
      range: `${workspace.sheets_tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headerRow] },
    });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: workspace.sheets_id,
      fields: "sheets(properties(sheetId,title))",
    });
    const sheetId = meta.data.sheets?.find(
      (s) => s.properties?.title === workspace.sheets_tab,
    )?.properties?.sheetId;

    if (sheetId !== undefined && sheetId !== null) {
      await applySheetFormatting(
        sheets,
        workspace.sheets_id,
        sheetId,
        template.columns.length,
        columnWidths,
        numericColIndices,
      );
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: workspace.sheets_id,
    range: `${workspace.sheets_tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [dataRow] },
  });
}
