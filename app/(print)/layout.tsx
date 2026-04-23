import type { ReactNode } from "react";

// Clean print layout — no sidebar, no nav chrome
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #111; background: #fff; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #111; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #444; }
          td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
          tfoot td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; }
          .mono { font-family: monospace; }
          .text-right { text-align: right; }
          .muted { color: #6b7280; }
          .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
          .header { margin-bottom: 28px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          @media print {
            body { print-color-adjust: exact; }
            @page { size: A4; margin: 20mm 16mm; }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
