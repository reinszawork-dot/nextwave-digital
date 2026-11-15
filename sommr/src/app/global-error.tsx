'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-ZA">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#faf6ef', color: '#1f1c18', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontWeight: 500 }}>SOMMR hit a snag</h1>
          <p style={{ color: '#6f675b' }}>Please refresh the page.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 999, border: 0, background: '#1f1c18', color: '#faf6ef' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
