import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  // Count recipes per category
  const { data, error } = await supabase
    .from('recipes')
    .select('category, cuisine, budget_bucket');

  if (error) return NextResponse.json({ error: error.message });

  const summary = {
    total: data.length,
    byCategory: {},
    byCuisine: {},
    byBudget: {},
  };

  data.forEach(r => {
    summary.byCategory[r.category] = (summary.byCategory[r.category] || 0) + 1;
    summary.byCuisine[r.cuisine]   = (summary.byCuisine[r.cuisine]   || 0) + 1;
    summary.byBudget[r.budget_bucket] = (summary.byBudget[r.budget_bucket] || 0) + 1;
  });

  return NextResponse.json(summary);
}
