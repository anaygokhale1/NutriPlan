'use client';

// src/app/page.js
//
// Root page — shows landing page to unauthenticated visitors.
// Signed-in users skip straight to the app.

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import LandingPage from './landing/page';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NutritionPlanner = dynamic(
  () => import('@/components/NutritionPlanner'),
  { ssr: false }
);

export default function HomePage() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'user' | 'guest'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session?.user ? 'user' : 'guest');
    }).catch(() => setAuthState('guest'));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session?.user ? 'user' : 'guest');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Brief loading state while checking session
  if (authState === 'loading') {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center',
        justifyContent:'center', background:'#fdfaf5',
        fontFamily:"'DM Sans', sans-serif",
      }}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem', marginBottom:'0.75rem'}}>🥗</div>
          <div style={{
            width:32, height:32,
            border:'2.5px solid #dde8e0', borderTopColor:'#40916c',
            borderRadius:'50%', animation:'spin 0.8s linear infinite',
            margin:'0 auto',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // Authenticated — show the full app
  if (authState === 'user') return <NutritionPlanner />;

  // Guest — show the landing page
  return <LandingPage />;
}
