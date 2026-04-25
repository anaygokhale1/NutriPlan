"use client";
import React, { useState } from 'react';
import { Utensils, Target, Activity, ChefHat, RefreshCw, Info, Calendar, BookOpen, X, Plus, Download, ShoppingCart } from 'lucide-react';

const NutritionPlanner = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userData, setUserData] = useState({
    goals: [], weight: '', height: '', age: '', sex: '',
    weightUnit: 'kg', heightUnit: 'cm',
    activities: [], customActivities: '',
    preferences: [], restrictions: [],
  });
  const [foodDatabase, setFoodDatabase] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [swapping, setSwapping] = useState(null);

  const goals = ['Weight Loss', 'Muscle Gain', 'Weight Gain', 'Maintenance', 'Athletic Performance'];
  const activityOptions = ['Gym (3-5x/week)', 'Running/Cardio', 'Sports (Team/Individual)', 'Walking/Light Activity', 'Sedentary'];
  const cuisinePreferences = ['American', 'Italian', 'Asian', 'Mexican', 'Indian', 'Mediterranean', 'Greek', 'Middle Eastern', 'Thai', 'Japanese', 'Chinese'];
  const dietaryRestrictions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher', 'Keto', 'Paleo', 'No Restrictions'];

  const updateUserData = (field, value) => setUserData(prev => ({ ...prev, [field]: value }));
  const toggleArrayField = (field, value) => setUserData(prev => ({
    ...prev,
    [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value]
  }));

  // Convert inputs to metric for Mifflin-St Jeor BMR calculation
  const getMetricValues = () => {
    const rawWeight = parseFloat(userData.weight) || 0;
    const rawHeight = parseFloat(userData.height) || 0;
    const heightFt  = parseFloat(userData.heightFt) || 0;
    const heightIn  = parseFloat(userData.heightIn) || 0;

    // Weight: lbs → kg
    const weightKg = userData.weightUnit === 'lbs'
      ? rawWeight * 0.453592
      : rawWeight;

    // Height: ft+in → cm
    const heightCm = userData.heightUnit === 'ft'
      ? (heightFt * 30.48) + (heightIn * 2.54)
      : rawHeight;

    return { weightKg, heightCm };
  };

  const calculateMacros = () => {
    const { weightKg, heightCm } = getMetricValues();
    const age = parseFloat(userData.age) || 25;

    // Mifflin-St Jeor BMR (uses actual age)
    const bmr = userData.sex === 'Male'
      ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
      : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;

    // FIX 4: Score EVERY activity independently and take the highest multiplier
    const activityText = [
      ...userData.activities,
      ...(userData.customActivities ? [userData.customActivities] : [])
    ].join(' ').toLowerCase();
    const activityScores = [
      { keywords: ['sport','team'],                                    mult: 1.65 },
      { keywords: ['run','cardio'],                                    mult: 1.60 },
      { keywords: ['gym','weight','lift'],                             mult: 1.55 },
      { keywords: ['swim','yoga','bike','cycl','pilates','martial'],   mult: 1.50 },
      { keywords: ['walk','light','hike'],                             mult: 1.375 },
      { keywords: ['sedentary','desk','inactive'],                     mult: 1.20 },
    ];
    const mult = activityScores.reduce((best, { keywords, mult: m }) => {
      return keywords.some(kw => activityText.includes(kw)) ? Math.max(best, m) : best;
    }, 1.2);

    const hasGoal = (g) => userData.goals.includes(g);
    let calories = bmr * mult;
    if (hasGoal('Weight Loss')) calories -= 500;
    if (hasGoal('Muscle Gain') || hasGoal('Weight Gain')) calories += 300;
    // FIX 6: Never go below clinical minimum — 1200 kcal for females, 1500 for males
    const calorieFloor = userData.sex === 'Female' ? 1200 : 1500;
    calories = Math.max(calories, calorieFloor);

    // FIX 7: Blended macro split when conflicting goals are combined
    let protein, carbs, fat;
    if (hasGoal('Muscle Gain') && hasGoal('Weight Loss')) {
      // Body recomposition: high protein, moderate fat to preserve muscle while losing fat
      protein = weightKg * 2.4; fat = weightKg * 0.8;
    } else if (hasGoal('Muscle Gain') || hasGoal('Athletic Performance')) {
      protein = weightKg * 2.0; fat = weightKg * 1.0;
    } else if (hasGoal('Weight Loss')) {
      protein = weightKg * 2.2; fat = weightKg * 0.8;
    } else if (hasGoal('Weight Gain')) {
      protein = weightKg * 1.8; fat = weightKg * 1.2;
    } else {
      protein = weightKg * 1.6; fat = weightKg * 1.0;
    }
    carbs = (calories - (protein * 4) - (fat * 9)) / 4;
    // FIX 8: Detect macro conflict — if protein+fat already exceeds calories, carbs go negative
    const carbsNegative = carbs < 0;
    // If carbs negative, trim fat down until carbs reach minimum 50g (a safe floor)
    if (carbsNegative) {
      const minCarbs = 50;
      fat = (calories - (protein * 4) - (minCarbs * 4)) / 9;
      fat = Math.max(fat, weightKg * 0.5); // never below 0.5g/kg
      carbs = (calories - (protein * 4) - (fat * 9)) / 4;
    }
    return {
      calories:      Math.round(calories),
      protein:       Math.round(protein),
      carbs:         Math.round(Math.max(0, carbs)),
      fat:           Math.round(fat),
      macroConflict: carbsNegative,
    };
  };

  // ── Calls /api/chat (Next.js route that holds the Anthropic API key) ──
  const callAPI = async (prompt, maxTokens) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const text = data.content?.find(c => c.type === 'text')?.text || '';
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response. Got: ' + text.slice(0, 200));
    return JSON.parse(match[0]);
  };

  // ── Fetches real recipes from Supabase via /api/recipes ──
  const fetchRecipesFromDB = async () => {
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuisines:     userData.preferences,
        restrictions: userData.restrictions,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch recipes: ${errText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const generateWeeklyPlan = async () => {
    setLoading(true);
    try {
      // ── STEP 1: Fetch real recipes from Supabase ──
      setLoadingMsg('Step 1 of 3 — Fetching recipes...');
      setLoadingProgress(5);
      const database = await fetchRecipesFromDB();
      setLoadingProgress(30);
      setLoadingMsg('Step 2 of 3 — AI is building your plan...');

      // Validate every category exists and has items
      const requiredKeys = ['proteins', 'carbs', 'vegetables', 'fats', 'snacks'];
      for (const key of requiredKeys) {
        if (!database[key] || !Array.isArray(database[key]) || database[key].length === 0) {
          throw new Error(`No ${key} found for your selected cuisines/filters. Try selecting more cuisines.`);
        }
      }

      setFoodDatabase(database);

      const allFoods = [
        ...database.proteins,
        ...database.carbs,
        ...database.vegetables,
        ...database.fats,
        ...database.snacks,
      ];

      if (allFoods.length < 5) {
        throw new Error('Not enough recipes found. Try selecting more cuisines.');
      }

      // ── STEP 2: Ask AI to build a 7-day plan using real recipes ──
      const { calories, protein, carbs, fat } = calculateMacros();

      // Shuffle each category independently so every generation sees a fresh
      // random subset — this means plans vary across sessions even with the
      // same database. Math.random() - 0.5 produces a random sort order.
      const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

      // Cap each category at a sensible ceiling.
      // The AI only fills ~56 food slots across 7 days so sending 800 recipes
      // wastes tokens — it has to read every entry before writing a single word.
      // 80 total recipes ≈ 2,200 tokens vs 800 recipes ≈ 11,000 tokens (5× faster).
      const sampledFoods = [
        ...shuffle(database.proteins).slice(0, 25),   // picks 25 random proteins
        ...shuffle(database.carbs).slice(0, 15),       // picks 15 random carbs
        ...shuffle(database.vegetables).slice(0, 15),  // picks 15 random vegetables
        ...shuffle(database.fats).slice(0, 10),        // picks 10 random fats
        ...shuffle(database.snacks).slice(0, 15),      // picks 15 random snacks
      ];                                               // = 80 recipes total

      // Build the compact string the AI reads — id + name + key macros only.
      // We deliberately omit cooking_time, instructions, ingredients etc.
      // because the AI doesn't need them to pick meals — less text = faster response.
      const foodList = sampledFoods
        .map(f => `${f.id}:${f.name}(${f.calories}cal,P${f.protein}g,C${f.carbs}g,F${f.fat}g)`)
        .join(', ');

      const planPrompt = `You are a nutritionist. Create a 7-day meal plan.
Goals: ${userData.goals.join(', ')}. Daily targets: ${calories}kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat.
Available foods (id:name:macros): ${foodList}
Return ONLY raw JSON (no markdown fences). Totals are NOT required — omit all totals fields:
{"days":[{"dayNumber":1,"dayName":"Monday","meals":{"breakfast":{"items":[{"id":"exact-id-from-list","multiplier":1.0,"reasoning":"8 words max"}]},"lunch":{"items":[]},"snack":{"items":[]},"dinner":{"items":[]}}}]}
Rules: 7 days Monday-Sunday, vary meals daily, 2-3 items per meal, reasoning max 8 words. Use ONLY exact id values from the list above.`;

      setLoadingProgress(70);
      setLoadingMsg('Step 2 of 3 — AI is building your plan...');
      const planData = await callAPI(planPrompt, 5500); // items-only JSON needs ~4100 tokens + 1400 buffer
      setLoadingProgress(90);
      setLoadingMsg('Step 3 of 3 — Calculating your macros...');

      if (!planData.days || !Array.isArray(planData.days) || planData.days.length === 0) {
        throw new Error('Meal plan generation failed. Please try again.');
      }

      // FIX 2: Recompute ALL totals from real recipe data — never trust AI arithmetic
      const calcTotals = (items) => items.reduce((acc, item) => {
        const food = allFoods.find(f => f.id === item.id);
        if (!food) return acc;
        const m = item.multiplier || 1;
        return {
          calories: acc.calories + food.calories * m,
          protein:  acc.protein  + food.protein  * m,
          carbs:    acc.carbs    + food.carbs     * m,
          fat:      acc.fat      + food.fat       * m,
          fiber:    acc.fiber    + (food.fiber || 0) * m,
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      const verifiedPlan = { ...planData };
      verifiedPlan.days = planData.days.map(day => {
        const verifiedMeals = {};
        ['breakfast', 'lunch', 'snack', 'dinner'].forEach(mealType => {
          const meal = day.meals[mealType] || { items: [] };
          verifiedMeals[mealType] = { items: meal.items, totals: calcTotals(meal.items) };
        });
        const dailyTotals = ['breakfast', 'lunch', 'snack', 'dinner'].reduce((acc, mt) => ({
          calories: acc.calories + verifiedMeals[mt].totals.calories,
          protein:  acc.protein  + verifiedMeals[mt].totals.protein,
          carbs:    acc.carbs    + verifiedMeals[mt].totals.carbs,
          fat:      acc.fat      + verifiedMeals[mt].totals.fat,
          fiber:    acc.fiber    + (verifiedMeals[mt].totals.fiber || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
        return { ...day, meals: verifiedMeals, dailyTotals };
      });
      verifiedPlan.weeklyTotals = verifiedPlan.days.reduce((acc, d) => ({
        calories: acc.calories + d.dailyTotals.calories,
        protein:  acc.protein  + d.dailyTotals.protein,
        carbs:    acc.carbs    + d.dailyTotals.carbs,
        fat:      acc.fat      + d.dailyTotals.fat,
        fiber:    acc.fiber    + (d.dailyTotals.fiber || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      setLoadingProgress(100);
      setLoadingMsg('Done!');
      setWeeklyPlan(verifiedPlan);
      setStep(4);

    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
      setLoadingProgress(0);
    }
  };

  const swapFood = async (dayIndex, mealType, currentItemId) => {
    setSwapping({ dayIndex, mealType, itemId: currentItemId });
    try {
      const allFoods = [
        ...(foodDatabase.proteins || []),
        ...(foodDatabase.carbs || []),
        ...(foodDatabase.vegetables || []),
        ...(foodDatabase.fats || []),
        ...(foodDatabase.snacks || []),
      ];

      // Find current food and its category
      const currentFood = allFoods.find(f => f.id === currentItemId);
      if (!currentFood) throw new Error('Could not find food item to swap.');
      const currentCategory = currentFood.category;

      // Get IDs already in this meal to avoid duplicates
      const currentMealItemIds = weeklyPlan.days[dayIndex].meals[mealType].items
        .map(item => item.id)
        .filter(id => id !== currentItemId);

      // Filter to SAME category only, excluding current item and already-used items
      const sameCategoryFoods = allFoods.filter(f =>
        f.category === currentCategory &&
        f.id !== currentItemId &&
        !currentMealItemIds.includes(f.id)
      );

      // Fallback to all foods if no same-category alternatives exist
      const candidateFoods = sameCategoryFoods.length > 0
        ? sameCategoryFoods
        : allFoods.filter(f => f.id !== currentItemId && !currentMealItemIds.includes(f.id));

      if (candidateFoods.length === 0) {
        throw new Error('No alternative foods available to swap with.');
      }

      const foodList = candidateFoods
        .map(f => `${f.id}:${f.name}(${f.calories}cal,P${f.protein}g,C${f.carbs}g,F${f.fat}g)`)
        .join(', ');

      const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Evening Snack', dinner: 'Dinner' };

      const prompt = `You are a nutritionist. Swap a ${currentCategory} item for ${mealLabels[mealType]}.
Current item: ${currentFood.name} (${currentFood.calories}cal, P${currentFood.protein}g, C${currentFood.carbs}g, F${currentFood.fat}g).
User goals: ${userData.goals.join(', ')}. Restrictions: ${userData.restrictions.join(', ')}.
Pick the BEST alternative from this same-category (${currentCategory}) list:
${foodList}
Choose the closest macros to the current item, best suited for ${mealLabels[mealType]}.
Return ONLY raw JSON: {"replacementId":"exact-id-from-list","multiplier":1.0,"reasoning":"brief reason max 15 words"}`;

      const swapData = await callAPI(prompt, 500);

      // Validate the returned ID exists in our food list
      const replacementFood = allFoods.find(f => f.id === swapData.replacementId);
      if (!replacementFood) throw new Error('Swap returned an invalid food ID. Please try again.');

      setWeeklyPlan(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const mealItems = updated.days[dayIndex].meals[mealType].items;
        const idx = mealItems.findIndex(item => item.id === currentItemId);
        if (idx >= 0) {
          mealItems[idx] = {
            id: swapData.replacementId,
            multiplier: swapData.multiplier || 1,
            reasoning: swapData.reasoning,
          };
          // Recalculate meal totals
          updated.days[dayIndex].meals[mealType].totals = mealItems.reduce((acc, item) => {
            const food = allFoods.find(f => f.id === item.id);
            if (!food) return acc;
            const m = item.multiplier || 1;
            return {
              calories: acc.calories + food.calories * m,
              protein:  acc.protein  + food.protein  * m,
              carbs:    acc.carbs    + food.carbs     * m,
              fat:      acc.fat      + food.fat       * m,
              fiber:    acc.fiber    + (food.fiber || 0) * m,
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
          // Recalculate daily totals
          updated.days[dayIndex].dailyTotals = ['breakfast', 'lunch', 'snack', 'dinner'].reduce((acc, meal) => {
            const t = updated.days[dayIndex].meals[meal].totals;
            return {
              calories: acc.calories + t.calories,
              protein:  acc.protein  + t.protein,
              carbs:    acc.carbs    + t.carbs,
              fat:      acc.fat      + t.fat,
              fiber:    acc.fiber    + (t.fiber || 0),
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
          // FIX 1: Recalculate weeklyTotals from all 7 days so summary strip stays accurate
          updated.weeklyTotals = updated.days.reduce((acc, d) => ({
            calories: acc.calories + d.dailyTotals.calories,
            protein:  acc.protein  + d.dailyTotals.protein,
            carbs:    acc.carbs    + d.dailyTotals.carbs,
            fat:      acc.fat      + d.dailyTotals.fat,
            fiber:    acc.fiber    + (d.dailyTotals.fiber || 0),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
        }
        return updated;
      });

    } catch (error) {
      alert('Swap failed: ' + error.message);
    } finally {
      setSwapping(null);
    }
  };

  const openRecipe = (foodId) => {
    const allFoods = [
      ...(foodDatabase.proteins || []),
      ...(foodDatabase.carbs || []),
      ...(foodDatabase.vegetables || []),
      ...(foodDatabase.fats || []),
      ...(foodDatabase.snacks || []),
    ];
    setSelectedRecipe(allFoods.find(f => f.id === foodId));
  };

  const renderStep1 = () => (
    <div className="form-section">
      <h2>Tell Us About Your Goals</h2>
      <p className="subtitle">Let's personalize your nutrition journey</p>
      <div className="input-group">
        <label><Target size={16} /> Primary Goals <span style={{fontSize:'0.75rem',color:'#888',fontWeight:400}}>(select all that apply)</span></label>
        <div className="button-grid">
          {goals.map(goal => (
            <button key={goal} className={`option-btn ${userData.goals.includes(goal) ? 'active' : ''}`} onClick={() => toggleArrayField('goals', goal)}>{goal}</button>
          ))}
        </div>
      </div>
      {/* Unit toggle */}
      <div className="unit-toggle-row">
        <div className="unit-toggle-group">
          <span className="unit-toggle-label">Weight</span>
          <div className="unit-toggle">
            <button className={`unit-btn ${userData.weightUnit === 'kg' ? 'active' : ''}`} onClick={() => updateUserData('weightUnit', 'kg')}>kg</button>
            <button className={`unit-btn ${userData.weightUnit === 'lbs' ? 'active' : ''}`} onClick={() => updateUserData('weightUnit', 'lbs')}>lbs</button>
          </div>
        </div>
        <div className="unit-toggle-group">
          <span className="unit-toggle-label">Height</span>
          <div className="unit-toggle">
            <button className={`unit-btn ${userData.heightUnit === 'cm' ? 'active' : ''}`} onClick={() => updateUserData('heightUnit', 'cm')}>cm</button>
            <button className={`unit-btn ${userData.heightUnit === 'ft' ? 'active' : ''}`} onClick={() => updateUserData('heightUnit', 'ft')}>ft/in</button>
          </div>
        </div>
      </div>

      <div className="input-row">
        {/* Weight input */}
        <div className="input-group">
          <label>Weight ({userData.weightUnit})</label>
          <input
            type="number" min="1"
            value={userData.weight}
            onChange={(e) => updateUserData('weight', e.target.value)}
            placeholder={userData.weightUnit === 'kg' ? '70' : '155'}
          />
        </div>

        {/* Height input — single field for cm, two fields for ft+in */}
        {userData.heightUnit === 'cm' ? (
          <div className="input-group">
            <label>Height (cm)</label>
            <input
              type="number" min="1"
              value={userData.height}
              onChange={(e) => updateUserData('height', e.target.value)}
              placeholder="175"
            />
          </div>
        ) : (
          <div className="input-group">
            <label>Height (ft / in)</label>
            <div className="height-ft-row">
              <input
                type="number" min="0" max="8"
                value={userData.heightFt || ''}
                onChange={(e) => updateUserData('heightFt', e.target.value)}
                placeholder="5"
              />
              <span className="height-sep">ft</span>
              <input
                type="number" min="0" max="11"
                value={userData.heightIn || ''}
                onChange={(e) => updateUserData('heightIn', e.target.value)}
                placeholder="9"
              />
              <span className="height-sep">in</span>
            </div>
          </div>
        )}

        {/* Age */}
        <div className="input-group">
          <label>Age (years)</label>
          <input
            type="number" min="10" max="100"
            value={userData.age}
            onChange={(e) => updateUserData('age', e.target.value)}
            placeholder="25"
          />
        </div>

        {/* Sex */}
        <div className="input-group">
          <label>Sex</label>
          <select value={userData.sex} onChange={(e) => updateUserData('sex', e.target.value)}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>
      <div className="input-group">
        <label><Activity size={16} /> Activity Level</label>
        <div className="button-grid">
          {activityOptions.map(activity => (
            <button key={activity} className={`option-btn ${userData.activities.includes(activity) ? 'active' : ''}`} onClick={() => toggleArrayField('activities', activity)}>{activity}</button>
          ))}
        </div>
      </div>
      <div className="input-group">
        <label><Plus size={16} /> Custom Activities (Optional)</label>
        <input type="text" value={userData.customActivities} onChange={(e) => updateUserData('customActivities', e.target.value)} placeholder="E.g., Swimming 3x/week, Yoga daily" />
      </div>
      <div className="btn-right">
        <button className="next-btn" onClick={() => setStep(2)} disabled={
          userData.goals.length === 0 || !userData.weight || !userData.age || !userData.sex || userData.activities.length === 0 ||
          (userData.heightUnit === 'cm' ? !userData.height : (!userData.heightFt && !userData.heightIn)) ||
          userData.goals.length === 0
        }>
          Continue to Preferences →
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-section">
      <h2>Food Preferences</h2>
      <p className="subtitle">Help us customize your meal plan</p>
      <div className="input-group">
        <label><Utensils size={16} /> Cuisine Preferences</label>
        <div className="button-grid">
          {cuisinePreferences.map(pref => (
            <button key={pref} className={`option-btn ${userData.preferences.includes(pref) ? 'active' : ''}`} onClick={() => toggleArrayField('preferences', pref)}>{pref}</button>
          ))}
        </div>
      </div>
      <div className="input-group">
        <label><ChefHat size={16} /> Dietary Restrictions</label>
        <div className="button-grid">
          {dietaryRestrictions.map(r => (
            <button key={r} className={`option-btn ${userData.restrictions.includes(r) ? 'active' : ''}`} onClick={() => toggleArrayField('restrictions', r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="button-row">
        <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
        <button className="next-btn" onClick={() => setStep(3)} disabled={userData.preferences.length === 0 || userData.restrictions.length === 0}>
          Review & Generate →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const macros = calculateMacros();
    const allActivities = [...userData.activities, ...(userData.customActivities.trim() ? [userData.customActivities] : [])];
    return (
      <div className="form-section">
        <h2>Review Your Profile</h2>
        <p className="subtitle">Confirm your details before generating your personalized weekly meal plan</p>
        <div className="review-card">
          <div className="review-row">
            <div className="review-block">
              <div className="review-block-title">Goal</div>
              <div className="review-block-value">{userData.goals.join(', ')}</div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Weight</div>
              <div className="review-block-value">{userData.weight} {userData.weightUnit}</div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Height</div>
              <div className="review-block-value">
                {userData.heightUnit === 'cm'
                  ? `${userData.height} cm`
                  : `${userData.heightFt || 0}ft ${userData.heightIn || 0}in`}
              </div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Age</div>
              <div className="review-block-value">{userData.age} yrs</div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Sex</div>
              <div className="review-block-value">{userData.sex}</div>
            </div>
          </div>
          <div className="review-section">
            <div className="review-label">Activity</div>
            <div className="tag-list">{allActivities.map(act => <span key={act} className="tag">{act}</span>)}</div>
          </div>
          <div className="review-section">
            <div className="review-label">Cuisines</div>
            <div className="tag-list">{userData.preferences.map(p => <span key={p} className="tag">{p}</span>)}</div>
          </div>
          <div className="review-section">
            <div className="review-label">Dietary Restrictions</div>
            <div className="tag-list">
              {userData.restrictions.map(r => <span key={r} className="tag">{r}</span>)}
            </div>
          </div>
          <div className="macro-row">
            {[['Calories', macros.calories, ''], ['Protein', macros.protein, 'g'], ['Carbs', macros.carbs, 'g'], ['Fat', macros.fat, 'g']].map(([label, val, unit]) => (
              <div key={label} className="macro-card">
                <div className="macro-value">{val}{unit}</div>
                <div className="macro-label">{label}</div>
              </div>
            ))}
          </div>
          {macros.macroConflict && (
            <div className="macro-warning">
              ⚠️ Your combined goals created a macro conflict — fat has been adjusted to ensure a minimum of 50g carbs. Consider selecting fewer conflicting goals.
            </div>
          )}
        </div>
        {loading && (
          <div className="progress-wrap">
            <div className="progress-header">
              <span className="progress-msg">{loadingMsg}</span>
              <span className="progress-pct">{loadingProgress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{width: loadingProgress + '%'}} />
            </div>
            <div className="progress-steps">
              <span className={loadingProgress >= 30 ? 'ps-done' : loadingProgress >= 5 ? 'ps-active' : 'ps-pending'}>{loadingProgress >= 30 ? '✓' : '⏳'} Recipes fetched</span>
              <span className={loadingProgress >= 90 ? 'ps-done' : loadingProgress >= 30 ? 'ps-active' : 'ps-pending'}>{loadingProgress >= 90 ? '✓' : loadingProgress >= 30 ? '⏳' : '○'} AI building plan</span>
              <span className={loadingProgress >= 100 ? 'ps-done' : loadingProgress >= 90 ? 'ps-active' : 'ps-pending'}>{loadingProgress >= 100 ? '✓' : loadingProgress >= 90 ? '⏳' : '○'} Calculating macros</span>
            </div>
          </div>
        )}
        <div className="button-row">
          <button className="back-btn" onClick={() => setStep(2)} disabled={loading}>← Back</button>
          <button className="generate-btn" onClick={generateWeeklyPlan} disabled={loading}>
            <Calendar size={16} />
            {loading ? 'Generating...' : 'Generate Weekly Meal Plan'}
          </button>
        </div>
      </div>
    );
  };

  const WeeklyPlanView = () => {
    const [selectedDay, setSelectedDay] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'shopping'
    if (!weeklyPlan || !foodDatabase) return null;
    const allFoods = [
      ...(foodDatabase.proteins || []),
      ...(foodDatabase.carbs || []),
      ...(foodDatabase.vegetables || []),
      ...(foodDatabase.fats || []),
      ...(foodDatabase.snacks || []),
    ];
    const currentDay = weeklyPlan.days[selectedDay];
    const mealNames = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Evening Snack', dinner: 'Dinner' };
    const mealIcons = { breakfast: '🌅', lunch: '☀️', snack: '🍎', dinner: '🌙' };

    // ── Build shopping list from all 7 days ──
    const buildShoppingList = () => {
      const ingredientMap = {};
      weeklyPlan.days.forEach(day => {
        Object.values(day.meals).forEach(meal => {
          meal.items.forEach(item => {
            const food = allFoods.find(f => f.id === item.id);
            if (!food || !food.ingredients) return;
            food.ingredients.forEach(ing => {
              const key = ing.toLowerCase().trim();
              if (!ingredientMap[key]) {
                ingredientMap[key] = { name: ing, recipes: new Set(), category: food.category };
              }
              ingredientMap[key].recipes.add(food.name);
            });
          });
        });
      });
      // Sort by category then alphabetically
      const categoryOrder = { proteins: 0, carbs: 1, vegetables: 2, fats: 3, snacks: 4 };
      return Object.values(ingredientMap).sort((a, b) => {
        const catDiff = (categoryOrder[a.category] || 5) - (categoryOrder[b.category] || 5);
        return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
      });
    };

    const categoryLabels = { proteins: '🥩 Proteins & Legumes', carbs: '🌾 Grains & Carbs', vegetables: '🥦 Vegetables & Herbs', fats: '🥑 Fats & Oils', snacks: '🍎 Snacks & Others' };

    // ── Export helpers using SheetJS (loaded dynamically) ──
    const loadXLSX = () => new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      s.onerror = reject;
      document.head.appendChild(s);
    });

    const exportMealPlan = async () => {
      const XLSX = await loadXLSX();
      const wb = XLSX.utils.book_new();

      // ── Sheet 1: Weekly Overview ──
      const overviewRows = [
        ['NutriPlan — 7-Day Meal Plan'],
        ['Goals', userData.goals.join(', ')],
        ['Daily Calorie Target', calculateMacros().calories + ' kcal',
         'Daily Protein Target', calculateMacros().protein + 'g'],
        [],
        ['Day', 'Total Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
      ];
      weeklyPlan.days.forEach(day => {
        overviewRows.push([
          day.dayName,
          Math.round(day.dailyTotals.calories),
          Math.round(day.dailyTotals.protein),
          Math.round(day.dailyTotals.carbs),
          Math.round(day.dailyTotals.fat),
        ]);
      });
      overviewRows.push([]);
      overviewRows.push([
        'WEEKLY AVERAGE',
        Math.round(weeklyPlan.weeklyTotals.calories / 7),
        Math.round(weeklyPlan.weeklyTotals.protein / 7),
        Math.round(weeklyPlan.weeklyTotals.carbs / 7),
        Math.round(weeklyPlan.weeklyTotals.fat / 7),
      ]);
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
      wsOverview['!cols'] = [22,16,14,12,10,12].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Weekly Overview');

      // ── Sheet 2+: One sheet per day ──
      const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];
      const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Evening Snack', dinner: 'Dinner' };
      weeklyPlan.days.forEach(day => {
        const rows = [
          [day.dayName + ' Meal Plan'],
          ['Meal', 'Food Item', 'Portion', 'Cuisine', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Why This Food'],
        ];
        mealOrder.forEach(mealType => {
          const meal = day.meals[mealType];
          if (!meal) return;
          meal.items.forEach((item, i) => {
            const food = allFoods.find(f => f.id === item.id);
            if (!food) return;
            const m = item.multiplier || 1;
            rows.push([
              i === 0 ? mealLabels[mealType] : '',
              food.name,
              food.portion_size || '',
              food.cuisine || '',
              Math.round(food.calories * m),
              Math.round(food.protein * m),
              Math.round(food.carbs * m),
              Math.round(food.fat * m),
              item.reasoning || '',
            ]);
          });
          // Meal subtotal row
          rows.push([
            '',
            'Subtotal — ' + mealLabels[mealType],
            '', '',
            Math.round(meal.totals.calories),
            Math.round(meal.totals.protein),
            Math.round(meal.totals.carbs),
            Math.round(meal.totals.fat),
            '',
          ]);
          rows.push([]);
        });
        // Daily total
        rows.push([
          'DAILY TOTAL', '', '', '',
          Math.round(day.dailyTotals.calories),
          Math.round(day.dailyTotals.protein),
          Math.round(day.dailyTotals.carbs),
          Math.round(day.dailyTotals.fat),
          '',
        ]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [14,22,10,12,10,12,10,8,30].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, day.dayName.slice(0, 3));
      });

      XLSX.writeFile(wb, 'NutriPlan_MealPlan.xlsx');
    };

    const exportShoppingList = async () => {
      const XLSX = await loadXLSX();
      const list = buildShoppingList();
      const wb = XLSX.utils.book_new();

      const rows = [
        ['NutriPlan — Weekly Shopping List'],
        ['Generated for your 7-day meal plan', '', '', userData.goals.join(' + ') + ' goal'],
        [],
        ['✓', 'Ingredient', 'Category', 'Used In Recipes'],
      ];

      let lastCat = null;
      list.forEach(item => {
        const cat = categoryLabels[item.category] || item.category;
        if (cat !== lastCat) {
          rows.push([]);
          rows.push(['', cat.toUpperCase(), '', '']);
          lastCat = cat;
        }
        rows.push([
          '☐',
          item.name,
          cat,
          [...item.recipes].join(', '),
        ]);
      });

      rows.push([]);
      rows.push(['', 'Total unique ingredients: ' + list.length]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [4, 28, 22, 50].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, 'Shopping List');
      XLSX.writeFile(wb, 'NutriPlan_ShoppingList.xlsx');
    };

    const ShoppingListView = () => {
      const list = buildShoppingList();
      const grouped = {};
      list.forEach(item => {
        const cat = item.category || 'snacks';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });
      const [checked, setChecked] = useState({});
      const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
      const totalItems = list.length;
      const checkedCount = Object.values(checked).filter(Boolean).length;

      return (
        <div className="shopping-view">
          <div className="shopping-header">
            <div>
              <h3>Weekly Shopping List</h3>
              <p className="shopping-sub">All ingredients needed for your 7-day meal plan</p>
            </div>
            <div className="shopping-header-right">
              <div className="shopping-progress">
                <span className="shopping-count">{checkedCount}/{totalItems}</span>
                <span className="shopping-count-label">collected</span>
              </div>
              <button className="export-btn" onClick={exportShoppingList}>
                <Download size={14} /> Export Excel
              </button>
            </div>
          </div>
          <div className="shopping-progress-bar">
            <div className="shopping-bar-fill" style={{width: totalItems > 0 ? (checkedCount/totalItems*100) + '%' : '0%'}} />
          </div>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="shopping-group">
              <div className="shopping-group-title">{categoryLabels[cat] || cat}</div>
              {items.map((item, i) => {
                const key = item.name.toLowerCase();
                const done = !!checked[key];
                return (
                  <div key={i} className={`shopping-item ${done ? 'checked' : ''}`} onClick={() => toggle(key)}>
                    <div className={`shopping-checkbox ${done ? 'checked' : ''}`}>
                      {done && <span>✓</span>}
                    </div>
                    <div className="shopping-item-info">
                      <span className="shopping-item-name">{item.name}</span>
                      <span className="shopping-item-recipes">Used in: {[...item.recipes].slice(0, 3).join(', ')}{item.recipes.size > 3 ? ` +${item.recipes.size - 3} more` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="plan-view">
        <div className="plan-header">
          <h2>Your 7-Day Meal Plan</h2>
          <p className="subtitle">Select a day below to view its meals</p>
          <div className="summary-strip">
            {[
              ['Avg Calories', Math.round(weeklyPlan.weeklyTotals.calories / 7), ''],
              ['Avg Protein',  Math.round(weeklyPlan.weeklyTotals.protein / 7), 'g'],
              ['Avg Carbs',    Math.round(weeklyPlan.weeklyTotals.carbs / 7), 'g'],
              ['Avg Fat',      Math.round(weeklyPlan.weeklyTotals.fat / 7), 'g'],
              ['Avg Fiber',    Math.round((weeklyPlan.weeklyTotals.fiber || 0) / 7), 'g'],
            ].map(([label, val, unit]) => (
              <div key={label} className="summary-pill">
                <span className="summary-val">{val}{unit}</span>
                <span className="summary-lbl">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="view-tabs">
          <button className={`view-tab ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>
            📅 Meal Plan
          </button>
          <button className={`view-tab ${activeTab === 'shopping' ? 'active' : ''}`} onClick={() => setActiveTab('shopping')}>
            🛒 Shopping List
          </button>
        </div>

        {activeTab === 'shopping' ? <ShoppingListView /> : (<>

        <div className="day-tabs">
          {weeklyPlan.days.map((day, i) => (
            <button key={i} className={`day-tab ${selectedDay === i ? 'active' : ''}`} onClick={() => setSelectedDay(i)}>
              <span className="day-tab-name">{day.dayName.slice(0, 3)}</span>
              <span className="day-tab-cal">{Math.round(day.dailyTotals.calories)} cal</span>
            </button>
          ))}
        </div>

        <div className="day-panel">
          <div className="day-panel-header">
            <h3>{currentDay.dayName}</h3>
            <div className="day-macro-badges">
              <span className="badge">{Math.round(currentDay.dailyTotals.calories)} kcal</span>
              <span className="badge">P {Math.round(currentDay.dailyTotals.protein)}g</span>
              <span className="badge">C {Math.round(currentDay.dailyTotals.carbs)}g</span>
              <span className="badge">F {Math.round(currentDay.dailyTotals.fat)}g</span>
              <span className="badge badge-fiber">🌿 {Math.round(currentDay.dailyTotals.fiber || 0)}g fiber</span>
            </div>
          </div>

          <div className="meals-grid">
            {Object.entries(currentDay.meals).map(([mealType, mealData]) => (
              <div key={mealType} className="meal-card">
                <div className="meal-card-header">
                  <div className="meal-title">
                    <span className="meal-icon">{mealIcons[mealType]}</span>
                    <span>{mealNames[mealType]}</span>
                  </div>
                  <div className="meal-totals-row">
                    <span>{Math.round(mealData.totals.calories)} cal</span>
                    <span>·</span>
                    <span>P{Math.round(mealData.totals.protein)}g</span>
                    <span>·</span>
                    <span>C{Math.round(mealData.totals.carbs)}g</span>
                    <span>·</span>
                    <span>F{Math.round(mealData.totals.fat)}g</span>
                  </div>
                </div>
                <div className="meal-items">
                  {mealData.items.map((item, idx) => {
                    const food = allFoods.find(f => f.id === item.id);
                    if (!food) return (
                      <div key={idx} className="food-row">
                        <div className="food-details">
                          <div className="food-name" style={{color:'#999'}}>Item not found ({item.id})</div>
                        </div>
                      </div>
                    );
                    const m = item.multiplier || 1;
                    const isSwapping = swapping?.dayIndex === selectedDay && swapping?.mealType === mealType && swapping?.itemId === item.id;
                    return (
                      <div key={idx} className="food-row">
                        <div className="food-details">
                          <div className="food-top-row">
                            <span className="food-name">{food.name}</span>
                            <div className="food-actions">
                              <button className="btn-recipe" onClick={() => openRecipe(food.id)}><BookOpen size={13} /> Recipe</button>
                              <button className="btn-swap" onClick={() => swapFood(selectedDay, mealType, item.id)} disabled={isSwapping}>
                                <RefreshCw size={13} className={isSwapping ? 'spin' : ''} /> Swap
                              </button>
                            </div>
                          </div>
                          <div className="food-portion">🍽 {food.portion_size}</div>
                          <div className="food-meta">{food.cuisine} · {Math.round(food.calories * m)} cal · P{Math.round(food.protein * m)}g · C{Math.round(food.carbs * m)}g · F{Math.round(food.fat * m)}g · Fb{Math.round((food.fiber || 0) * m)}g</div>
                          <div className="food-reason"><Info size={12} /><span>{item.reasoning}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        </>)}

        <div className="plan-actions">
          <button className="back-btn" onClick={() => { setStep(1); setWeeklyPlan(null); setFoodDatabase(null); }}>Start Over</button>
          <div className="plan-actions-right">
            <button className="export-btn" onClick={exportMealPlan}>
              <Download size={14} /> Export Meal Plan
            </button>
            <button className="export-btn export-btn-shopping" onClick={exportShoppingList}>
              <ShoppingCart size={14} /> Export Shopping List
            </button>
            <button className="generate-btn" onClick={generateWeeklyPlan} disabled={loading}>
              <RefreshCw size={16} /> {loading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const RecipeModal = () => {
    if (!selectedRecipe) return null;
    return (
      <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <h3>{selectedRecipe.name}</h3>
            <button className="modal-close" onClick={() => setSelectedRecipe(null)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div className="modal-meta-grid">
              <div><strong>Cuisine</strong><br />{selectedRecipe.cuisine}</div>
              <div><strong>Cook Time</strong><br />{selectedRecipe.cooking_time}</div>
              <div><strong>Portion</strong><br />{selectedRecipe.portion_size}</div>
            </div>
            <div className="modal-nutrition">
              {[['Calories', selectedRecipe.calories, 'kcal'], ['Protein', selectedRecipe.protein, 'g'], ['Carbs', selectedRecipe.carbs, 'g'], ['Fat', selectedRecipe.fat, 'g'], ['Fiber', selectedRecipe.fiber, 'g']].map(([n, v, u]) => (
                <div key={n} className="nut-pill"><div className="nut-val">{v}{u}</div><div className="nut-name">{n}</div></div>
              ))}
            </div>
            <h4>Ingredients</h4>
            <ul className="ing-list">
              {(selectedRecipe.ingredients || []).map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
            <h4>Instructions</h4>
            <p className="instructions-text">{selectedRecipe.instructions}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-bg-overlay" />
        <div className="header-content">
          <div className="logo">
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="21" cy="21" r="21" fill="rgba(255,255,255,0.15)"/>
              <circle cx="21" cy="21" r="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
              {/* Bowl */}
              <path d="M10 20 Q10 30 21 30 Q32 30 32 20 Z" fill="rgba(255,255,255,0.9)"/>
              <path d="M10 20 Q10 30 21 30 Q32 30 32 20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
              {/* Steam lines */}
              <path d="M15 16 Q16 13 15 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M21 15 Q22 12 21 9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M27 16 Q28 13 27 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Leaf accent */}
              <path d="M29 17 Q34 12 36 15 Q33 20 29 17Z" fill="#a8e6a3" opacity="0.9"/>
            </svg>
            <div className="logo-text">
              <span className="logo-name">NutriPlan</span>
              <span className="logo-sub">AI-Powered Meal Planning</span>
            </div>
          </div>
          <p className="tagline">Your Personalized Nutrition Guide</p>
          <div className="header-pills">
            <span className="header-pill">🥗 600+ Recipes</span>
            <span className="header-pill">🧬 Science-Backed</span>
            <span className="header-pill">⚡ AI-Generated</span>
          </div>
        </div>
      </header>

      <main className="app-body">
        {step < 4 && (
          <div className="stepper">
            {['Goals', 'Preferences', 'Review'].map((label, i) => (
              <React.Fragment key={label}>
                <div className="step-item">
                  <div className={`step-dot ${step >= i + 1 ? 'done' : ''}`}>{i + 1}</div>
                  <span className={step >= i + 1 ? 'step-label active' : 'step-label'}>{label}</span>
                </div>
                {i < 2 && <div className={`step-line ${step >= i + 2 ? 'done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="card">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && <WeeklyPlanView />}
        </div>
      </main>

      <RecipeModal />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        /* ── CSS Variables ── */
        :root {
          --green-dark:   #1a4731;
          --green-mid:    #2d6a4f;
          --green-bright: #40916c;
          --green-light:  #74c69d;
          --green-pale:   #d8f3dc;
          --amber:        #f4a261;
          --amber-deep:   #e76f51;
          --cream:        #fdfaf5;
          --cream-dark:   #f4efe6;
          --text-dark:    #0f1f17;
          --text-mid:     #3d5147;
          --text-soft:    #7a8c82;
          --border:       #dde8e0;
          --white:        #ffffff;
          --shadow-sm:    0 2px 8px rgba(26,71,49,0.08);
          --shadow-md:    0 6px 24px rgba(26,71,49,0.12);
          --shadow-lg:    0 16px 48px rgba(26,71,49,0.18);
          --radius-sm:    8px;
          --radius-md:    14px;
          --radius-lg:    20px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .app {
          width: 100%; min-height: 100vh; overflow-x: hidden;
          background: var(--cream);
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text-dark); font-size: 14px;
        }

        /* ══════════════════════════════════════════
           HEADER
        ══════════════════════════════════════════ */
        .app-header {
          position: relative;
          min-height: 220px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          background:
            url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400&q=80&auto=format&fit=crop')
            center center / cover no-repeat;
        }

        .header-bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            135deg,
            rgba(15,31,23,0.82) 0%,
            rgba(26,71,49,0.75) 40%,
            rgba(64,145,108,0.60) 100%
          );
          backdrop-filter: blur(1px);
        }

        .header-content {
          position: relative; z-index: 2;
          text-align: center; color: white;
          padding: 2rem 1.5rem;
          animation: fadeDown 0.6s ease both;
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .logo {
          display: inline-flex; align-items: center; gap: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .logo-text { text-align: left; }
        .logo-name {
          display: block;
          font-family: 'Playfair Display', serif;
          font-size: 2.25rem; font-weight: 800;
          letter-spacing: -0.5px; line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #a8e6a3 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .logo-sub {
          display: block; font-size: 0.72rem; font-weight: 500;
          color: rgba(255,255,255,0.65); letter-spacing: 1.2px;
          text-transform: uppercase; margin-top: 2px;
        }
        .tagline {
          font-size: 1rem; font-weight: 500;
          color: rgba(255,255,255,0.88);
          margin-bottom: 1rem; letter-spacing: 0.2px;
        }
        .header-pills {
          display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;
        }
        .header-pill {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.9);
          padding: 0.3rem 0.75rem; border-radius: 99px;
          font-size: 0.78rem; font-weight: 600;
          backdrop-filter: blur(4px);
          letter-spacing: 0.2px;
        }

        /* ══════════════════════════════════════════
           LAYOUT
        ══════════════════════════════════════════ */
        .app-body { max-width: 900px; margin: 0 auto; padding: 1.75rem 1rem 4rem; }

        /* ══════════════════════════════════════════
           STEPPER
        ══════════════════════════════════════════ */
        .stepper {
          display: flex; align-items: center; justify-content: center;
          gap: 0; margin-bottom: 1.75rem;
        }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .step-dot {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2px solid var(--border); background: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; color: var(--text-soft);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: var(--shadow-sm);
        }
        .step-dot.done {
          background: linear-gradient(135deg, var(--green-mid), var(--green-bright));
          border-color: transparent; color: white;
          box-shadow: 0 4px 12px rgba(45,106,79,0.35);
          transform: scale(1.05);
        }
        .step-label { font-size: 0.72rem; color: var(--text-soft); font-weight: 600; letter-spacing: 0.3px; }
        .step-label.active { color: var(--green-mid); }
        .step-line { width: 64px; height: 2px; background: var(--border); margin: 0 6px 22px; transition: all 0.3s; }
        .step-line.done { background: linear-gradient(90deg, var(--green-mid), var(--green-bright)); }

        /* ══════════════════════════════════════════
           CARD
        ══════════════════════════════════════════ */
        .card {
          background: white; border-radius: var(--radius-lg);
          padding: 2rem 1.75rem;
          box-shadow: var(--shadow-md);
          border: 1px solid rgba(221,232,224,0.6);
          animation: slideUp 0.4s ease both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ══════════════════════════════════════════
           FORM ELEMENTS
        ══════════════════════════════════════════ */
        .form-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.9rem; font-weight: 700;
          margin-bottom: 0.3rem; color: var(--text-dark);
          background: linear-gradient(135deg, var(--green-dark) 0%, var(--green-bright) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle { color: var(--text-soft); font-size: 0.9rem; margin-bottom: 1.75rem; font-weight: 500; }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label {
          display: flex; align-items: center; gap: 6px;
          font-weight: 700; font-size: 0.78rem;
          margin-bottom: 0.65rem; color: var(--text-mid);
          text-transform: uppercase; letter-spacing: 0.7px;
        }
        input, select {
          width: 100%; padding: 0.75rem 1rem;
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          font-size: 0.95rem; font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s; background: var(--cream); color: var(--text-dark);
        }
        input:focus, select:focus {
          outline: none; border-color: var(--green-bright);
          box-shadow: 0 0 0 3px rgba(64,145,108,0.12);
          background: white;
        }
        .input-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .button-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }

        .option-btn {
          padding: 0.5rem 0.95rem;
          border: 1.5px solid var(--border); background: var(--cream);
          border-radius: var(--radius-sm); cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600;
          font-size: 0.85rem; color: var(--text-mid);
          transition: all 0.18s; white-space: nowrap;
        }
        .option-btn:hover {
          border-color: var(--green-bright);
          background: var(--green-pale); color: var(--green-dark);
          transform: translateY(-1px); box-shadow: var(--shadow-sm);
        }
        .option-btn.active {
          background: linear-gradient(135deg, var(--green-mid), var(--green-bright));
          border-color: transparent; color: white;
          box-shadow: 0 3px 10px rgba(45,106,79,0.3);
          transform: translateY(-1px);
        }

        .next-btn, .generate-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, var(--green-dark), var(--green-bright));
          color: white; border: none;
          padding: 0.8rem 1.75rem; border-radius: var(--radius-sm);
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s; white-space: nowrap;
          box-shadow: 0 4px 14px rgba(26,71,49,0.25);
          letter-spacing: 0.2px;
        }
        .next-btn:hover, .generate-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26,71,49,0.35);
          filter: brightness(1.05);
        }
        .next-btn:disabled, .generate-btn:disabled {
          opacity: 0.5; cursor: not-allowed; transform: none;
          box-shadow: none; filter: none;
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: white; color: var(--green-mid);
          border: 1.5px solid var(--green-light);
          padding: 0.8rem 1.4rem; border-radius: var(--radius-sm);
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.2s;
        }
        .back-btn:hover { background: var(--green-pale); border-color: var(--green-bright); }
        .btn-right { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
        .button-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.5rem; }

        /* ══════════════════════════════════════════
           REVIEW CARD
        ══════════════════════════════════════════ */
        .review-card {
          background: linear-gradient(135deg, var(--cream) 0%, var(--green-pale) 100%);
          border-radius: var(--radius-md); padding: 1.5rem;
          margin-bottom: 1.5rem; border: 1px solid var(--border);
        }
        .review-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
        .review-block {
          background: white; border-radius: var(--radius-sm);
          padding: 0.875rem 0.5rem; border: 1px solid var(--border);
          text-align: center; box-shadow: var(--shadow-sm);
        }
        .review-block-title { font-size: 0.7rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; font-weight: 700; }
        .review-block-value { font-weight: 700; font-size: 1rem; color: var(--text-dark); }
        .review-section { margin-bottom: 0.875rem; }
        .review-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-soft); font-weight: 700; margin-bottom: 0.4rem; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag {
          background: white; padding: 0.28rem 0.7rem; border-radius: 99px;
          font-size: 0.8rem; border: 1px solid var(--border);
          color: var(--text-mid); font-weight: 500;
        }

        .macro-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.7rem; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
        .macro-card {
          background: white; border-radius: var(--radius-sm);
          padding: 1rem 0.5rem; text-align: center;
          border: 1.5px solid var(--border); box-shadow: var(--shadow-sm);
          transition: transform 0.2s;
        }
        .macro-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .macro-value { font-size: 1.5rem; font-weight: 800; color: var(--green-mid); font-family: 'Playfair Display', serif; }
        .macro-label { font-size: 0.7rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; font-weight: 600; }
        .macro-warning {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border: 1.5px solid #f59e0b; border-radius: var(--radius-sm);
          padding: 0.875rem 1rem; font-size: 0.82rem; color: #92400e;
          margin-top: 0.875rem; line-height: 1.5; font-weight: 500;
        }

        /* ══════════════════════════════════════════
           PROGRESS BAR
        ══════════════════════════════════════════ */
        .progress-wrap {
          background: linear-gradient(135deg, var(--cream), var(--green-pale));
          border: 1.5px solid var(--border); border-radius: var(--radius-md);
          padding: 1.5rem; margin-bottom: 1.5rem;
        }
        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .progress-msg { font-size: 0.9rem; font-weight: 700; color: var(--green-mid); }
        .progress-pct { font-size: 1.1rem; font-weight: 800; color: var(--green-dark); font-family: 'Playfair Display', serif; }
        .progress-track { background: var(--border); border-radius: 99px; height: 12px; overflow: hidden; margin-bottom: 0.875rem; box-shadow: inset 0 1px 3px rgba(0,0,0,0.08); }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--green-dark), var(--green-bright), var(--amber));
          border-radius: 99px;
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 2px 6px rgba(45,106,79,0.4);
        }
        .progress-steps { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .ps-done { font-size: 0.78rem; color: var(--green-mid); font-weight: 700; }
        .ps-active { font-size: 0.78rem; color: var(--amber-deep); font-weight: 700; }
        .ps-pending { font-size: 0.78rem; color: var(--text-soft); }

        /* ══════════════════════════════════════════
           PLAN VIEW
        ══════════════════════════════════════════ */
        .plan-view { width: 100%; }
        .plan-header { margin-bottom: 1.25rem; }
        .plan-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.9rem; font-weight: 700; margin-bottom: 0.2rem;
          background: linear-gradient(135deg, var(--green-dark), var(--green-bright));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Summary strip */
        .summary-strip { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
        .summary-pill {
          display: flex; flex-direction: column; align-items: center;
          background: linear-gradient(135deg, white, var(--green-pale));
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          padding: 0.7rem 1rem; min-width: 80px; flex: 1;
          box-shadow: var(--shadow-sm); transition: all 0.2s;
        }
        .summary-pill:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .summary-val { font-size: 1.15rem; font-weight: 800; color: var(--green-mid); font-family: 'Playfair Display', serif; }
        .summary-lbl { font-size: 0.68rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; font-weight: 700; }

        /* Day tabs */
        .day-tabs { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem; margin: 1.25rem 0; }
        .day-tab {
          display: flex; flex-direction: column; align-items: center;
          padding: 0.65rem 0.25rem; border: 1.5px solid var(--border);
          border-radius: var(--radius-sm); background: white; cursor: pointer;
          transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .day-tab:hover { border-color: var(--green-bright); background: var(--green-pale); transform: translateY(-1px); }
        .day-tab.active {
          background: linear-gradient(135deg, var(--green-dark), var(--green-bright));
          border-color: transparent; color: white;
          box-shadow: 0 4px 12px rgba(26,71,49,0.35); transform: translateY(-2px);
        }
        .day-tab-name { font-weight: 700; font-size: 0.85rem; }
        .day-tab-cal { font-size: 0.7rem; opacity: 0.75; margin-top: 2px; font-weight: 500; }

        /* Day panel */
        .day-panel {
          background: linear-gradient(135deg, var(--cream) 0%, var(--green-pale) 100%);
          border-radius: var(--radius-md); padding: 1.5rem;
          margin-bottom: 1.25rem; border: 1px solid var(--border);
        }
        .day-panel-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;
          padding-bottom: 1rem; border-bottom: 2px solid var(--border);
        }
        .day-panel-header h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem; font-weight: 700; color: var(--green-dark);
        }
        .day-macro-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .badge {
          background: white; border: 1px solid var(--border);
          border-radius: 99px; padding: 0.28rem 0.7rem;
          font-size: 0.78rem; font-weight: 700; color: var(--text-mid);
          box-shadow: var(--shadow-sm);
        }

        /* Meals grid */
        .meals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .meal-card {
          background: white; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); overflow: hidden;
          box-shadow: var(--shadow-sm); transition: box-shadow 0.2s;
        }
        .meal-card:hover { box-shadow: var(--shadow-md); }
        .meal-card-header {
          padding: 0.875rem 1rem; border-bottom: 1px solid var(--border);
          background: linear-gradient(90deg, var(--cream), var(--green-pale));
        }
        .meal-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1rem; margin-bottom: 0.3rem; color: var(--green-dark); }
        .meal-icon { font-size: 1.1rem; }
        .meal-totals-row { display: flex; flex-wrap: wrap; gap: 0.3rem; font-size: 0.75rem; color: var(--text-soft); font-weight: 600; }
        .meal-items { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }

        /* Food rows */
        .food-row {
          background: var(--cream); border-radius: var(--radius-sm);
          padding: 0.75rem; border: 1px solid var(--border);
          transition: all 0.18s;
        }
        .food-row:hover { background: var(--green-pale); border-color: var(--green-light); }
        .food-details { flex: 1; min-width: 0; }
        .food-top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.4rem; margin-bottom: 0.3rem; flex-wrap: wrap; }
        .food-name { font-weight: 700; font-size: 0.9rem; color: var(--text-dark); }
        .food-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
        .btn-recipe, .btn-swap {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 0.25rem 0.55rem; border-radius: 6px;
          font-size: 0.72rem; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s;
          border: 1.5px solid var(--green-bright); background: white;
          color: var(--green-mid); white-space: nowrap;
        }
        .btn-recipe:hover, .btn-swap:hover {
          background: linear-gradient(135deg, var(--green-mid), var(--green-bright));
          color: white; border-color: transparent;
          box-shadow: 0 2px 8px rgba(45,106,79,0.3);
        }
        .btn-swap:disabled { opacity: 0.4; cursor: not-allowed; }
        .food-portion { font-size: 0.78rem; font-weight: 700; color: var(--green-bright); margin-bottom: 0.25rem; }
        .food-meta { font-size: 0.73rem; color: var(--text-soft); margin-bottom: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
        .food-reason {
          display: flex; align-items: flex-start; gap: 4px;
          font-size: 0.76rem; color: var(--green-mid); font-weight: 600;
          background: linear-gradient(135deg, var(--green-pale), #f0fdf4);
          padding: 0.35rem 0.55rem; border-radius: 6px; line-height: 1.4;
          border: 1px solid rgba(64,145,108,0.2);
        }
        .food-reason svg { flex-shrink: 0; margin-top: 1px; }

        /* ══════════════════════════════════════════
           VIEW TABS
        ══════════════════════════════════════════ */
        .view-tabs {
          display: flex; gap: 0.5rem; margin-bottom: 1.25rem;
          border-bottom: 2px solid var(--border); padding-bottom: 0;
        }
        .view-tab {
          padding: 0.65rem 1.4rem; border: none; background: none;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.9rem;
          font-weight: 700; color: var(--text-soft); cursor: pointer;
          border-bottom: 3px solid transparent; margin-bottom: -2px;
          transition: all 0.2s; border-radius: 8px 8px 0 0;
          letter-spacing: 0.2px;
        }
        .view-tab:hover { color: var(--green-mid); background: var(--green-pale); }
        .view-tab.active { color: var(--green-mid); border-bottom-color: var(--green-bright); }

        /* ══════════════════════════════════════════
           SHOPPING LIST
        ══════════════════════════════════════════ */
        .shopping-view { padding-top: 0.5rem; }
        .shopping-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .shopping-header h3 { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: var(--green-dark); margin-bottom: 0.15rem; }
        .shopping-sub { font-size: 0.82rem; color: var(--text-soft); font-weight: 500; }
        .shopping-progress { text-align: right; }
        .shopping-count { font-size: 1.5rem; font-weight: 800; color: var(--green-mid); display: block; font-family: 'Playfair Display', serif; }
        .shopping-count-label { font-size: 0.7rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
        .shopping-progress-bar { background: var(--border); border-radius: 99px; height: 8px; overflow: hidden; margin-bottom: 1.5rem; }
        .shopping-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--green-dark), var(--green-bright), var(--amber));
          border-radius: 99px; transition: width 0.5s ease;
        }
        .shopping-group { margin-bottom: 1.25rem; }
        .shopping-group-title {
          font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.8px; color: var(--green-mid); margin-bottom: 0.5rem;
          padding-bottom: 0.4rem; border-bottom: 2px solid var(--green-pale);
        }
        .shopping-item {
          display: flex; align-items: flex-start; gap: 0.75rem;
          padding: 0.65rem 0.875rem; border-radius: var(--radius-sm);
          cursor: pointer; transition: all 0.15s;
          margin-bottom: 0.35rem; border: 1px solid transparent;
        }
        .shopping-item:hover { background: var(--green-pale); border-color: var(--green-light); }
        .shopping-item.checked { background: var(--cream); opacity: 0.55; }
        .shopping-checkbox {
          width: 22px; height: 22px; min-width: 22px; border-radius: 6px;
          border: 2px solid var(--border); display: flex; align-items: center;
          justify-content: center; font-size: 0.75rem; font-weight: 800;
          color: white; transition: all 0.18s; flex-shrink: 0; margin-top: 1px;
        }
        .shopping-checkbox.checked {
          background: linear-gradient(135deg, var(--green-mid), var(--green-bright));
          border-color: transparent; box-shadow: 0 2px 6px rgba(45,106,79,0.35);
        }
        .shopping-item-info { flex: 1; min-width: 0; }
        .shopping-item-name { display: block; font-weight: 700; font-size: 0.9rem; color: var(--text-dark); margin-bottom: 0.15rem; }
        .shopping-item.checked .shopping-item-name { text-decoration: line-through; color: var(--text-soft); }
        .shopping-item-recipes { display: block; font-size: 0.74rem; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ══════════════════════════════════════════
           EXPORT & ACTIONS
        ══════════════════════════════════════════ */
        .export-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0.6rem 1.1rem; border-radius: var(--radius-sm);
          border: 1.5px solid var(--green-bright); background: white;
          color: var(--green-mid); font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.82rem; font-weight: 700; cursor: pointer;
          transition: all 0.18s; white-space: nowrap;
        }
        .export-btn:hover {
          background: linear-gradient(135deg, var(--green-mid), var(--green-bright));
          color: white; border-color: transparent;
          box-shadow: 0 4px 12px rgba(45,106,79,0.3);
        }
        .export-btn-shopping { border-color: #3b82f6; color: #1d4ed8; }
        .export-btn-shopping:hover { background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: white; border-color: transparent; }
        .plan-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1.25rem; }
        .plan-actions-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .shopping-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }

        /* ══════════════════════════════════════════
           UNIT TOGGLE
        ══════════════════════════════════════════ */
        .unit-toggle-row { display: flex; gap: 1.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .unit-toggle-group { display: flex; align-items: center; gap: 0.5rem; }
        .unit-toggle-label { font-size: 0.78rem; font-weight: 700; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; }
        .unit-toggle { display: flex; border: 1.5px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
        .unit-btn { padding: 0.38rem 0.875rem; border: none; background: var(--cream); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.82rem; font-weight: 700; color: var(--text-soft); cursor: pointer; transition: all 0.15s; }
        .unit-btn:hover { background: var(--green-pale); color: var(--green-mid); }
        .unit-btn.active { background: linear-gradient(135deg, var(--green-mid), var(--green-bright)); color: white; }
        .height-ft-row { display: flex; align-items: center; gap: 0.4rem; }
        .height-ft-row input { flex: 1; min-width: 0; }
        .height-sep { font-size: 0.85rem; color: var(--text-soft); font-weight: 700; white-space: nowrap; }

        /* ══════════════════════════════════════════
           RECIPE MODAL
        ══════════════════════════════════════════ */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,31,23,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); }
        .modal-box { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; box-shadow: var(--shadow-lg); animation: popIn 0.22s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.93) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 1.1rem; border-bottom: 1.5px solid var(--border); position: sticky; top: 0; background: white; z-index: 1; }
        .modal-head h3 { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: var(--green-dark); }
        .modal-close { background: none; border: none; cursor: pointer; color: var(--text-soft); padding: 5px; border-radius: 8px; transition: all 0.15s; }
        .modal-close:hover { background: var(--cream); color: var(--text-dark); }
        .modal-body { padding: 1.5rem; }
        .modal-meta-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 0.875rem; margin-bottom: 1.25rem; background: var(--cream); border-radius: var(--radius-sm); padding: 1.1rem; border: 1px solid var(--border); }
        .modal-meta-grid > div { font-size: 0.88rem; line-height: 1.6; color: var(--text-mid); font-weight: 500; }
        .modal-meta-grid > div strong { color: var(--green-dark); font-weight: 700; }
        .modal-nutrition { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
        .nut-pill { flex: 1; min-width: 70px; background: linear-gradient(135deg, var(--cream), var(--green-pale)); border-radius: var(--radius-sm); padding: 0.75rem 0.5rem; text-align: center; border: 1px solid var(--border); }
        .nut-val { font-weight: 800; font-size: 1.05rem; color: var(--green-mid); font-family: 'Playfair Display', serif; }
        .nut-name { font-size: 0.7rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 3px; font-weight: 700; }
        .modal-body h4 { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.65rem; color: var(--green-dark); }
        .ing-list { list-style: none; margin-bottom: 1.25rem; }
        .ing-list li { padding: 0.5rem 0 0.5rem 1.1rem; position: relative; border-bottom: 1px solid var(--cream-dark); font-size: 0.9rem; color: var(--text-mid); font-weight: 500; }
        .ing-list li::before { content: "•"; position: absolute; left: 0; color: var(--green-bright); font-weight: 800; font-size: 1rem; }
        .ing-list li:last-child { border-bottom: none; }
        .instructions-text { font-size: 0.9rem; line-height: 1.8; background: var(--cream); padding: 1.1rem; border-radius: var(--radius-sm); color: var(--text-mid); border: 1px solid var(--border); font-weight: 500; }

        /* ══════════════════════════════════════════
           ANIMATIONS & UTILITIES
        ══════════════════════════════════════════ */
        .spin { animation: rotate 0.9s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ══════════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════════ */
        @media (max-width: 640px) {
          .app-header { min-height: 180px; }
          .logo-name { font-size: 1.85rem; }
          .app-body { padding: 1.25rem 0.875rem 2.5rem; }
          .card { padding: 1.5rem 1.1rem; border-radius: var(--radius-md); }
          .input-row { grid-template-columns: 1fr 1fr; }
          .input-row .input-group:last-child { grid-column: span 2; }
          .review-row { grid-template-columns: repeat(2,1fr); }
          .macro-row { grid-template-columns: repeat(2,1fr); }
          .day-tabs { grid-template-columns: repeat(4,1fr); }
          .meals-grid { grid-template-columns: 1fr; }
          .summary-strip { gap: 0.4rem; }
          .summary-pill { min-width: 60px; padding: 0.5rem; }
          .summary-val { font-size: 1rem; }
          .day-panel-header { flex-direction: column; }
          .plan-actions { flex-direction: column; }
          .plan-actions button { width: 100%; justify-content: center; }
          .food-meta { white-space: normal; }
          .header-pills { display: none; }
        }
      `}</style>
    </div>
  );
};

export default NutritionPlanner;
