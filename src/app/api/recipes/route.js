import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { cuisines, restrictions, budget } = await request.json();

    // Start query
    let query = supabase
      .from('recipes')
      .select('*')
      .in('cuisine', cuisines);

    // Filter by budget bucket
    if (budget) {
      query = query.eq('budget_bucket', budget);
    }

    // Filter by dietary restrictions
    if (restrictions && !restrictions.includes('No Restrictions')) {
      const tagMap = {
        'Vegetarian':  'vegetarian',
        'Vegan':       'vegan',
        'Gluten-Free': 'gluten-free',
        'Dairy-Free':  'dairy-free',
        'Keto':        'keto',
      };
      for (const restriction of restrictions) {
        const tag = tagMap[restriction];
        if (tag) {
          query = query.contains('tags', [tag]);
        }
      }
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // If no results found, retry without budget filter
    // so the app never returns empty-handed
    let recipes = data;
    if (!recipes || recipes.length < 5) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('recipes')
        .select('*')
        .in('cuisine', cuisines);

      if (fallbackError) throw new Error(fallbackError.message);
      recipes = fallback;
    }

    // Group by category to match the structure the app expects
    const grouped = {
      proteins:   recipes.filter(r => r.category === 'proteins'),
      carbs:      recipes.filter(r => r.category === 'carbs'),
      vegetables: recipes.filter(r => r.category === 'vegetables'),
      fats:       recipes.filter(r => r.category === 'fats'),
      snacks:     recipes.filter(r => r.category === 'snacks'),
    };

    return NextResponse.json(grouped);

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
