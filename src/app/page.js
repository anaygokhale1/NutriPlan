// src/app/page.js
//
// Loads NutritionPlanner with SSR disabled.
// This prevents React hydration mismatches (errors #418 #423 #425)
// caused by auth state being different on server vs client.
// The component only renders in the browser where localStorage exists.

'use client';

import dynamic from 'next/dynamic';

// ssr: false means Next.js never renders this on the server.
// The component only mounts in the browser, where Supabase
// can read the session from localStorage correctly.
const NutritionPlanner = dynamic(
  () => import('@/components/NutritionPlanner'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fdfaf5',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid #dde8e0',
            borderTopColor: '#40916c',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#7a8c82', fontWeight: 600, fontSize: '1rem' }}>
            Loading VitalMenu...
          </p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return <NutritionPlanner />;
}
