'use client';

// Catastrophic fallback: replaces the ROOT layout when the layout itself throws,
// so it must render its own <html>/<body> and cannot rely on globals.css or the
// i18n provider. English-only, inline-styled — last resort. `error` is unused.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0C111A',
          color: '#E5E7EB',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ textAlign: 'center', padding: '2rem', maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#9CA3AF', lineHeight: 1.5 }}>
            An unexpected error occurred. Please try again — if it persists, the page may be
            temporarily unavailable.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              minHeight: '2.75rem',
              padding: '0 1.25rem',
              borderRadius: '0.5rem',
              border: 0,
              background: '#1D4ED8',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
