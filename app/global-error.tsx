'use client';

// Last-resort screen when the root layout itself fails. It renders its own
// document without the app's stylesheet, so styles are inline.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#06080c', color: '#f5f7fb', fontFamily: 'system-ui, sans-serif' }}>
        <title>Something went wrong | Eagle Elites</title>
        <main role="alert" style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#f1cf6c', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Eagle Elites</p>
          <h1 style={{ fontSize: 28, margin: '8px 0 12px' }}>Something went wrong</h1>
          <p style={{ color: '#8e97a6', lineHeight: 1.6, fontSize: 14 }}>Please try again. If it keeps happening, contact us on WhatsApp at 0322 5166580.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 20, minHeight: 48, padding: '0 24px', border: 0, borderRadius: 12, background: '#e8bb40', color: '#15110a', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
