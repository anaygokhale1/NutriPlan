'use client';

// src/hooks/useAuth.js
//
// React hook that gives any component access to the current user,
// their profile, and auth actions (signOut, saveProfile, loadProfile).
//
// Usage:
//   const { user, profile, loading, signOut, saveProfile } = useAuth();

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── On mount: get current session and subscribe to auth changes ──────────
  useEffect(() => {
    // Get the current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadProfile(currentUser.id);
      else setLoading(false);
    });

    // Listen for sign in / sign out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Load user profile from Supabase ──────────────────────────────────────
  const loadProfile = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) setProfile(data);
    else if (error?.code !== 'PGRST116') {
      // PGRST116 = no rows found — expected for new users
      console.error('Profile load error:', error);
    }
    setLoading(false);
  };

  // ── Save / update user profile ────────────────────────────────────────────
  // Call this after onboarding completes or when userData changes.
  // userData is the state object from NutritionPlanner.jsx.
  const saveProfile = async (userData) => {
    if (!user) return { error: 'Not signed in' };

    const { error } = await supabase.from('user_profiles').upsert({
      user_id:             user.id,
      full_name:           user.user_metadata?.full_name || '',
      weight:              parseFloat(userData.weight) || null,
      weight_unit:         userData.weightUnit,
      height:              parseFloat(userData.height) || null,
      height_unit:         userData.heightUnit,
      height_ft:           parseFloat(userData.heightFt) || null,
      height_in:           parseFloat(userData.heightIn) || null,
      age:                 parseInt(userData.age) || null,
      sex:                 userData.sex,
      goals:               userData.goals,
      target_weight:       parseFloat(userData.targetWeight) || null,
      activities:          userData.activities,
      cuisine_preferences: userData.preferences,
      restrictions:        userData.restrictions,
      meat_options:        userData.meatOptions,
      food_allergies:      userData.foodAllergies,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (!error) await loadProfile(user.id);
    return { error };
  };

  // ── Convert a saved profile back to userData shape ────────────────────────
  // Call this on app load to pre-fill the form for returning users.
  const profileToUserData = (p) => {
    if (!p) return null;
    return {
      weight:       String(p.weight || ''),
      targetWeight: String(p.target_weight || ''),
      weightUnit:   p.weight_unit || 'kg',
      height:       String(p.height || ''),
      heightUnit:   p.height_unit || 'cm',
      heightFt:     String(p.height_ft || ''),
      heightIn:     String(p.height_in || ''),
      age:          String(p.age || ''),
      sex:          p.sex || '',
      goals:        p.goals || [],
      activities:   p.activities || [],
      preferences:  p.cuisine_preferences || [],
      restrictions: p.restrictions || [],
      meatOptions:  p.meat_options || [],
      foodAllergies: p.food_allergies || [],
    };
  };

  // ── Save a generated meal plan ────────────────────────────────────────────
  const saveMealPlan = async (weeklyPlan, macroTargets, planName) => {
    if (!user) return { error: 'Not signed in' };

    const { data, error } = await supabase
      .from('saved_meal_plans')
      .insert({
        user_id:       user.id,
        plan_name:     planName || `Week of ${new Date().toLocaleDateString()}`,
        plan_data:     weeklyPlan,
        macro_targets: macroTargets,
        is_active:     true,
      })
      .select()
      .single();

    return { data, error };
  };

  // ── Load saved meal plans for this user ───────────────────────────────────
  const loadMealPlans = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('saved_meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return {
    user,
    profile,
    loading,
    isLoggedIn: !!user,
    signOut,
    saveProfile,
    saveMealPlan,
    loadMealPlans,
    profileToUserData,
    supabase,
  };
}
