"use client";

import { CONTACT_EMAIL } from "@/lib/contact";

/**
 * Last-resort boundary when the root layout itself fails. It renders its own
 * document, so it uses inline styles rather than the app stylesheet.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#111214", background: "#ffffff" }}>
        <main style={{ maxWidth: "62ch", margin: "0 auto", padding: "80px 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Fydell did not load</h1>
          <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, color: "#4b4f57" }}>
            Something failed before the page could render. Your saved work is safe. Try again, and if it keeps happening, email{" "}
            {CONTACT_EMAIL} with the reference below.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, height: 40, padding: "0 16px", borderRadius: 8, border: 0, background: "#111214", color: "#fff", fontSize: 15, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: 32, fontSize: 13, color: "#6b7079" }}>
              Reference <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
