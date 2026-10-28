// Z02 when the root layout itself fails. Renders its own document (no next/font, no providers): system serif fallback.
"use client";

import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" data-theme="light" data-light="paper">
      <body>
        <title>Pods</title>
        <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-between px-gutter py-s16">
          {/* eslint-disable-next-line @next/next/no-img-element -- no next/image without the root layout */}
          <img src="/brand/mark.svg" alt="Pods" width={28} height={28} />
          <div>
            <h1 className="line text-display-lg">Something slipped.</h1>
            <p className="mt-s4 text-body text-ink-2">Your seats are kept.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => retry()} className="inline-flex h-14 items-center rounded-full bg-ink px-7 text-[17px] font-semibold text-lit">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
