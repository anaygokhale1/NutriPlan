// src/app/page.js
//
// Root page — checks auth state.
// Logged-in users: load their profile and go straight to the app.
// Guests: redirect to /auth to sign in or sign up.

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import NutritionPlanner from '@/components/NutritionPlanner';

export default async function HomePage() {
  // Create a server-side Supabase client using the request cookies
  // This is how Next.js App Router reads the auth session server-side.
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
      },
    }
  );

  // Get the current user from the session cookie
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, redirect to auth page
  if (!user) {
    redirect('/auth');
  }

  // Load their saved profile (may be null for brand new users)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Pass user and profile as props so NutritionPlanner can pre-fill the form
  return (
    <NutritionPlanner
      initialUser={{ id: user.id, email: user.email, name: user.user_metadata?.full_name }}
      initialProfile={profile}
    />
  );
}
