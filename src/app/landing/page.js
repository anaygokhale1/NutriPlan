'use client';

// src/app/landing/page.js  ← or replace src/app/page.js if you want this as the root
//
// VitalMenu Landing Page
// Shown to unauthenticated users BEFORE they sign up.
// Sign In / Sign Up buttons top-right. Full feature showcase.

import { useState, useEffect, useRef } from 'react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navScrolled = scrollY > 60;

  const features = [
    {
      icon: '🧬',
      title: 'Science-Backed Macros',
      desc: 'Your daily targets are calculated using the Mifflin-St Jeor BMR formula and ACSM activity multipliers — the same equations used by registered dietitians.',
      detail: 'Calories · Protein · Carbs · Fat · Fiber',
      color: '#d8f3dc',
      accent: '#2d6a4f',
    },
    {
      icon: '🤖',
      title: 'AI Meal Planning',
      desc: 'Claude AI picks from 600+ real recipes to build a 7-day plan that precisely hits your daily calorie and macro targets — not just an approximation.',
      detail: '7 days · 4 meals · 600+ recipes',
      color: '#dbeafe',
      accent: '#1d4ed8',
    },
    {
      icon: '🍽',
      title: 'Full Recipe Details',
      desc: 'Every meal comes with complete ingredients, cooking instructions, portion sizes and nutritional breakdown — so you know exactly what goes into every bite.',
      detail: 'Ingredients · Method · Macros',
      color: '#fef3c7',
      accent: '#b45309',
    },
    {
      icon: '🔄',
      title: 'Instant Swaps',
      desc: "Don't like a meal? Swap any single food item with one click. The AI finds the closest nutritional match from the same food category in your cuisines.",
      detail: 'Same category · Similar macros',
      color: '#fce7f3',
      accent: '#be185d',
    },
    {
      icon: '🛒',
      title: 'Smart Shopping List',
      desc: 'All 7 days of ingredients automatically compiled into a categorised shopping list. Check items off as you shop, export to Excel when done.',
      detail: 'Auto-grouped · Checkable · Exportable',
      color: '#ede9fe',
      accent: '#6d28d9',
    },
    {
      icon: '📊',
      title: 'Excel Export',
      desc: 'Export your full meal plan and shopping list to Excel with one click — macro summaries, per-day breakdowns, and ingredient quantities all included.',
      detail: 'Meal plan · Shopping list · Macros',
      color: '#d1fae5',
      accent: '#065f46',
    },
  ];

  const steps = [
    { n: '01', title: 'Tell us about you', desc: 'Enter your weight, height, age and goals. Pick your activities and their frequency for accurate TDEE calculation.' },
    { n: '02', title: 'Set your preferences', desc: 'Choose your favourite cuisines, dietary restrictions, meat options and any food allergies. VitalMenu adapts completely.' },
    { n: '03', title: 'Review your macros', desc: 'See your personalised daily calorie and macro targets before generating — estimated weeks to reach your goal included.' },
    { n: '04', title: 'Get your plan', desc: 'Your AI-built 7-day meal plan appears in seconds. Swap meals, view recipes, export your shopping list and start eating right.' },
  ];

  const cuisines = ['🇮🇳 Indian', '🇯🇵 Japanese', '🇮🇹 Italian', '🇲🇽 Mexican', '🫙 Mediterranean', '🇹🇭 Thai', '🇨🇳 Chinese', '🇺🇸 American', '🇬🇷 Greek', '🧆 Middle Eastern', '🌿 Vegan-friendly'];

  const stats = [
    { val: '600+', label: 'Recipes' },
    { val: '11', label: 'Cuisines' },
    { val: '7', label: 'Days planned' },
    { val: '10%', label: 'Macro accuracy' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,300;1,9..144,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --green:      #1a4731;
          --green-mid:  #2d6a4f;
          --green-bright: #40916c;
          --green-light: #74c69d;
          --green-pale: #d8f3dc;
          --cream:      #fdfaf5;
          --cream-2:    #f5f0e8;
          --sand:       #e8dfc8;
          --text:       #0f1f17;
          --text-mid:   #3d5147;
          --text-soft:  #7a8c82;
          --amber:      #f4a261;
          --radius:     16px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--text);
          overflow-x: hidden;
        }

        /* ─── NAV ─────────────────────────────────── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 2.5rem;
          transition: all 0.3s ease;
        }
        .nav.scrolled {
          background: rgba(253,250,245,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(26,71,49,0.08);
          padding: 0.875rem 2.5rem;
          box-shadow: 0 4px 24px rgba(26,71,49,0.06);
        }
        .nav-logo {
          display: flex; align-items: center; gap: 0.625rem;
          text-decoration: none;
        }
        .nav-logo-mark {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--green), var(--green-bright));
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(26,71,49,0.25);
        }
        .nav-logo-name {
          font-family: 'Fraunces', serif;
          font-size: 1.5rem; font-weight: 700;
          color: var(--green);
          letter-spacing: -0.5px;
        }
        .nav-links {
          display: flex; align-items: center; gap: 2rem;
          list-style: none;
        }
        .nav-links a {
          font-size: 0.9rem; font-weight: 500;
          color: var(--text-mid); text-decoration: none;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: var(--green); }
        .nav-cta {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .btn-ghost {
          padding: 0.55rem 1.25rem; border-radius: 99px;
          border: 1.5px solid rgba(26,71,49,0.2);
          background: transparent; color: var(--green-mid);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
        }
        .btn-ghost:hover {
          border-color: var(--green-mid);
          background: var(--green-pale);
        }
        .btn-primary {
          padding: 0.6rem 1.5rem; border-radius: 99px;
          background: linear-gradient(135deg, var(--green), var(--green-bright));
          color: white; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
          box-shadow: 0 4px 14px rgba(26,71,49,0.3);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(26,71,49,0.4);
        }

        /* ─── HERO ────────────────────────────────── */
        .hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          position: relative;
        }
        .hero-left {
          display: flex; flex-direction: column;
          justify-content: center;
          padding: 8rem 4rem 5rem 6rem;
          position: relative; z-index: 2;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: var(--green-pale);
          border: 1px solid rgba(45,106,79,0.2);
          color: var(--green-mid);
          padding: 0.35rem 0.875rem;
          border-radius: 99px;
          font-size: 0.8rem; font-weight: 600;
          letter-spacing: 0.5px; text-transform: uppercase;
          margin-bottom: 1.5rem;
          width: fit-content;
          animation: fadeUp 0.6s ease both;
        }
        .hero-heading {
          font-family: 'Fraunces', serif;
          font-size: clamp(3rem, 5vw, 4.5rem);
          font-weight: 700; line-height: 1.05;
          letter-spacing: -1.5px;
          color: var(--text);
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s 0.1s ease both;
        }
        .hero-heading em {
          font-style: italic;
          color: var(--green-mid);
        }
        .hero-sub {
          font-size: 1.15rem; line-height: 1.7;
          color: var(--text-mid); font-weight: 300;
          max-width: 460px;
          margin-bottom: 2.5rem;
          animation: fadeUp 0.6s 0.2s ease both;
        }
        .hero-buttons {
          display: flex; align-items: center; gap: 1rem;
          margin-bottom: 3.5rem;
          animation: fadeUp 0.6s 0.3s ease both;
        }
        .btn-hero {
          padding: 0.9rem 2.25rem; border-radius: 99px;
          background: linear-gradient(135deg, var(--green), var(--green-bright));
          color: white; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
          box-shadow: 0 6px 24px rgba(26,71,49,0.35);
          letter-spacing: 0.2px;
        }
        .btn-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(26,71,49,0.45);
        }
        .btn-hero-outline {
          padding: 0.9rem 2.25rem; border-radius: 99px;
          background: white; color: var(--green);
          border: 2px solid rgba(26,71,49,0.15);
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
        }
        .btn-hero-outline:hover {
          border-color: var(--green-mid);
          background: var(--green-pale);
        }
        .hero-stats {
          display: flex; gap: 2.5rem;
          animation: fadeUp 0.6s 0.4s ease both;
        }
        .hero-stat-val {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 700;
          color: var(--green);
          display: block; line-height: 1;
        }
        .hero-stat-label {
          font-size: 0.78rem; color: var(--text-soft);
          font-weight: 500; margin-top: 3px; display: block;
          text-transform: uppercase; letter-spacing: 0.5px;
        }

        .hero-right {
          position: relative; overflow: hidden;
        }
        .hero-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .hero-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            to right,
            var(--cream) 0%,
            transparent 25%
          );
        }
        .hero-card-float {
          position: absolute;
          background: white;
          border-radius: var(--radius);
          padding: 1.25rem;
          box-shadow: 0 20px 60px rgba(26,71,49,0.15);
          animation: float 4s ease-in-out infinite;
        }
        .hero-card-float.card-1 {
          bottom: 12%; left: -30px;
          width: 220px;
          animation-delay: 0s;
        }
        .hero-card-float.card-2 {
          top: 20%; right: 8%;
          width: 200px;
          animation-delay: 2s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .float-label { font-size: 0.7rem; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; font-weight: 600; }
        .float-meal { font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: 0.75rem; }
        .float-macros { display: flex; gap: 0.5rem; }
        .float-macro { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 99px; }
        .float-macro.cal { background: #fef3c7; color: #b45309; }
        .float-macro.pro { background: #dbeafe; color: #1d4ed8; }
        .float-macro.carb { background: #d8f3dc; color: #166534; }
        .float-macro.fat { background: #fce7f3; color: #be185d; }
        .float-progress { margin-top: 0.75rem; }
        .float-progress-bar { height: 6px; background: var(--green-pale); border-radius: 99px; overflow: hidden; }
        .float-progress-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--green-bright)); border-radius: 99px; }
        .float-progress-label { font-size: 0.7rem; color: var(--text-soft); margin-top: 0.3rem; font-weight: 500; }

        /* ─── SECTION BASE ─────────────────────────── */
        .section {
          padding: 7rem 6rem;
        }
        .section-sm { padding: 4rem 6rem; }
        .section-label {
          font-size: 0.75rem; font-weight: 700;
          color: var(--green-bright); text-transform: uppercase;
          letter-spacing: 1.5px; margin-bottom: 0.875rem;
        }
        .section-heading {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 700; letter-spacing: -0.5px;
          color: var(--text);
          margin-bottom: 1rem; line-height: 1.15;
        }
        .section-sub {
          font-size: 1.05rem; color: var(--text-mid);
          font-weight: 300; line-height: 1.7;
          max-width: 520px;
        }

        /* ─── STATS BAND ──────────────────────────── */
        .stats-band {
          background: var(--green);
          padding: 3.5rem 6rem;
          display: flex; justify-content: space-around; align-items: center;
          flex-wrap: wrap; gap: 2rem;
        }
        .stats-band-item { text-align: center; }
        .stats-band-val {
          font-family: 'Fraunces', serif;
          font-size: 3rem; font-weight: 700;
          color: white; line-height: 1;
          display: block; margin-bottom: 0.4rem;
        }
        .stats-band-label {
          font-size: 0.82rem; color: rgba(255,255,255,0.6);
          text-transform: uppercase; letter-spacing: 0.8px; font-weight: 500;
        }

        /* ─── FEATURES ────────────────────────────── */
        .features-section {
          padding: 7rem 6rem;
          background: var(--cream);
        }
        .features-header { margin-bottom: 4rem; }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .feature-card {
          border-radius: var(--radius);
          padding: 2rem;
          border: 1px solid rgba(26,71,49,0.08);
          background: white;
          transition: all 0.25s;
          position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--green), var(--green-bright));
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 48px rgba(26,71,49,0.1);
          border-color: transparent;
        }
        .feature-card:hover::before { transform: scaleX(1); }
        .feature-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; margin-bottom: 1.25rem;
        }
        .feature-title {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem; font-weight: 600;
          color: var(--text); margin-bottom: 0.625rem;
          letter-spacing: -0.2px;
        }
        .feature-desc {
          font-size: 0.88rem; line-height: 1.7;
          color: var(--text-mid); font-weight: 300;
          margin-bottom: 1rem;
        }
        .feature-detail {
          font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.8px;
        }

        /* ─── HOW IT WORKS ───────────────────────── */
        .how-section {
          background: var(--cream-2);
          padding: 7rem 6rem;
          position: relative;
        }
        .how-section::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a4731' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }
        .how-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6rem;
          align-items: center;
          margin-top: 4rem;
        }
        .how-steps { display: flex; flex-direction: column; gap: 0; }
        .how-step {
          display: flex; gap: 1.5rem;
          padding: 1.75rem 0;
          border-bottom: 1px solid rgba(26,71,49,0.08);
          transition: all 0.2s;
          cursor: default;
        }
        .how-step:last-child { border-bottom: none; }
        .how-step:hover .how-step-num { background: var(--green); color: white; }
        .how-step-num {
          font-family: 'Fraunces', serif;
          font-size: 0.9rem; font-weight: 700;
          color: var(--green-mid);
          background: var(--green-pale);
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .how-step-content {}
        .how-step-title {
          font-family: 'Fraunces', serif;
          font-size: 1.15rem; font-weight: 600;
          color: var(--text); margin-bottom: 0.4rem;
        }
        .how-step-desc {
          font-size: 0.88rem; line-height: 1.7;
          color: var(--text-mid); font-weight: 300;
        }
        .how-visual {
          position: relative;
        }
        .how-screen {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(26,71,49,0.16);
          border: 1px solid rgba(26,71,49,0.06);
        }
        .how-screen-bar {
          background: var(--green);
          padding: 0.875rem 1.25rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .how-screen-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: rgba(255,255,255,0.3);
        }
        .how-screen-title {
          font-family: 'Fraunces', serif;
          color: white; font-size: 0.9rem; font-weight: 600;
          margin-left: 0.5rem;
        }
        .how-screen-body { padding: 1.5rem; }
        .mock-day { margin-bottom: 1.25rem; }
        .mock-day-label {
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.8px;
          color: var(--text-soft); margin-bottom: 0.625rem;
        }
        .mock-meals { display: flex; flex-direction: column; gap: 0.5rem; }
        .mock-meal {
          background: var(--cream);
          border-radius: 10px; padding: 0.75rem 1rem;
          display: flex; align-items: center; justify-content: space-between;
          border: 1px solid rgba(26,71,49,0.06);
        }
        .mock-meal-left { display: flex; align-items: center; gap: 0.625rem; }
        .mock-meal-icon { font-size: 1rem; }
        .mock-meal-name { font-size: 0.82rem; font-weight: 600; color: var(--text); }
        .mock-meal-cal { font-size: 0.75rem; font-weight: 700; color: var(--green-bright); }
        .mock-macros { display: flex; gap: 0.3rem; }
        .mock-macro { font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 99px; }

        /* ─── CUISINES ────────────────────────────── */
        .cuisines-section { padding: 5rem 0; overflow: hidden; }
        .cuisines-track {
          display: flex; gap: 0.875rem;
          animation: scroll 30s linear infinite;
          width: max-content;
        }
        .cuisines-track:hover { animation-play-state: paused; }
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .cuisine-pill {
          background: white;
          border: 1.5px solid rgba(26,71,49,0.1);
          border-radius: 99px;
          padding: 0.6rem 1.25rem;
          font-size: 0.9rem; font-weight: 500;
          color: var(--text-mid);
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .cuisine-pill:hover {
          border-color: var(--green-mid);
          background: var(--green-pale);
          color: var(--green);
        }

        /* ─── TESTIMONIAL / SOCIAL PROOF ─────────── */
        .proof-section {
          background: white;
          padding: 6rem;
          text-align: center;
        }
        .proof-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 3.5rem;
          text-align: left;
        }
        .proof-card {
          background: var(--cream);
          border-radius: var(--radius);
          padding: 1.75rem;
          border: 1px solid rgba(26,71,49,0.06);
          position: relative;
        }
        .proof-quote {
          font-family: 'Fraunces', serif;
          font-size: 2.5rem; line-height: 0.8;
          color: var(--green-light);
          margin-bottom: 0.875rem;
        }
        .proof-text {
          font-size: 0.92rem; line-height: 1.7;
          color: var(--text-mid); font-weight: 300;
          margin-bottom: 1.25rem;
        }
        .proof-author {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .proof-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--green-pale);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .proof-name { font-size: 0.85rem; font-weight: 600; color: var(--text); }
        .proof-role { font-size: 0.75rem; color: var(--text-soft); font-weight: 400; }
        .proof-stars { color: #f59e0b; font-size: 0.8rem; margin-bottom: 0.5rem; }

        /* ─── CTA ─────────────────────────────────── */
        .cta-section {
          background: var(--green);
          padding: 7rem 6rem;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: '';
          position: absolute; top: -40%; left: -10%;
          width: 60%; height: 180%;
          background: radial-gradient(ellipse, rgba(116,198,157,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-section::after {
          content: '';
          position: absolute; bottom: -40%; right: -10%;
          width: 50%; height: 150%;
          background: radial-gradient(ellipse, rgba(244,162,97,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-label {
          font-size: 0.75rem; font-weight: 700;
          color: var(--green-light); text-transform: uppercase;
          letter-spacing: 1.5px; margin-bottom: 1rem;
        }
        .cta-heading {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          font-weight: 700; color: white;
          letter-spacing: -1px; line-height: 1.1;
          margin-bottom: 1.25rem; position: relative;
        }
        .cta-sub {
          font-size: 1.05rem; color: rgba(255,255,255,0.7);
          font-weight: 300; max-width: 480px;
          margin: 0 auto 2.5rem;
          line-height: 1.7;
        }
        .cta-buttons {
          display: flex; gap: 1rem; justify-content: center;
          flex-wrap: wrap; position: relative;
        }
        .btn-cta-white {
          padding: 0.9rem 2.5rem; border-radius: 99px;
          background: white; color: var(--green);
          border: none; font-family: 'DM Sans', sans-serif;
          font-size: 1rem; font-weight: 700; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          letter-spacing: 0.2px;
        }
        .btn-cta-white:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3);
        }
        .btn-cta-outline {
          padding: 0.9rem 2.5rem; border-radius: 99px;
          background: transparent; color: white;
          border: 2px solid rgba(255,255,255,0.35);
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none; display: inline-block;
        }
        .btn-cta-outline:hover {
          border-color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.08);
        }

        /* ─── FOOTER ─────────────────────────────── */
        .footer {
          background: #0a1a10;
          padding: 3rem 6rem;
          display: flex; align-items: center;
          justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
        }
        .footer-logo {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem; font-weight: 700;
          color: white;
        }
        .footer-copy {
          font-size: 0.82rem; color: rgba(255,255,255,0.35);
          font-weight: 400;
        }
        .footer-links {
          display: flex; gap: 1.5rem; list-style: none;
        }
        .footer-links a {
          font-size: 0.82rem; color: rgba(255,255,255,0.45);
          text-decoration: none; font-weight: 400;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--green-light); }

        /* ─── ANIMATIONS ─────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── MOBILE ──────────────────────────────── */
        @media (max-width: 900px) {
          .nav { padding: 1rem 1.5rem; }
          .nav.scrolled { padding: 0.75rem 1.5rem; }
          .nav-links { display: none; }
          .hero { grid-template-columns: 1fr; }
          .hero-left { padding: 7rem 2rem 3rem; }
          .hero-right { height: 340px; }
          .hero-card-float.card-2 { display: none; }
          .section, .features-section, .how-section, .cta-section, .proof-section { padding: 4rem 1.5rem; }
          .section-sm { padding: 2.5rem 1.5rem; }
          .stats-band { padding: 2.5rem 1.5rem; }
          .features-grid { grid-template-columns: 1fr; gap: 1rem; }
          .how-grid { grid-template-columns: 1fr; gap: 3rem; }
          .proof-cards { grid-template-columns: 1fr; }
          .footer { padding: 2rem 1.5rem; flex-direction: column; text-align: center; }
          .footer-links { justify-content: center; }
          .cta-section { padding: 4rem 1.5rem; }
        }
      `}</style>

      {/* ─── NAV ───────────────────────────────────────────── */}
      <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">🥗</div>
          <span className="nav-logo-name">VitalMenu</span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#cuisines">Cuisines</a></li>
        </ul>
        <div className="nav-cta">
          <a href="/auth" className="btn-ghost">Sign In</a>
          <a href="/auth" className="btn-primary">Get Started Free →</a>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="hero" ref={heroRef}>
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span>✨</span> AI-Powered Nutrition
          </div>
          <h1 className="hero-heading">
            Eat well.<br />
            <em>Built around</em><br />
            your goals.
          </h1>
          <p className="hero-sub">
            VitalMenu generates a precise 7-day meal plan that hits your exact calorie and macro targets — chosen from 600+ real recipes across 11 cuisines, personalised to your body and lifestyle.
          </p>
          <div className="hero-buttons">
            <a href="/auth" className="btn-hero">Start for free →</a>
            <a href="#how" className="btn-hero-outline">See how it works</a>
          </div>
          <div className="hero-stats">
            {stats.map(s => (
              <div key={s.label}>
                <span className="hero-stat-val">{s.val}</span>
                <span className="hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-right">
          <img
            className="hero-img"
            src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80&auto=format&fit=crop"
            alt="Healthy food spread"
          />
          <div className="hero-img-overlay" />

          {/* Floating card 1 — meal example */}
          <div className="hero-card-float card-1">
            <div className="float-label">Tuesday · Lunch</div>
            <div className="float-meal">Tandoori Chicken Bowl</div>
            <div className="float-macros">
              <span className="float-macro cal">420 cal</span>
              <span className="float-macro pro">P 38g</span>
              <span className="float-macro carb">C 32g</span>
              <span className="float-macro fat">F 12g</span>
            </div>
            <div className="float-progress">
              <div className="float-progress-bar">
                <div className="float-progress-fill" style={{width: '74%'}} />
              </div>
              <div className="float-progress-label">74% of daily protein hit</div>
            </div>
          </div>

          {/* Floating card 2 — macro summary */}
          <div className="hero-card-float card-2">
            <div className="float-label">Daily Targets</div>
            <div className="float-macros" style={{flexDirection:'column', gap:'0.4rem'}}>
              {[['Calories', '2,140', '#fef3c7', '#b45309'],['Protein','168g','#dbeafe','#1d4ed8'],['Carbs','220g','#d8f3dc','#166534'],['Fat','68g','#fce7f3','#be185d']].map(([k,v,bg,fg]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:bg,borderRadius:8,padding:'0.3rem 0.625rem'}}>
                  <span style={{fontSize:'0.75rem',fontWeight:600,color:fg}}>{k}</span>
                  <span style={{fontSize:'0.75rem',fontWeight:700,color:fg}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAND ────────────────────────────────────── */}
      <div className="stats-band">
        {[
          { val: '600+', label: 'Handpicked recipes' },
          { val: '11', label: 'World cuisines' },
          { val: '±10%', label: 'Macro accuracy' },
          { val: '7', label: 'Days per plan' },
          { val: '< 30s', label: 'Time to generate' },
        ].map(s => (
          <div key={s.label} className="stats-band-item">
            <span className="stats-band-val">{s.val}</span>
            <span className="stats-band-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ─── FEATURES ──────────────────────────────────────── */}
      <section className="features-section" id="features">
        <div className="features-header">
          <div className="section-label">What VitalMenu does</div>
          <h2 className="section-heading">Everything your nutrition<br />plan needs. Nothing it doesn't.</h2>
          <p className="section-sub">
            From macro calculation to shopping list export — every feature is purpose-built for one goal: making it easy to eat exactly right.
          </p>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" style={{background: f.color}}>
                {f.icon}
              </div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
              <div className="feature-detail" style={{color: f.accent}}>{f.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CUISINES MARQUEE ──────────────────────────────── */}
      <section className="cuisines-section" id="cuisines">
        <div style={{padding:'0 6rem 2rem', maxWidth:'100%'}}>
          <div className="section-label">11 World Cuisines</div>
          <h2 className="section-heading" style={{maxWidth:480}}>Your favourites.<br />Every week.</h2>
        </div>
        <div style={{overflow:'hidden', padding:'0.5rem 0'}}>
          <div className="cuisines-track">
            {[...cuisines, ...cuisines].map((c, i) => (
              <div key={i} className="cuisine-pill">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────── */}
      <section className="how-section" id="how">
        <div className="section-label">Simple by design</div>
        <h2 className="section-heading">Your plan in 4 steps</h2>
        <div className="how-grid">
          <div className="how-steps">
            {steps.map(s => (
              <div key={s.n} className="how-step">
                <div className="how-step-num">{s.n}</div>
                <div className="how-step-content">
                  <div className="how-step-title">{s.title}</div>
                  <div className="how-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="how-visual">
            <div className="how-screen">
              <div className="how-screen-bar">
                <div className="how-screen-dot" />
                <div className="how-screen-dot" />
                <div className="how-screen-dot" />
                <span className="how-screen-title">Your 7-Day Meal Plan</span>
              </div>
              <div className="how-screen-body">
                {[
                  { day: 'Monday', meals: [
                    { icon:'🌅', name:'Greek Yoghurt Bowl', cal:380, p:28, c:42, f:10 },
                    { icon:'☀️', name:'Chicken Tikka Masala', cal:420, p:38, c:32, f:12 },
                    { icon:'🍎', name:'Mixed Nuts & Fruit', cal:210, p:6, c:18, f:14 },
                    { icon:'🌙', name:'Salmon Teriyaki', cal:490, p:44, c:28, f:18 },
                  ]},
                  { day: 'Tuesday', meals: [
                    { icon:'🌅', name:'Avocado Toast & Eggs', cal:410, p:22, c:38, f:20 },
                    { icon:'☀️', name:'Thai Basil Beef', cal:440, p:36, c:30, f:16 },
                  ]}
                ].map(day => (
                  <div key={day.day} className="mock-day">
                    <div className="mock-day-label">{day.day}</div>
                    <div className="mock-meals">
                      {day.meals.map((m, i) => (
                        <div key={i} className="mock-meal">
                          <div className="mock-meal-left">
                            <span className="mock-meal-icon">{m.icon}</span>
                            <span className="mock-meal-name">{m.name}</span>
                          </div>
                          <div className="mock-macros">
                            <span className="mock-macro" style={{background:'#fef3c7',color:'#b45309'}}>{m.cal}</span>
                            <span className="mock-macro" style={{background:'#dbeafe',color:'#1d4ed8'}}>P{m.p}</span>
                            <span className="mock-macro" style={{background:'#d8f3dc',color:'#166534'}}>C{m.c}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ──────────────────────────────────── */}
      <section className="proof-section">
        <div className="section-label">Early users</div>
        <h2 className="section-heading">Real results,<br />real people.</h2>
        <div className="proof-cards">
          {[
            { q: "VitalMenu gave me a week of Indian and Mediterranean meals that actually hit my protein target. The swap feature is genuinely useful.", name: "Priya S.", role: "Muscle gain goal", avatar: "🏋️" },
            { q: "Finally a nutrition app that doesn't just show me calories. Having macros, a shopping list and recipes all in one place makes actually sticking to the plan so much easier.", name: "James R.", role: "Weight loss goal", avatar: "🏃" },
            { q: "I set Vegan + Japanese + Thai and it found me 7 days of actually exciting meals I'd never have come up with myself. The shopping list export alone saves me 20 minutes every week.", name: "Yuki T.", role: "Maintenance goal", avatar: "🧘" },
          ].map((p, i) => (
            <div key={i} className="proof-card">
              <div className="proof-stars">★★★★★</div>
              <div className="proof-quote">"</div>
              <p className="proof-text">{p.q}</p>
              <div className="proof-author">
                <div className="proof-avatar">{p.avatar}</div>
                <div>
                  <div className="proof-name">{p.name}</div>
                  <div className="proof-role">{p.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-label">Free to start</div>
        <h2 className="cta-heading">
          Your personalised<br />meal plan is waiting.
        </h2>
        <p className="cta-sub">
          Sign up in 30 seconds. No credit card. No calorie counting. Just a precise, AI-built plan that works for your body and your goals.
        </p>
        <div className="cta-buttons">
          <a href="/auth" className="btn-cta-white">Create my free plan →</a>
          <a href="/auth" className="btn-cta-outline">Sign In</a>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-logo">🥗 VitalMenu</div>
        <ul className="footer-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="/auth">Sign In</a></li>
          <li><a href="/auth">Sign Up</a></li>
        </ul>
        <div className="footer-copy">© 2026 VitalMenu. Built with AI.</div>
      </footer>
    </>
  );
}
