"use client";
import React, { useState } from 'react';
import { Utensils, Target, Activity, DollarSign, ChefHat, RefreshCw, Info, Calendar, BookOpen, X, Plus, Image as ImageIcon } from 'lucide-react';

const NutritionPlanner = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [userData, setUserData] = useState({
    goal: '', weight: '', height: '', sex: '',
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

  const calculateMacros = () => {
    const weight = parseFloat(userData.weight);
    const height = parseFloat(userData.height);
    let bmr = userData.sex === 'Male'
      ? (10 * weight) + (6.25 * height) - (5 * 25) + 5
      : (10 * weight) + (6.25 * height) - (5 * 25) - 161;
    const mult = userData.activities.includes('Gym (3-5x/week)') ? 1.55 :
      userData.activities.includes('Running/Cardio') ? 1.6 :
      userData.activities.includes('Sports (Team/Individual)') ? 1.65 :
      userData.activities.includes('Walking/Light Activity') ? 1.375 : 1.2;
    let calories = bmr * mult;
    if (userData.goal === 'Weight Loss') calories -= 500;
    else if (userData.goal === 'Weight Gain' || userData.goal === 'Muscle Gain') calories += 300;
    let protein, carbs, fat;
    if (userData.goal === 'Muscle Gain' || userData.goal === 'Athletic Performance') {
      protein = weight * 2; fat = weight * 1;
    } else if (userData.goal === 'Weight Loss') {
      protein = weight * 2.2; fat = weight * 0.8;
    } else {
      protein = weight * 1.6; fat = weight * 1;
    }
    carbs = (calories - (protein * 4) - (fat * 9)) / 4;
    return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  };

  const callAPI = async (prompt, maxTokens) => {
   const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const text = data.content.find(c => c.type === "text")?.text || "";
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response. Raw: " + text.slice(0, 300));
    return JSON.parse(match[0]);
  };

  const generateWeeklyPlan = async () => {
    setLoading(true);
    try {
      setLoadingMsg('Building your food database...');
      const dbPrompt = `You are a nutritionist. Create a food database of 30 items for these cuisines: ${userData.preferences.join(', ')}.
Dietary restrictions: ${userData.restrictions.join(', ')}. Budget: ${userData.budget}.
Return ONLY raw JSON (no markdown fences, no extra text):
{"proteins":[{"id":"p1","name":"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"cost":0,"cuisine":"","portionSize":"100g","ingredients":["","",""],"cookingTime":"15 min","instructions":""}],"carbs":[],"vegetables":[],"fats":[],"snacks":[]}
Include: proteins=10 items, carbs=6, vegetables=6, fats=4, snacks=4. Use authentic dish names. Instructions max 2 sentences.`;
      const database = await callAPI(dbPrompt, 6000);
      setFoodDatabase(database);

      setLoadingMsg('Generating your 7-day meal plan...');
      const { calories, protein, carbs, fat } = calculateMacros();
      const allFoods = [...database.proteins, ...database.carbs, ...database.vegetables, ...database.fats, ...database.snacks];
      const foodList = allFoods.map(f => `${f.id}:${f.name}(${f.calories}cal,P${f.protein}g,C${f.carbs}g,F${f.fat}g,$${f.cost})`).join(', ');
      const planPrompt = `You are a nutritionist. Create a 7-day meal plan.
Goal: ${userData.goal}. Daily targets: ${calories}kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat.
Available foods (id:name:macros): ${foodList}
Return ONLY raw JSON (no markdown fences):
{"weeklyTotals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0},"days":[{"dayNumber":1,"dayName":"Monday","dailyTotals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0},"meals":{"breakfast":{"items":[{"id":"p1","multiplier":1.0,"reasoning":"brief reason"}],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"lunch":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"snack":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}},"dinner":{"items":[],"totals":{"calories":0,"protein":0,"carbs":0,"fat":0,"cost":0}}}}]}
Rules: 7 days (Monday-Sunday), vary meals each day, 2-3 items per meal, reasoning max 15 words.`;
      const planData = await callAPI(planPrompt, 8000);
      setWeeklyPlan(planData);
      setStep(4);
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const swapFood = async (dayIndex, mealType, currentItemId) => {
    setSwapping({ dayIndex, mealType, itemId: currentItemId });
    try {
      const allFoods = [...foodDatabase.proteins, ...foodDatabase.carbs, ...foodDatabase.vegetables, ...foodDatabase.fats, ...foodDatabase.snacks];
      const currentFood = allFoods.find(f => f.id === currentItemId);
      const foodList = allFoods.filter(f => f.id !== currentItemId).map(f => `${f.id}:${f.name}(${f.calories}cal,P${f.protein}g)`).join(', ');
      const prompt = `Swap this food: ${currentFood.name} (${currentFood.calories}cal, P${currentFood.protein}g).
User goal: ${userData.goal}. Restrictions: ${userData.restrictions.join(', ')}.
Available: ${foodList}
Return ONLY raw JSON: {"replacementId":"id","multiplier":1.0,"reasoning":"brief reason max 15 words"}`;
      const swapData = await callAPI(prompt, 500);
      setWeeklyPlan(prev => {
        const updated = JSON.parse(JSON.stringify(prev));
        const mealItems = updated.days[dayIndex].meals[mealType].items;
        const idx = mealItems.findIndex(item => item.id === currentItemId);
        if (idx >= 0) {
          mealItems[idx] = { id: swapData.replacementId, multiplier: swapData.multiplier, reasoning: swapData.reasoning };
          updated.days[dayIndex].meals[mealType].totals = mealItems.reduce((acc, item) => {
            const food = allFoods.find(f => f.id === item.id);
            const m = item.multiplier || 1;
            return { calories: acc.calories + food.calories * m, protein: acc.protein + food.protein * m, carbs: acc.carbs + food.carbs * m, fat: acc.fat + food.fat * m, cost: acc.cost + food.cost * m };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });
          updated.days[dayIndex].dailyTotals = ['breakfast', 'lunch', 'snack', 'dinner'].reduce((acc, meal) => {
            const t = updated.days[dayIndex].meals[meal].totals;
            return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat, cost: acc.cost + t.cost };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });
        }
        return updated;
      });
    } catch (error) {
      alert("Swap failed: " + error.message);
    } finally {
      setSwapping(null);
    }
  };

  const openRecipe = (foodId) => {
    const allFoods = [...foodDatabase.proteins, ...foodDatabase.carbs, ...foodDatabase.vegetables, ...foodDatabase.fats, ...foodDatabase.snacks];
    setSelectedRecipe(allFoods.find(f => f.id === foodId));
  };

  const renderStep1 = () => (
    <div className="form-section">
      <h2>Tell Us About Your Goals</h2>
      <p className="subtitle">Let's personalize your nutrition journey</p>
      <div className="input-group">
        <label><Target size={16} /> Primary Goal</label>
        <div className="button-grid">
          {goals.map(goal => (
            <button key={goal} className={`option-btn ${userData.goal === goal ? 'active' : ''}`} onClick={() => updateUserData('goal', goal)}>{goal}</button>
          ))}
        </div>
      </div>
      <div className="input-row">
        <div className="input-group">
          <label>Weight (kg)</label>
          <input type="number" value={userData.weight} onChange={(e) => updateUserData('weight', e.target.value)} placeholder="70" />
        </div>
        <div className="input-group">
          <label>Height (cm)</label>
          <input type="number" value={userData.height} onChange={(e) => updateUserData('height', e.target.value)} placeholder="175" />
        </div>
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
        <button className="next-btn" onClick={() => setStep(2)} disabled={!userData.goal || !userData.weight || !userData.height || !userData.sex || userData.activities.length === 0}>
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
              <div className="review-block-value">{userData.goal}</div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Weight</div>
              <div className="review-block-value">{userData.weight} kg</div>
            </div>
            <div className="review-block">
              <div className="review-block-title">Height</div>
              <div className="review-block-value">{userData.height} cm</div>
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
        </div>
        <div className="button-row">
          <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
          <button className="generate-btn" onClick={generateWeeklyPlan} disabled={loading}>
            <Calendar size={16} />
            {loading ? (loadingMsg || 'Generating...') : 'Generate Weekly Meal Plan'}
          </button>
        </div>
      </div>
    );
  };

  const WeeklyPlanView = () => {
    const [selectedDay, setSelectedDay] = useState(0);
    if (!weeklyPlan || !foodDatabase) return null;
    const allFoods = [...foodDatabase.proteins, ...foodDatabase.carbs, ...foodDatabase.vegetables, ...foodDatabase.fats, ...foodDatabase.snacks];
    const currentDay = weeklyPlan.days[selectedDay];
    const mealNames = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Evening Snack', dinner: 'Dinner' };
    const mealIcons = { breakfast: '🌅', lunch: '☀️', snack: '🍎', dinner: '🌙' };

    return (
      <div className="plan-view">
        {/* Summary bar */}
        <div className="plan-header">
          <h2>Your 7-Day Meal Plan</h2>
          <p className="subtitle">Select a day below to view its meals</p>
          <div className="summary-strip">
            {[
              ['Avg Calories', Math.round(weeklyPlan.weeklyTotals.calories / 7), ''],
              ['Avg Protein', Math.round(weeklyPlan.weeklyTotals.protein / 7), 'g'],
              ['Avg Carbs', Math.round(weeklyPlan.weeklyTotals.carbs / 7), 'g'],
              ['Avg Fat', Math.round(weeklyPlan.weeklyTotals.fat / 7), 'g'],
              ['Avg Cost', '$' + ((weeklyPlan.weeklyTotals.cost || 0) / 7).toFixed(2), ''],
            ].map(([label, val, unit]) => (
              <div key={label} className="summary-pill">
                <span className="summary-val">{val}{unit}</span>
                <span className="summary-lbl">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day tabs */}
        <div className="day-tabs">
          {weeklyPlan.days.map((day, i) => (
            <button key={i} className={`day-tab ${selectedDay === i ? 'active' : ''}`} onClick={() => setSelectedDay(i)}>
              <span className="day-tab-name">{day.dayName.slice(0, 3)}</span>
              <span className="day-tab-cal">{Math.round(day.dailyTotals.calories)}</span>
            </button>
          ))}
        </div>

        {/* Current day */}
        <div className="day-panel">
          <div className="day-panel-header">
            <h3>{currentDay.dayName}</h3>
            <div className="day-macro-badges">
              <span className="badge">{Math.round(currentDay.dailyTotals.calories)} kcal</span>
              <span className="badge">P {Math.round(currentDay.dailyTotals.protein)}g</span>
              <span className="badge">C {Math.round(currentDay.dailyTotals.carbs)}g</span>
              <span className="badge">F {Math.round(currentDay.dailyTotals.fat)}g</span>
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
                    if (!food) return null;
                    const m = item.multiplier || 1;
                    const isSwapping = swapping?.dayIndex === selectedDay && swapping?.mealType === mealType && swapping?.itemId === item.id;
                    return (
                      <div key={idx} className="food-row">
                        <div className="food-icon-wrap">
                          <ImageIcon size={18} color="#4a7c59" />
                        </div>
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
                          <div className="food-meta">{food.portionSize} · {food.cuisine} · {Math.round(food.calories * m)} cal · P{Math.round(food.protein * m)}g · C{Math.round(food.carbs * m)}g · F{Math.round(food.fat * m)}g · ${(food.cost * m).toFixed(2)}</div>
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

        <div className="plan-actions">
          <button className="back-btn" onClick={() => { setStep(1); setWeeklyPlan(null); setFoodDatabase(null); }}>Start Over</button>
          <button className="generate-btn" onClick={generateWeeklyPlan} disabled={loading}>
            <RefreshCw size={16} />{loading ? 'Generating...' : 'Regenerate Plan'}
          </button>
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
              <div><strong>Cook Time</strong><br />{selectedRecipe.cookingTime}</div>
              <div><strong>Portion</strong><br />{selectedRecipe.portionSize}</div>
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
        <p className="tagline">Science-Backed Nutrition, Personalized for You</p>
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

        .app {
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          background: #f5f3ef;
          font-family: 'DM Sans', sans-serif;
          color: #1e1e1e;
          font-size: 14px;
        }

        /* ── Header ── */
        .app-header {
          background: linear-gradient(135deg, #3d6b4a 0%, #5a8f6e 100%);
          color: white;
          padding: 1.5rem 1.25rem 1.25rem;
          text-align: center;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.3rem;
        }
        .logo span {
          font-family: 'Crimson Text', serif;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .tagline { font-size: 0.85rem; opacity: 0.88; }

        /* ── Body ── */
        .app-body {
          max-width: 860px;
          margin: 0 auto;
          padding: 1.5rem 1rem 3rem;
        }

        /* ── Stepper ── */
        .stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 1.5rem;
        }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .step-dot {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 2px solid #ccc;
          background: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 0.85rem; color: #999;
          transition: all 0.25s;
        }
        .step-dot.done { background: #3d6b4a; border-color: #3d6b4a; color: white; }
        .step-label { font-size: 0.75rem; color: #999; font-weight: 500; }
        .step-label.active { color: #3d6b4a; font-weight: 600; }
        .step-line { width: 60px; height: 2px; background: #ddd; margin: 0 4px 20px; transition: all 0.25s; }
        .step-line.done { background: #3d6b4a; }

        /* ── Card ── */
        .card {
          background: white;
          border-radius: 14px;
          padding: 1.75rem 1.5rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          width: 100%;
          overflow: hidden;
        }

        /* ── Form ── */
        .form-section h2 {
          font-family: 'Crimson Text', serif;
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
          color: #1e1e1e;
        }
        .subtitle {
          color: #777;
          font-size: 0.9rem;
          margin-bottom: 1.75rem;
        }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label {
          display: flex; align-items: center; gap: 6px;
          font-weight: 600; font-size: 0.85rem;
          margin-bottom: 0.6rem; color: #1e1e1e;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        input, select {
          width: 100%; padding: 0.7rem 0.875rem;
          border: 1.5px solid #e0ddd7; border-radius: 8px;
          font-size: 0.95rem; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
          background: white; color: #1e1e1e;
        }
        input:focus, select:focus { outline: none; border-color: #3d6b4a; box-shadow: 0 0 0 3px rgba(61,107,74,0.1); }
        .input-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .button-grid {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .option-btn {
          padding: 0.55rem 0.9rem;
          border: 1.5px solid #e0ddd7;
          background: white; border-radius: 6px;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          font-weight: 500; font-size: 0.88rem; color: #1e1e1e;
          transition: all 0.15s; white-space: nowrap;
        }
        .option-btn:hover { border-color: #3d6b4a; background: #f5faf6; }
        .option-btn.active { background: #3d6b4a; border-color: #3d6b4a; color: white; box-shadow: 0 2px 8px rgba(61,107,74,0.25); }

        /* ── Buttons ── */
        .next-btn, .generate-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #3d6b4a, #5a8f6e);
          color: white; border: none;
          padding: 0.7rem 1.5rem; border-radius: 8px;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s; white-space: nowrap;
        }
        .next-btn:hover, .generate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(61,107,74,0.35); }
        .next-btn:disabled, .generate-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: white; color: #3d6b4a;
          border: 1.5px solid #3d6b4a;
          padding: 0.7rem 1.25rem; border-radius: 8px;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .back-btn:hover { background: #f5faf6; }
        .btn-right { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
        .button-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.5rem; }

        /* ── Review ── */
        .review-card {
          background: #faf8f5; border-radius: 12px;
          padding: 1.25rem; margin-bottom: 1.5rem;
        }
        .review-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem; margin-bottom: 1rem;
        }
        .review-block {
          background: white; border-radius: 8px; padding: 0.75rem;
          border: 1px solid #e8e5df; text-align: center;
        }
        .review-block-title { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .review-block-value { font-weight: 700; font-size: 1rem; color: #1e1e1e; }
        .review-section { margin-bottom: 0.875rem; }
        .review-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.4px; color: #888; font-weight: 600; margin-bottom: 0.4rem; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag {
          background: white; padding: 0.3rem 0.7rem;
          border-radius: 20px; font-size: 0.82rem;
          border: 1px solid #e0ddd7; color: #1e1e1e;
        }
        .tag-budget { background: #3d6b4a; color: white; border-color: #3d6b4a; }
        .macro-row {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 0.6rem; margin-top: 1rem;
          padding-top: 1rem; border-top: 1px solid #e8e5df;
        }
        .macro-card {
          background: white; border-radius: 8px; padding: 0.875rem 0.5rem;
          text-align: center; border: 1.5px solid #e0ddd7;
        }
        .macro-value { font-size: 1.4rem; font-weight: 700; color: #3d6b4a; }
        .macro-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }

        /* ── Meal Plan View ── */
        .plan-view { width: 100%; }
        .plan-header { margin-bottom: 1.25rem; }
        .plan-header h2 { font-family: 'Crimson Text', serif; font-size: 1.75rem; margin-bottom: 0.2rem; }
        .summary-strip {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          margin-top: 0.875rem;
        }
        .summary-pill {
          display: flex; flex-direction: column; align-items: center;
          background: #f5f3ef; border: 1.5px solid #e0ddd7;
          border-radius: 8px; padding: 0.6rem 0.875rem;
          min-width: 80px; flex: 1;
        }
        .summary-val { font-size: 1.1rem; font-weight: 700; color: #3d6b4a; }
        .summary-lbl { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }

        /* ── Day Tabs ── */
        .day-tabs {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.4rem;
          margin: 1.25rem 0;
        }
        .day-tab {
          display: flex; flex-direction: column; align-items: center;
          padding: 0.6rem 0.25rem;
          border: 1.5px solid #e0ddd7;
          border-radius: 8px; background: white;
          cursor: pointer; transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .day-tab:hover { border-color: #3d6b4a; background: #f5faf6; }
        .day-tab.active { background: #3d6b4a; border-color: #3d6b4a; color: white; box-shadow: 0 2px 8px rgba(61,107,74,0.3); }
        .day-tab-name { font-weight: 700; font-size: 0.85rem; }
        .day-tab-cal { font-size: 0.72rem; opacity: 0.75; margin-top: 2px; }

        /* ── Day Panel ── */
        .day-panel {
          background: #faf8f5;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .day-panel-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.875rem;
          border-bottom: 1.5px solid #e8e5df;
        }
        .day-panel-header h3 {
          font-family: 'Crimson Text', serif;
          font-size: 1.5rem; color: #1e1e1e;
        }
        .day-macro-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .badge {
          background: white; border: 1px solid #e0ddd7;
          border-radius: 20px; padding: 0.25rem 0.6rem;
          font-size: 0.78rem; font-weight: 600; color: #555;
        }
        .badge-cost { color: #3d6b4a; border-color: #3d6b4a; }

        .meals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }

        /* ── Meal Card ── */
        .meal-card {
          background: white; border-radius: 10px;
          border: 1.5px solid #e8e5df;
          overflow: hidden;
        }
        .meal-card-header {
          background: #f5f3ef;
          padding: 0.7rem 0.875rem;
          border-bottom: 1px solid #e8e5df;
        }
        .meal-title {
          display: flex; align-items: center; gap: 0.4rem;
          font-weight: 700; font-size: 0.95rem; margin-bottom: 0.3rem;
        }
        .meal-icon { font-size: 1rem; }
        .meal-totals-row {
          display: flex; flex-wrap: wrap; gap: 0.3rem;
          font-size: 0.75rem; color: #888; font-weight: 500;
        }
        .meal-items { padding: 0.625rem; display: flex; flex-direction: column; gap: 0.5rem; }

        /* ── Food Row ── */
        .food-row {
          display: flex; gap: 0.5rem; align-items: flex-start;
          background: #faf8f5; border-radius: 8px;
          padding: 0.625rem; border: 1px solid #edeae4;
        }
        .food-icon-wrap {
          width: 28px; height: 28px; min-width: 28px;
          background: #e8f5e9; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }
        .food-details { flex: 1; min-width: 0; }
        .food-top-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 0.4rem;
          margin-bottom: 0.25rem; flex-wrap: wrap;
        }
        .food-name { font-weight: 600; font-size: 0.9rem; color: #1e1e1e; }
        .food-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
        .btn-recipe, .btn-swap {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 0.25rem 0.5rem; border-radius: 5px;
          font-size: 0.75rem; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s; border: 1.5px solid #3d6b4a;
          background: white; color: #3d6b4a; white-space: nowrap;
        }
        .btn-recipe:hover, .btn-swap:hover { background: #3d6b4a; color: white; }
        .btn-swap:disabled { opacity: 0.45; cursor: not-allowed; }
        .food-meta {
          font-size: 0.75rem; color: #999;
          margin-bottom: 0.3rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .food-reason {
          display: flex; align-items: flex-start; gap: 4px;
          font-size: 0.78rem; color: #3d6b4a;
          background: #edf5ef; padding: 0.35rem 0.5rem;
          border-radius: 5px; line-height: 1.4;
        }
        .food-reason svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Plan Actions ── */
        .plan-actions {
          display: flex; justify-content: space-between;
          align-items: center; gap: 1rem;
          flex-wrap: wrap;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 1rem;
          backdrop-filter: blur(3px);
        }
        .modal-box {
          background: white; border-radius: 14px;
          width: 100%; max-width: 560px;
          max-height: 88vh; overflow-y: auto;
          box-shadow: 0 16px 48px rgba(0,0,0,0.2);
          animation: popIn 0.2s ease;
        }
        @keyframes popIn { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1.5px solid #e8e5df;
          position: sticky; top: 0; background: white; z-index: 1;
        }
        .modal-head h3 { font-family: 'Crimson Text', serif; font-size: 1.5rem; }
        .modal-close { background: none; border: none; cursor: pointer; color: #888; padding: 4px; border-radius: 6px; }
        .modal-close:hover { background: #f5f2ed; color: #1e1e1e; }
        .modal-body { padding: 1.25rem; }
        .modal-meta-grid {
          display: grid; grid-template-columns: repeat(2,1fr);
          gap: 0.75rem; margin-bottom: 1.25rem;
          background: #faf8f5; border-radius: 10px; padding: 1rem;
        }
        .modal-meta-grid > div { font-size: 0.88rem; line-height: 1.6; }
        .modal-nutrition {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .nut-pill {
          flex: 1; min-width: 70px;
          background: #f5f3ef; border-radius: 8px;
          padding: 0.6rem; text-align: center;
          border: 1px solid #e8e5df;
        }
        .nut-val { font-weight: 700; font-size: 1rem; color: #3d6b4a; }
        .nut-name { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }
        .modal-body h4 { font-family: 'Crimson Text', serif; font-size: 1.2rem; margin-bottom: 0.6rem; }
        .ing-list { list-style: none; margin-bottom: 1.25rem; }
        .ing-list li {
          padding: 0.5rem 0 0.5rem 1rem; position: relative;
          border-bottom: 1px solid #f0ede8; font-size: 0.9rem;
        }
        .ing-list li::before { content: "•"; position: absolute; left: 0; color: #3d6b4a; font-weight: 700; }
        .ing-list li:last-child { border-bottom: none; }
        .instructions-text {
          font-size: 0.9rem; line-height: 1.75;
          background: #faf8f5; padding: 1rem;
          border-radius: 8px; color: #333;
        }

        .spin { animation: rotate 1s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Responsive ── */
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
