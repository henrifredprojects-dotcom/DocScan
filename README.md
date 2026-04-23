# DocScan v0

DocScan is a multi-workspace accounting document app:
- upload/photo per workspace
- AI extraction (OpenAI Vision)
- manual review required before validation
- export to Google Sheets per workspace

## Stack

- Next.js App Router
- Supabase (Auth, Postgres, Storage, RLS)
- OpenAI API
- Google Sheets API

## Setup (M0)

1. Copy env template:
   - `cp .env.example .env.local` (or duplicate manually on Windows)
2. Fill all values in `.env.local`.
3. Run DB schema in Supabase SQL editor:
   - `supabase/schema.sql`
4. Create a Supabase Storage bucket named:
   - `documents`
5. Share each workspace sheet with the service account email.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Milestone map

- M1: workspace core and isolation
- M2: capture/upload and document storage
- M3: OCR extraction normalization and required field validation
- M4: manual review workflow
- M5: workspace-specific sheet export
- M6: OCR KPI script (`npm run ocr:kpi`)

## Notes

- Validation is manual-first by design in v0.
- `workspace_id` is enforced server-side before write/export.
- RLS policies isolate all workspace data by owner.
