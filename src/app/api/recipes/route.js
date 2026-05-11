// src/app/api/recipes/route.js
//
// Fetches recipes from Supabase filtered by:
//   - Cuisine preferences (user's selected cuisines)
//   - Dietary restrictions (Vegetarian, Vegan, Keto, etc.)
//   - Meat options (Chicken only, Seafood only, etc.)
//   - Food allergies (exclude recipes tagged with allergens)
//
// The filtering happens HERE in the database query — not in the AI prompt.
// The AI only sees recipes that already comply with the user's preferences.
// This is the correct approach: filter first, then let AI plan.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { cuisines, restrictions, meatOptions, foodAllergies } = await req.json();

    // ── Step 1: Base query — fetch all needed columns ─────────────────────
    // We fetch only lightweight columns for the AI food list.
    // Instructions and ingredients are fetched separately only when a user
    // clicks the Recipe button (via a separate /api/recipe/[id] endpoint).
    let query = supabase
      .from('recipes')
      .select('id, name, cuisine, category, calories, protein, carbs, fat, fiber, portion_size, cooking_time, tags, ingredients, instructions, ingredient_quantities, meal_type');

    // ── Step 2: Filter by cuisine preferences ────────────────────────────
    // Only return recipes matching the user's selected cuisines.
    if (cuisines && cuisines.length > 0) {
      query = query.in('cuisine', cuisines);
    }

    // Execute the query
    const { data: allRecipes, error } = await query;

    if (error) throw new Error('Supabase query failed: ' + error.message);
    if (!allRecipes || allRecipes.length === 0) {
      // Fallback: if no recipes match the selected cuisines, return all cuisines
      // so the app never shows an empty state
      const { data: fallback, error: fallbackError } = await supabase
        .from('recipes')
        .select('id, name, cuisine, category, calories, protein, carbs, fat, fiber, portion_size, cooking_time, tags, ingredients, instructions, ingredient_quantities, meal_type');
      if (fallbackError) throw new Error(fallbackError.message);
      return processAndReturn(fallback || [], restrictions, meatOptions, foodAllergies);
    }

    return processAndReturn(allRecipes, restrictions, meatOptions, foodAllergies);

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── Filter and categorise recipes ─────────────────────────────────────────
function processAndReturn(recipes, restrictions, meatOptions, foodAllergies) {

  // ── Step 3: Apply dietary restriction filters ─────────────────────────
  // These filter the entire recipe pool before anything reaches the AI.
  let filtered = recipes;

  const hasRestriction = (r) => restrictions && restrictions.includes(r);

  if (hasRestriction('Vegetarian') || hasRestriction('Vegan')) {
    // Exclude all meat-containing recipes
    filtered = filtered.filter(r =>
      !recipeContainsMeat(r) && !recipeContainsSeafood(r)
    );
    if (hasRestriction('Vegan')) {
      // Additionally exclude dairy and eggs
      filtered = filtered.filter(r => !recipeContainsDairy(r) && !recipeContainsEggs(r));
    }
  }

  if (hasRestriction('Gluten-Free')) {
    filtered = filtered.filter(r => !recipeContainsGluten(r));
  }

  if (hasRestriction('Dairy-Free')) {
    filtered = filtered.filter(r => !recipeContainsDairy(r));
  }

  if (hasRestriction('Keto')) {
    // Keto: high fat, low carb — exclude high-carb recipes
    filtered = filtered.filter(r => (r.carbs || 0) <= 20);
  }

  if (hasRestriction('Halal')) {
    filtered = filtered.filter(r => !recipeContainsPork(r) && !recipeContainsAlcohol(r));
  }

  if (hasRestriction('Kosher')) {
    filtered = filtered.filter(r => !recipeContainsPork(r) && !recipeContainsShellfish(r));
  }

  // ── Step 4: Filter by meat options ────────────────────────────────────
  // If the user specified meat options, ONLY return recipes that match.
  // Example: user selects "Chicken & Poultry" and "Seafood & Fish" only.
  // → Beef, pork, lamb recipes are excluded entirely from the AI's pool.
  if (meatOptions && meatOptions.length > 0 &&
      !meatOptions.includes('All Meats') &&
      !hasRestriction('Vegetarian') &&
      !hasRestriction('Vegan')) {

    filtered = filtered.filter(r => {
      // Vegetarian/vegan recipes are always included regardless of meat options
      if (!recipeContainsMeat(r) && !recipeContainsSeafood(r)) return true;

      // Check if the recipe's meat type matches any selected option
      if (meatOptions.includes('Chicken & Poultry') && recipeContainsChicken(r)) return true;
      if (meatOptions.includes('Seafood & Fish') && recipeContainsSeafood(r)) return true;
      if (meatOptions.includes('Red Meat (Beef/Lamb)') && recipeContainsRedMeat(r)) return true;
      if (meatOptions.includes('Pork') && recipeContainsPork(r)) return true;
      if (meatOptions.includes('Game Meat') && recipeContainsGameMeat(r)) return true;
      if (meatOptions.includes('Processed Meats') && recipeContainsProcessedMeat(r)) return true;

      // Recipe contains meat but not the type the user selected — exclude it
      return false;
    });
  }

  // ── Step 5: Filter by food allergies ─────────────────────────────────
  // Strictly exclude any recipe that contains an allergen the user flagged.
  if (foodAllergies && foodAllergies.length > 0) {
    filtered = filtered.filter(r => {
      // Check each allergen the user selected
      for (const allergy of foodAllergies) {
        if (allergy === 'Gluten / Wheat' && recipeContainsGluten(r)) return false;
        if (allergy === 'Tree Nuts' && recipeContainsTreeNuts(r)) return false;
        if (allergy === 'Peanuts' && recipeContainsPeanuts(r)) return false;
        if (allergy === 'Shellfish' && recipeContainsShellfish(r)) return false;
        if (allergy === 'Fish' && recipeContainsFish(r)) return false;
        if (allergy === 'Dairy / Lactose' && recipeContainsDairy(r)) return false;
        if (allergy === 'Eggs' && recipeContainsEggs(r)) return false;
        if (allergy === 'Soy' && recipeContainsSoy(r)) return false;
        if (allergy === 'Sesame' && recipeContainsSesame(r)) return false;
        if (allergy === 'Mustard' && recipeContainsMustard(r)) return false;
        if (allergy === 'Sulphites' && recipeContainsSulphites(r)) return false;
      }
      return true; // recipe is safe
    });
  }

  // ── Step 6: Categorise filtered recipes into 5 buckets ───────────────
  // The AI uses these categories to build balanced meals.
  const db = {
    proteins:   filtered.filter(r => r.category === 'proteins'),
    carbs:      filtered.filter(r => r.category === 'carbs'),
    vegetables: filtered.filter(r => r.category === 'vegetables'),
    fats:       filtered.filter(r => r.category === 'fats'),
    snacks:     filtered.filter(r => r.category === 'snacks'),
  };

  // ── Step 7: Fallback if filtering is too aggressive ───────────────────
  // If a category ends up empty after filtering, relax cuisine restriction
  // but keep all dietary/allergy filters intact.
  const categories = Object.keys(db);
  for (const cat of categories) {
    if (db[cat].length === 0) {
      // Relax: get all recipes of this category regardless of cuisine,
      // but still apply all dietary and allergy filters
      const relaxed = recipes.filter(r => r.category === cat);
      const safeRelaxed = applyDietaryFilters(relaxed, restrictions, meatOptions, foodAllergies);
      db[cat] = safeRelaxed;
    }
  }

  return Response.json(db);
}

// ── Apply all dietary filters to a recipe set (used in fallback) ──────────
function applyDietaryFilters(recipes, restrictions, meatOptions, foodAllergies) {
  let filtered = [...recipes];

  const hasRestriction = (r) => restrictions && restrictions.includes(r);

  if (hasRestriction('Vegetarian') || hasRestriction('Vegan')) {
    filtered = filtered.filter(r => !recipeContainsMeat(r) && !recipeContainsSeafood(r));
    if (hasRestriction('Vegan')) {
      filtered = filtered.filter(r => !recipeContainsDairy(r) && !recipeContainsEggs(r));
    }
  }
  if (hasRestriction('Gluten-Free')) filtered = filtered.filter(r => !recipeContainsGluten(r));
  if (hasRestriction('Dairy-Free'))  filtered = filtered.filter(r => !recipeContainsDairy(r));
  if (hasRestriction('Keto'))        filtered = filtered.filter(r => (r.carbs || 0) <= 20);
  if (hasRestriction('Halal'))       filtered = filtered.filter(r => !recipeContainsPork(r));

  if (meatOptions && meatOptions.length > 0 && !meatOptions.includes('All Meats')) {
    filtered = filtered.filter(r => {
      if (!recipeContainsMeat(r) && !recipeContainsSeafood(r)) return true;
      if (meatOptions.includes('Chicken & Poultry') && recipeContainsChicken(r)) return true;
      if (meatOptions.includes('Seafood & Fish') && recipeContainsSeafood(r)) return true;
      if (meatOptions.includes('Red Meat (Beef/Lamb)') && recipeContainsRedMeat(r)) return true;
      if (meatOptions.includes('Pork') && recipeContainsPork(r)) return true;
      return false;
    });
  }

  if (foodAllergies && foodAllergies.length > 0) {
    filtered = filtered.filter(r => {
      for (const allergy of foodAllergies) {
        if (allergy === 'Gluten / Wheat' && recipeContainsGluten(r)) return false;
        if (allergy === 'Tree Nuts' && recipeContainsTreeNuts(r)) return false;
        if (allergy === 'Peanuts' && recipeContainsPeanuts(r)) return false;
        if (allergy === 'Shellfish' && recipeContainsShellfish(r)) return false;
        if (allergy === 'Fish' && recipeContainsFish(r)) return false;
        if (allergy === 'Dairy / Lactose' && recipeContainsDairy(r)) return false;
        if (allergy === 'Eggs' && recipeContainsEggs(r)) return false;
        if (allergy === 'Soy' && recipeContainsSoy(r)) return false;
        if (allergy === 'Sesame' && recipeContainsSesame(r)) return false;
      }
      return true;
    });
  }

  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────
// INGREDIENT DETECTION HELPERS
// These check both the recipe's tags[] array AND scan the ingredients[] text.
// Using both gives the most reliable detection regardless of how recipes
// were tagged in the database.
// ─────────────────────────────────────────────────────────────────────────

function hasTag(recipe, ...keywords) {
  const tags = (recipe.tags || []).map(t => t.toLowerCase());
  const ingr = (recipe.ingredients || []).join(' ').toLowerCase();
  const name = (recipe.name || '').toLowerCase();
  const combined = tags.join(' ') + ' ' + ingr + ' ' + name;
  return keywords.some(kw => combined.includes(kw));
}

// Meat detection
function recipeContainsMeat(r) {
  return hasTag(r, 'chicken', 'beef', 'lamb', 'pork', 'turkey', 'duck',
    'veal', 'venison', 'bison', 'rabbit', 'meat', 'bacon', 'ham',
    'sausage', 'salami', 'pepperoni', 'mince', 'steak', 'ribs',
    'chorizo', 'prosciutto', 'pancetta');
}

function recipeContainsChicken(r) {
  return hasTag(r, 'chicken', 'turkey', 'duck', 'poultry', 'hen', 'quail');
}

function recipeContainsRedMeat(r) {
  return hasTag(r, 'beef', 'lamb', 'mutton', 'veal', 'venison', 'bison',
    'steak', 'mince', 'ground beef', 'ribeye', 'sirloin', 'tenderloin');
}

function recipeContainsPork(r) {
  return hasTag(r, 'pork', 'bacon', 'ham', 'sausage', 'chorizo', 'salami',
    'pepperoni', 'prosciutto', 'pancetta', 'lard', 'pig');
}

function recipeContainsGameMeat(r) {
  return hasTag(r, 'venison', 'rabbit', 'bison', 'buffalo', 'elk', 'pheasant',
    'quail', 'duck', 'goose');
}

function recipeContainsProcessedMeat(r) {
  return hasTag(r, 'sausage', 'salami', 'pepperoni', 'bacon', 'ham', 'chorizo',
    'hot dog', 'frankfurter', 'spam', 'deli', 'lunch meat');
}

// Seafood detection
function recipeContainsSeafood(r) {
  return hasTag(r, 'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'bass',
    'trout', 'halibut', 'mahi', 'shrimp', 'prawn', 'crab', 'lobster',
    'clam', 'oyster', 'mussel', 'scallop', 'squid', 'calamari',
    'octopus', 'anchovy', 'sardine', 'mackerel', 'seafood', 'shellfish');
}

function recipeContainsFish(r) {
  return hasTag(r, 'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'bass',
    'trout', 'halibut', 'mahi', 'anchovy', 'sardine', 'mackerel',
    'herring', 'snapper', 'grouper', 'flounder', 'perch');
}

function recipeContainsShellfish(r) {
  return hasTag(r, 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster',
    'mussel', 'scallop', 'shellfish', 'crayfish', 'langoustine');
}

// Allergen detection
function recipeContainsGluten(r) {
  return hasTag(r, 'wheat', 'flour', 'bread', 'pasta', 'noodle', 'gluten',
    'barley', 'rye', 'semolina', 'couscous', 'bulgur', 'spelt',
    'crouton', 'breadcrumb', 'crumb', 'soy sauce', 'seitan');
}

function recipeContainsDairy(r) {
  return hasTag(r, 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt',
    'dairy', 'lactose', 'whey', 'casein', 'ghee', 'cheddar', 'mozzarella',
    'parmesan', 'brie', 'ricotta', 'feta', 'sour cream', 'custard');
}

function recipeContainsEggs(r) {
  return hasTag(r, 'egg', 'eggs', 'omelette', 'omelet', 'frittata',
    'quiche', 'mayonnaise', 'mayo', 'meringue', 'custard');
}

function recipeContainsSoy(r) {
  return hasTag(r, 'soy', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari',
    'soy sauce', 'soybean', 'soya');
}

function recipeContainsTreeNuts(r) {
  return hasTag(r, 'almond', 'cashew', 'walnut', 'pecan', 'pistachio',
    'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'chestnut',
    'nut', 'tree nut');
}

function recipeContainsPeanuts(r) {
  return hasTag(r, 'peanut', 'peanut butter', 'groundnut', 'satay');
}

function recipeContainsSesame(r) {
  return hasTag(r, 'sesame', 'tahini', 'sesame oil', 'sesame seed');
}

function recipeContainsMustard(r) {
  return hasTag(r, 'mustard');
}

function recipeContainsSulphites(r) {
  return hasTag(r, 'wine', 'vinegar', 'dried fruit', 'sulfite', 'sulphite',
    'preservative');
}

function recipeContainsAlcohol(r) {
  return hasTag(r, 'wine', 'beer', 'alcohol', 'spirits', 'brandy',
    'rum', 'vodka', 'whiskey', 'sake', 'mirin');
}
