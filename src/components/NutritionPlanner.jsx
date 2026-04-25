"use client";
import React, { useState } from 'react';
import { Utensils, Target, Activity, DollarSign, ChefHat, RefreshCw, Info, Calendar, BookOpen, X, Plus, Download, ShoppingCart } from 'lucide-react';

const NutritionPlanner = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState(null);
  const [userData, setUserData] = useState({
    goals: [], weight: '', height: '', age: '', sex: '',
    weightUnit: 'kg', heightUnit: 'cm',
    activities: [], customActivities: '',
    preferences: [], restrictions: [], budget: '',
  });
  const [foodDatabase, setFoodDatabase] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [swapping, setSwapping] = useState(null);

  const goals = ['Weight Loss', 'Muscle Gain', 'Weight Gain', 'Maintenance', 'Athletic Performance'];
  const activityOptions = ['Gym (3-5x/week)', 'Running/Cardio', 'Sports (Team/Individual)', 'Walking/Light Activity', 'Sedentary'];
  const cuisinePreferences = ['American', 'Italian', 'Asian', 'Mexican', 'Indian', 'Mediterranean', 'Greek', 'Middle Eastern', 'Thai', 'Japanese', 'Chinese'];
  const dietaryRestrictions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher', 'Keto', 'Paleo', 'No Restrictions'];
  const budgetOptions = ['Budget ($5-10/day)', 'Moderate ($10-20/day)', 'Flexible ($20+/day)'];

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
        budget:       userData.budget,
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

  // Simulates smooth 0→95% progress, then snaps to 100% when done
  const startProgress = (startPct, endPct, durationMs) => {
    setLoadingProgress(startPct);
    const steps = 60;
    const increment = (endPct - startPct) / steps;
    const intervalMs = durationMs / steps;
    let current = startPct;
    const id = setInterval(() => {
      current = Math.min(current + increment, endPct);
      setLoadingProgress(Math.round(current));
      if (current >= endPct) clearInterval(id);
    }, intervalMs);
    setProgressInterval(id);
    return id;
  };

  const stopProgress = (id) => {
    if (id) clearInterval(id);
    setProgressInterval(null);
    setLoadingProgress(100);
  };

  const generateWeeklyPlan = async () => {
    setLoading(true);
    try {
      // ── STEP 1: Fetch real recipes from Supabase ──
      setLoadingMsg('Fetching recipes from database...');
      setLoadingProgress(0);
      const p1 = startProgress(0, 20, 2000);
      const database = await fetchRecipesFromDB();
      stopProgress(p1);

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
      setLoadingMsg('Building your 7-day meal plan...');
      const p2 = startProgress(25, 92, 22000);
      const { calories, protein, carbs, fat } = calculateMacros();

      // Pass food as compact id:name(macros) string to keep prompt small
      const foodList = allFoods
        .map(f => `${f.id}:${f.name}(${f.calories}cal,P${f.protein}g,C${f.carbs}g,F${f.fat}g,$${f.cost})`)
        .join(', ');

      const planPrompt = `You are a nutritionist. Create a 7-day meal plan.
Goals: ${userData.goals.join(', ')}. Daily targets: ${calories}kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat.
Available foods (id:name:macros): ${foodList}
Return ONLY raw JSON (no markdown fences):
{"weeklyTotals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0},"days":[{"dayNumber":1,"dayName":"Monday","dailyTotals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0},"meals":{"breakfast":{"items":[{"id":"use-exact-id-from-list","multiplier":1.0,"reasoning":"brief reason"}],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"lunch":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"snack":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"dinner":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}}}}]}
Rules: 7 days Monday-Sunday, vary meals daily, 2-3 items per meal, reasoning max 15 words. Use ONLY the exact id values from the list above.`;

      const planData = await callAPI(planPrompt, 8000);
      stopProgress(p2);
      setLoadingProgress(100);

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
          cost:     acc.cost     + food.cost      * m,
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });

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
          cost:     acc.cost     + verifiedMeals[mt].totals.cost,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });
        return { ...day, meals: verifiedMeals, dailyTotals };
      });
      verifiedPlan.weeklyTotals = verifiedPlan.days.reduce((acc, d) => ({
        calories: acc.calories + d.dailyTotals.calories,
        protein:  acc.protein  + d.dailyTotals.protein,
        carbs:    acc.carbs    + d.dailyTotals.carbs,
        fat:      acc.fat      + d.dailyTotals.fat,
        fiber:    acc.fiber    + (d.dailyTotals.fiber || 0),
        cost:     acc.cost     + (d.dailyTotals.cost || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });

      setWeeklyPlan(verifiedPlan);
      setStep(4);

    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
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
              cost:     acc.cost     + food.cost      * m,
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });
          // Recalculate daily totals
          updated.days[dayIndex].dailyTotals = ['breakfast', 'lunch', 'snack', 'dinner'].reduce((acc, meal) => {
            const t = updated.days[dayIndex].meals[meal].totals;
            return {
              calories: acc.calories + t.calories,
              protein:  acc.protein  + t.protein,
              carbs:    acc.carbs    + t.carbs,
              fat:      acc.fat      + t.fat,
              fiber:    acc.fiber    + (t.fiber || 0),
              cost:     acc.cost     + t.cost,
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });
          // FIX 1: Recalculate weeklyTotals from all 7 days so summary strip stays accurate
          updated.weeklyTotals = updated.days.reduce((acc, d) => ({
            calories: acc.calories + d.dailyTotals.calories,
            protein:  acc.protein  + d.dailyTotals.protein,
            carbs:    acc.carbs    + d.dailyTotals.carbs,
            fat:      acc.fat      + d.dailyTotals.fat,
            fiber:    acc.fiber    + (d.dailyTotals.fiber || 0),
            cost:     acc.cost     + (d.dailyTotals.cost || 0),
          }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 });
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
      <h2>Food Preferences & Budget</h2>
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
      <div className="input-group">
        <label><DollarSign size={16} /> Daily Budget</label>
        <div className="button-grid">
          {budgetOptions.map(b => (
            <button key={b} className={`option-btn ${userData.budget === b ? 'active' : ''}`} onClick={() => updateUserData('budget', b)}>{b}</button>
          ))}
        </div>
      </div>
      <div className="button-row">
        <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
        <button className="next-btn" onClick={() => setStep(3)} disabled={userData.preferences.length === 0 || userData.restrictions.length === 0 || !userData.budget}>
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
            <div className="review-label">Restrictions & Budget</div>
            <div className="tag-list">
              {userData.restrictions.map(r => <span key={r} className="tag">{r}</span>)}
              <span className="tag tag-budget">{userData.budget}</span>
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
              <span className={loadingProgress >= 20 ? 'ps-done' : 'ps-pending'}>✓ Recipes loaded</span>
              <span className={loadingProgress >= 92 ? 'ps-done' : loadingProgress >= 25 ? 'ps-active' : 'ps-pending'}>⏳ AI building plan</span>
              <span className={loadingProgress >= 100 ? 'ps-done' : 'ps-pending'}>✓ Ready!</span>
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
        ['Goals', userData.goals.join(', '), 'Budget', userData.budget],
        ['Daily Calorie Target', calculateMacros().calories + ' kcal',
         'Daily Protein Target', calculateMacros().protein + 'g'],
        [],
        ['Day', 'Total Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Est. Cost ($)'],
      ];
      weeklyPlan.days.forEach(day => {
        overviewRows.push([
          day.dayName,
          Math.round(day.dailyTotals.calories),
          Math.round(day.dailyTotals.protein),
          Math.round(day.dailyTotals.carbs),
          Math.round(day.dailyTotals.fat),
          parseFloat((day.dailyTotals.cost || 0).toFixed(2)),
        ]);
      });
      overviewRows.push([]);
      overviewRows.push([
        'WEEKLY AVERAGE',
        Math.round(weeklyPlan.weeklyTotals.calories / 7),
        Math.round(weeklyPlan.weeklyTotals.protein / 7),
        Math.round(weeklyPlan.weeklyTotals.carbs / 7),
        Math.round(weeklyPlan.weeklyTotals.fat / 7),
        parseFloat(((weeklyPlan.weeklyTotals.cost || 0) / 7).toFixed(2)),
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
          ['Meal', 'Food Item', 'Portion', 'Cuisine', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Cost ($)', 'Why This Food'],
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
              parseFloat((food.cost * m).toFixed(2)),
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
            parseFloat((meal.totals.cost || 0).toFixed(2)),
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
          parseFloat((day.dailyTotals.cost || 0).toFixed(2)),
          '',
        ]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [14,22,10,12,10,12,10,8,10,30].map(w => ({ wch: w }));
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
              ['Avg Cost',     '$' + ((weeklyPlan.weeklyTotals.cost || 0) / 7).toFixed(2), ''],
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
              <span className="badge badge-cost">${(currentDay.dailyTotals.cost || 0).toFixed(2)}</span>
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
                          <div className="food-meta">{food.cuisine} · {Math.round(food.calories * m)} cal · P{Math.round(food.protein * m)}g · C{Math.round(food.carbs * m)}g · F{Math.round(food.fat * m)}g · Fb{Math.round((food.fiber || 0) * m)}g · ${(food.cost * m).toFixed(2)}</div>
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
              <div><strong>Cost</strong><br />${(selectedRecipe.cost || 0).toFixed(2)}</div>
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
        <div className="logo"><Utensils size={24} /><span>NutriPlan</span></div>
        <p className="tagline">Your Personalized Nutrition Guide</p>
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
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .app { width: 100%; min-height: 100vh; overflow-x: hidden; background: #f5f3ef; font-family: 'DM Sans', sans-serif; color: #1e1e1e; font-size: 14px; }
        .app-header { background: linear-gradient(135deg, #3d6b4a 0%, #5a8f6e 100%); color: white; padding: 1.5rem 1.25rem 1.25rem; text-align: center; }
        .logo { display: inline-flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem; }
        .logo span { font-family: 'Crimson Text', serif; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.3px; }
        .tagline { font-size: 0.85rem; opacity: 0.88; }
        .app-body { max-width: 860px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
        .stepper { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 1.5rem; }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .step-dot { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #ccc; background: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; color: #999; transition: all 0.25s; }
        .step-dot.done { background: #3d6b4a; border-color: #3d6b4a; color: white; }
        .step-label { font-size: 0.75rem; color: #999; font-weight: 500; }
        .step-label.active { color: #3d6b4a; font-weight: 600; }
        .step-line { width: 60px; height: 2px; background: #ddd; margin: 0 4px 20px; transition: all 0.25s; }
        .step-line.done { background: #3d6b4a; }
        .card { background: white; border-radius: 14px; padding: 1.75rem 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.07); width: 100%; overflow: hidden; }
        .form-section h2 { font-family: 'Crimson Text', serif; font-size: 1.75rem; margin-bottom: 0.25rem; color: #1e1e1e; }
        .subtitle { color: #777; font-size: 0.9rem; margin-bottom: 1.75rem; }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.6rem; color: #1e1e1e; text-transform: uppercase; letter-spacing: 0.4px; }
        input, select { width: 100%; padding: 0.7rem 0.875rem; border: 1.5px solid #e0ddd7; border-radius: 8px; font-size: 0.95rem; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s; background: white; color: #1e1e1e; }
        input:focus, select:focus { outline: none; border-color: #3d6b4a; box-shadow: 0 0 0 3px rgba(61,107,74,0.1); }
        .input-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .button-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .option-btn { padding: 0.55rem 0.9rem; border: 1.5px solid #e0ddd7; background: white; border-radius: 6px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 0.88rem; color: #1e1e1e; transition: all 0.15s; white-space: nowrap; }
        .option-btn:hover { border-color: #3d6b4a; background: #f5faf6; }
        .option-btn.active { background: #3d6b4a; border-color: #3d6b4a; color: white; box-shadow: 0 2px 8px rgba(61,107,74,0.25); }
        .next-btn, .generate-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #3d6b4a, #5a8f6e); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; white-space: nowrap; }
        .next-btn:hover, .generate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(61,107,74,0.35); }
        .next-btn:disabled, .generate-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; background: white; color: #3d6b4a; border: 1.5px solid #3d6b4a; padding: 0.7rem 1.25rem; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .back-btn:hover { background: #f5faf6; }
        .btn-right { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
        .button-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.5rem; }
        .review-card { background: #faf8f5; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .review-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
        .review-block { background: white; border-radius: 8px; padding: 0.75rem; border: 1px solid #e8e5df; text-align: center; }
        .review-block-title { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .review-block-value { font-weight: 700; font-size: 1rem; color: #1e1e1e; }
        .review-section { margin-bottom: 0.875rem; }
        .review-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.4px; color: #888; font-weight: 600; margin-bottom: 0.4rem; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag { background: white; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.82rem; border: 1px solid #e0ddd7; color: #1e1e1e; }
        .tag-budget { background: #3d6b4a; color: white; border-color: #3d6b4a; }
        .macro-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.6rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e8e5df; }
        .macro-card { background: white; border-radius: 8px; padding: 0.875rem 0.5rem; text-align: center; border: 1.5px solid #e0ddd7; }
        .macro-warning { background: #fff8e1; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.82rem; color: #92400e; margin-top: 0.75rem; line-height: 1.5; }
        .macro-value { font-size: 1.4rem; font-weight: 700; color: #3d6b4a; }
        .macro-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
        .plan-view { width: 100%; }
        .plan-header { margin-bottom: 1.25rem; }
        .plan-header h2 { font-family: 'Crimson Text', serif; font-size: 1.75rem; margin-bottom: 0.2rem; }
        .summary-strip { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.875rem; }
        .summary-pill { display: flex; flex-direction: column; align-items: center; background: #f5f3ef; border: 1.5px solid #e0ddd7; border-radius: 8px; padding: 0.6rem 0.875rem; min-width: 80px; flex: 1; }
        .summary-val { font-size: 1.1rem; font-weight: 700; color: #3d6b4a; }
        .summary-lbl { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
        .day-tabs { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem; margin: 1.25rem 0; }
        .day-tab { display: flex; flex-direction: column; align-items: center; padding: 0.6rem 0.25rem; border: 1.5px solid #e0ddd7; border-radius: 8px; background: white; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .day-tab:hover { border-color: #3d6b4a; background: #f5faf6; }
        .day-tab.active { background: #3d6b4a; border-color: #3d6b4a; color: white; box-shadow: 0 2px 8px rgba(61,107,74,0.3); }
        .day-tab-name { font-weight: 700; font-size: 0.85rem; }
        .day-tab-cal { font-size: 0.72rem; opacity: 0.75; margin-top: 2px; }
        .day-panel { background: #faf8f5; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }
        .day-panel-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.875rem; border-bottom: 1.5px solid #e8e5df; }
        .day-panel-header h3 { font-family: 'Crimson Text', serif; font-size: 1.5rem; color: #1e1e1e; }
        .day-macro-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .badge { background: white; border: 1px solid #e0ddd7; border-radius: 20px; padding: 0.25rem 0.6rem; font-size: 0.78rem; font-weight: 600; color: #555; }
        .badge-cost { color: #3d6b4a; border-color: #3d6b4a; }
        .badge-fiber { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
        .meals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
        .meal-card { background: white; border-radius: 10px; border: 1.5px solid #e8e5df; overflow: hidden; }
        .meal-card-header { background: #f5f3ef; padding: 0.7rem 0.875rem; border-bottom: 1px solid #e8e5df; }
        .meal-title { display: flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.95rem; margin-bottom: 0.3rem; }
        .meal-icon { font-size: 1rem; }
        .meal-totals-row { display: flex; flex-wrap: wrap; gap: 0.3rem; font-size: 0.75rem; color: #888; font-weight: 500; }
        .meal-items { padding: 0.625rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .food-row { display: flex; gap: 0.5rem; align-items: flex-start; background: #faf8f5; border-radius: 8px; padding: 0.625rem; border: 1px solid #edeae4; }
        .food-details { flex: 1; min-width: 0; }
        .food-top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.4rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
        .food-name { font-weight: 600; font-size: 0.9rem; color: #1e1e1e; }
        .food-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
        .btn-recipe, .btn-swap { display: inline-flex; align-items: center; gap: 3px; padding: 0.25rem 0.5rem; border-radius: 5px; font-size: 0.75rem; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; border: 1.5px solid #3d6b4a; background: white; color: #3d6b4a; white-space: nowrap; }
        .btn-recipe:hover, .btn-swap:hover { background: #3d6b4a; color: white; }
        .btn-swap:disabled { opacity: 0.45; cursor: not-allowed; }
        .food-portion { font-size: 0.78rem; font-weight: 700; color: #3d6b4a; margin-bottom: 0.2rem; }
        .food-meta { font-size: 0.75rem; color: #999; margin-bottom: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .food-reason { display: flex; align-items: flex-start; gap: 4px; font-size: 0.78rem; color: #3d6b4a; background: #edf5ef; padding: 0.35rem 0.5rem; border-radius: 5px; line-height: 1.4; }
        .food-reason svg { flex-shrink: 0; margin-top: 1px; }
        .plan-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(3px); }
        .modal-box { background: white; border-radius: 14px; width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,0.2); animation: popIn 0.2s ease; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.25rem 1rem; border-bottom: 1.5px solid #e8e5df; position: sticky; top: 0; background: white; z-index: 1; }
        .modal-head h3 { font-family: 'Crimson Text', serif; font-size: 1.5rem; }
        .modal-close { background: none; border: none; cursor: pointer; color: #888; padding: 4px; border-radius: 6px; }
        .modal-close:hover { background: #f5f2ed; color: #1e1e1e; }
        .modal-body { padding: 1.25rem; }
        .modal-meta-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 0.75rem; margin-bottom: 1.25rem; background: #faf8f5; border-radius: 10px; padding: 1rem; }
        .modal-meta-grid > div { font-size: 0.88rem; line-height: 1.6; }
        .modal-nutrition { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
        .nut-pill { flex: 1; min-width: 70px; background: #f5f3ef; border-radius: 8px; padding: 0.6rem; text-align: center; border: 1px solid #e8e5df; }
        .nut-val { font-weight: 700; font-size: 1rem; color: #3d6b4a; }
        .nut-name { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
        .modal-body h4 { font-family: 'Crimson Text', serif; font-size: 1.2rem; margin-bottom: 0.6rem; }
        .ing-list { list-style: none; margin-bottom: 1.25rem; }
        .ing-list li { padding: 0.5rem 0 0.5rem 1rem; position: relative; border-bottom: 1px solid #f0ede8; font-size: 0.9rem; }
        .ing-list li::before { content: "•"; position: absolute; left: 0; color: #3d6b4a; font-weight: 700; }
        .ing-list li:last-child { border-bottom: none; }
        .instructions-text { font-size: 0.9rem; line-height: 1.75; background: #faf8f5; padding: 1rem; border-radius: 8px; color: #333; }
        /* ── Unit Toggle ── */
        .unit-toggle-row { display: flex; gap: 1.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .unit-toggle-group { display: flex; align-items: center; gap: 0.5rem; }
        .unit-toggle-label { font-size: 0.8rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.4px; }
        .unit-toggle { display: flex; border: 1.5px solid #e0ddd7; border-radius: 6px; overflow: hidden; }
        .unit-btn { padding: 0.35rem 0.75rem; border: none; background: white; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600; color: #888; cursor: pointer; transition: all 0.15s; }
        .unit-btn:hover { background: #f5faf6; color: #3d6b4a; }
        .unit-btn.active { background: #3d6b4a; color: white; }
        .height-ft-row { display: flex; align-items: center; gap: 0.4rem; }
        .height-ft-row input { flex: 1; min-width: 0; }
        .height-sep { font-size: 0.85rem; color: #888; font-weight: 600; white-space: nowrap; }
        /* ── Progress Bar ── */
        .progress-wrap { background: #f5f3ef; border: 1.5px solid #e0ddd7; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }
        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
        .progress-msg { font-size: 0.9rem; font-weight: 600; color: #3d6b4a; }
        .progress-pct { font-size: 1rem; font-weight: 700; color: #3d6b4a; }
        .progress-track { background: #e0ddd7; border-radius: 99px; height: 10px; overflow: hidden; margin-bottom: 0.75rem; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #3d6b4a, #5a8f6e); border-radius: 99px; transition: width 0.4s ease; }
        .progress-steps { display: flex; gap: 1rem; flex-wrap: wrap; }
        .ps-done { font-size: 0.78rem; color: #3d6b4a; font-weight: 600; }
        .ps-active { font-size: 0.78rem; color: #f59e0b; font-weight: 600; }
        .ps-pending { font-size: 0.78rem; color: #bbb; }

        /* ── View Tabs ── */
        .view-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 2px solid #e8e5df; padding-bottom: 0; }
        .view-tab { padding: 0.6rem 1.25rem; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; color: #888; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; border-radius: 6px 6px 0 0; }
        .view-tab:hover { color: #3d6b4a; background: #f5faf6; }
        .view-tab.active { color: #3d6b4a; border-bottom-color: #3d6b4a; background: none; }

        /* ── Shopping List ── */
        .shopping-view { padding-top: 0.5rem; }
        .shopping-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .shopping-header h3 { font-family: 'Crimson Text', serif; font-size: 1.4rem; color: #1e1e1e; margin-bottom: 0.15rem; }
        .shopping-sub { font-size: 0.82rem; color: #888; }
        .shopping-progress { text-align: right; }
        .shopping-count { font-size: 1.4rem; font-weight: 700; color: #3d6b4a; display: block; }
        .shopping-count-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
        .shopping-progress-bar { background: #e8e5df; border-radius: 99px; height: 6px; overflow: hidden; margin-bottom: 1.5rem; }
        .shopping-bar-fill { height: 100%; background: linear-gradient(90deg, #3d6b4a, #5a8f6e); border-radius: 99px; transition: width 0.4s ease; }
        .shopping-group { margin-bottom: 1.25rem; }
        .shopping-group-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #3d6b4a; margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid #e8e5df; }
        .shopping-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 0.3rem; border: 1px solid transparent; }
        .shopping-item:hover { background: #f5faf6; border-color: #d4ead9; }
        .shopping-item.checked { background: #f5faf6; opacity: 0.6; }
        .shopping-checkbox { width: 20px; height: 20px; min-width: 20px; border-radius: 5px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: white; transition: all 0.15s; flex-shrink: 0; margin-top: 1px; }
        .shopping-checkbox.checked { background: #3d6b4a; border-color: #3d6b4a; }
        .shopping-item-info { flex: 1; min-width: 0; }
        .shopping-item-name { display: block; font-weight: 600; font-size: 0.9rem; color: #1e1e1e; margin-bottom: 0.15rem; }
        .shopping-item.checked .shopping-item-name { text-decoration: line-through; color: #999; }
        .shopping-item-recipes { display: block; font-size: 0.75rem; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ── Export Buttons ── */
        .export-btn { display: inline-flex; align-items: center; gap: 5px; padding: 0.55rem 1rem; border-radius: 7px; border: 1.5px solid #3d6b4a; background: white; color: #3d6b4a; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .export-btn:hover { background: #3d6b4a; color: white; }
        .export-btn-shopping { border-color: #2563eb; color: #2563eb; }
        .export-btn-shopping:hover { background: #2563eb; color: white; }
        .plan-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
        .plan-actions-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .shopping-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
        .spin { animation: rotate 1s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .app-body { padding: 1rem 0.75rem 2rem; }
          .card { padding: 1.25rem 1rem; border-radius: 10px; }
          .input-row { grid-template-columns: 1fr 1fr; }
          .input-row .input-group:last-child { grid-column: span 2; }
          .review-row { grid-template-columns: repeat(2,1fr); }
          .macro-row { grid-template-columns: repeat(2,1fr); }
          .day-tabs { grid-template-columns: repeat(4,1fr); }
          .meals-grid { grid-template-columns: 1fr; }
          .summary-strip { gap: 0.4rem; }
          .summary-pill { min-width: 60px; padding: 0.5rem 0.5rem; }
          .summary-val { font-size: 0.95rem; }
          .day-panel-header { flex-direction: column; }
          .plan-actions { flex-direction: column; }
          .plan-actions button { width: 100%; justify-content: center; }
          .food-meta { white-space: normal; }
        }
      `}</style>
    </div>
  );
};

export default NutritionPlanner;
