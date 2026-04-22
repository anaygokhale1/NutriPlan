import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const REQUIRED_CATEGORIES = ['proteins', 'carbs', 'vegetables', 'fats', 'snacks'];

const TAG_MAP = {
  'Vegetarian':  'vegetarian',
  'Vegan':       'vegan',
  'Gluten-Free': 'gluten-free',
  'Dairy-Free':  'dairy-free',
  'Keto':        'keto',
};

async function queryRecipes({ cuisines, restrictions, budget }) {
  let query = supabase
    .from('recipes')
    .select('*')
    .in('cuisine', cuisines);

  // Apply budget filter if provided
  if (budget) {
    query = query.eq('budget_bucket', budget);
  }

  // Apply dietary restriction tag filters
  if (restrictions && !restrictions.includes('No Restrictions')) {
    for (const restriction of restrictions) {
      const tag = TAG_MAP[restriction];
      if (tag) {
        query = query.contains('tags', [tag]);
      }
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

function groupByCategory(recipes) {
  return {
    proteins:   recipes.filter(r => r.category === 'proteins'),
    carbs:      recipes.filter(r => r.category === 'carbs'),
    vegetables: recipes.filter(r => r.category === 'vegetables'),
    fats:       recipes.filter(r => r.category === 'fats'),
    snacks:     recipes.filter(r => r.category === 'snacks'),
  };
}

function allCategoriesHaveItems(grouped) {
  return REQUIRED_CATEGORIES.every(cat => grouped[cat] && grouped[cat].length > 0);
}

export async function POST(request) {
  try {
    const { cuisines, restrictions, budget } = await request.json();

    // ── Attempt 1: Full filter (cuisine + budget + restrictions) ──
    let recipes = await queryRecipes({ cuisines, restrictions, budget });
    let grouped = groupByCategory(recipes);

    // ── Attempt 2: Drop budget filter if any category is empty ──
    if (!allCategoriesHaveItems(grouped)) {
      console.log('Budget filter left empty categories — retrying without budget filter');
      recipes = await queryRecipes({ cuisines, restrictions, budget: null });
      grouped = groupByCategory(recipes);
    }

    // ── Attempt 3: Drop restrictions too, keep only cuisine ──
    if (!allCategoriesHaveItems(grouped)) {
      console.log('Restriction filter left empty categories — retrying with cuisine only');
      recipes = await queryRecipes({ cuisines, restrictions: [], budget: null });
      grouped = groupByCategory(recipes);
    }

    // ── Attempt 4: Widen to ALL cuisines as last resort ──
    if (!allCategoriesHaveItems(grouped)) {
      console.log('Cuisine filter left empty categories — fetching all cuisines');
      const { data, error } = await supabase.from('recipes').select('*');
      if (error) throw new Error(error.message);
      grouped = groupByCategory(data || []);
    }

    // Final check — if still empty something is wrong with the DB
    const emptyCats = REQUIRED_CATEGORIES.filter(cat => !grouped[cat] || grouped[cat].length === 0);
    if (emptyCats.length > 0) {
      return NextResponse.json(
        { error: `Database is missing recipes for: ${emptyCats.join(', ')}. Please check your Supabase table.` },
        { status: 500 }
      );
    }

    return NextResponse.json(grouped);

  } catch (error) {
    console.error('Recipe fetch error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
