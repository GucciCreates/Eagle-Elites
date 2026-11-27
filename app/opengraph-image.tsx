import { ImageResponse } from 'next/og';

export const alt = 'Eagle Elites — student & staff transport across Islamabad, Rawalpindi and Wah Cantt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: 'white',
          background:
            'radial-gradient(circle at 12% 12%, rgba(250,204,21,0.28), transparent 42%), radial-gradient(circle at 90% 85%, rgba(56,189,248,0.16), transparent 40%), #070b10',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #fde68a, #facc15 55%, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 900,
              color: '#0b0f16',
            }}
          >
            EE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>Eagle Elites</div>
            <div style={{ fontSize: 18, letterSpacing: 4, color: '#a1a1aa' }}>STUDENT & STAFF TRANSPORT</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>Your daily ride to campus,</div>
          <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.1, letterSpacing: -3, color: '#facc15' }}>handled.</div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 24, color: '#e4e4e7' }}>
          {['Live GPS tracking', '15+ institutions', '24/7 WhatsApp support'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
