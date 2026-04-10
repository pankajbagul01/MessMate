import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultPreferences, setDefaultPreferences, getWeeklyMenu } from '../../services/api';
import './DefaultPreferences.css';

const MEALS      = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MEAL_TIMES = { breakfast: '7:00 – 9:00 AM', lunch: '12:00 – 2:00 PM', dinner: '7:00 – 9:00 PM' };
const DAYS       = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

/*
  HOW DEFAULTS WORK
  -----------------
  The Default doc stores { meals: { breakfast: { enabled, items }, lunch: ..., dinner: ... } }
  
  "items" here means the specific items the student wants auto-booked.
  At midnight, the cron checks:
    - Is this meal enabled?
    - Does the MealConfig for tomorrow exist?
    - If yes → book using the stored items.
  
  So the student needs to pick WHICH ITEMS they want for each meal.
  Since items vary by day (weekly menu), we let them browse the weekly menu
  and build their preference list from it. The saved items are just a
  default selection — the cron will use them as-is.
  
  If no weekly menu exists yet, they can still enable meals (items will be
  empty and the cron will skip those), or they can type custom item names.
*/

const DefaultPreferences = () => {
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [weeklyMenu, setWeeklyMenu] = useState({});   // { monday: { breakfast:[], lunch:[], dinner:[] }, ... }
  const [previewDay, setPreviewDay] = useState('monday');
  const [prefs, setPrefs]           = useState({
    breakfast: { enabled: false, items: [] },
    lunch:     { enabled: false, items: [] },
    dinner:    { enabled: false, items: [] },
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [menuRes, prefRes] = await Promise.allSettled([
        getWeeklyMenu(),
        getDefaultPreferences(),
      ]);

      // build weekly menu map
      if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value.data)) {
        const map = {};
        menuRes.value.data.forEach(d => { map[d.dayOfWeek] = d.meals; });
        setWeeklyMenu(map);
        // default preview to today's day
        const todayDay = DAYS[((new Date().getDay() + 6) % 7)]; // getDay() is 0=Sun, shift to Mon=0
        if (map[todayDay]) setPreviewDay(todayDay);
      }

      // load existing preferences
      if (prefRes.status === 'fulfilled' && prefRes.value.data?.meals) {
        const m = prefRes.value.data.meals;
        setPrefs({
          breakfast: { enabled: m.breakfast?.enabled || false, items: m.breakfast?.items || [] },
          lunch:     { enabled: m.lunch?.enabled     || false, items: m.lunch?.items     || [] },
          dinner:    { enabled: m.dinner?.enabled    || false, items: m.dinner?.items    || [] },
        });
        setHasExisting(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  // ── toggle a meal on/off ──
  const toggleMeal = (meal) => {
    setPrefs(p => ({ ...p, [meal]: { ...p[meal], enabled: !p[meal].enabled } }));
  };

  // ── toggle an item in a meal's selection ──
  const toggleItem = (meal, item) => {
    setPrefs(p => {
      const exists = p[meal].items.find(i => i.name === item.name);
      const items  = exists
        ? p[meal].items.filter(i => i.name !== item.name)
        : [...p[meal].items, { name: item.name, quantity: item.hasQuantity ? 1 : null }];
      return { ...p, [meal]: { ...p[meal], items } };
    });
  };

  // ── change quantity of a selected item ──
  const changeQty = (meal, itemName, delta, max) => {
    setPrefs(p => ({
      ...p,
      [meal]: {
        ...p[meal],
        items: p[meal].items.map(i =>
          i.name === itemName
            ? { ...i, quantity: Math.min(max, Math.max(1, (i.quantity || 1) + delta)) }
            : i
        )
      }
    }));
  };

  // ── use all items from a day's menu as the preference ──
  const useWholeDay = (day) => {
    const dayMenu = weeklyMenu[day];
    if (!dayMenu) return;
    const next = { ...prefs };
    MEALS.forEach(meal => {
      const items = (dayMenu[meal] || []).map(it => ({
        name: it.name,
        quantity: it.hasQuantity ? 1 : null,
      }));
      if (items.length > 0) {
        next[meal] = { enabled: true, items };
      }
    });
    setPrefs(next);
    showMsg('success', `Loaded all items from ${day.charAt(0).toUpperCase()+day.slice(1)}'s menu`);
  };

  // ── clear one meal ──
  const clearMeal = (meal) => {
    setPrefs(p => ({ ...p, [meal]: { enabled: false, items: [] } }));
  };

  const handleSave = async () => {
    const anyEnabled = MEALS.some(m => prefs[m].enabled);
    if (!anyEnabled) {
      showMsg('error', 'Enable at least one meal to set up auto-booking.');
      return;
    }
    setSaving(true);
    try {
      await setDefaultPreferences({ meals: prefs });
      showMsg('success', 'Preferences saved! Auto-booking will apply these every night at midnight.');
      setHasExisting(true);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── derived ──
  const previewMenu = weeklyMenu[previewDay] || null;
  const enabledCount = MEALS.filter(m => prefs[m].enabled).length;
  const todayDayIndex = (new Date().getDay() + 6) % 7; // Mon=0

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading preferences...</p>
    </div>
  );

  return (
    <div className="dp-container">

      {/* Header */}
      <div className="dp-header">
        <button className="dp-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="dp-title-row">
          <div>
            <h1>Default Preferences</h1>
            <p>Choose which meals to auto-book every day. The cron runs at midnight and books tomorrow's meals for you.</p>
          </div>
          {hasExisting && (
            <span className="dp-active-badge">⚡ Auto-booking active</span>
          )}
        </div>
      </div>

      {/* Alert */}
      {msg.text && (
        <div className={`dp-alert dp-alert-${msg.type}`}>{msg.text}</div>
      )}

      {/* How it works banner */}
      <div className="dp-info-banner">
        <div className="dp-info-item">
          <span className="dp-info-icon">🕛</span>
          <div>
            <strong>Runs at midnight</strong>
            <span>Auto-booking fires every night for next day's meals</span>
          </div>
        </div>
        <div className="dp-info-item">
          <span className="dp-info-icon">✋</span>
          <div>
            <strong>Manual overrides</strong>
            <span>If you book manually, auto-booking skips that meal</span>
          </div>
        </div>
        <div className="dp-info-item">
          <span className="dp-info-icon">📋</span>
          <div>
            <strong>Uses your items</strong>
            <span>Saved items below are what gets booked each day</span>
          </div>
        </div>
      </div>

      <div className="dp-layout">

        {/* LEFT: Meal preferences */}
        <div className="dp-left">
          <div className="dp-section-label">
            Your auto-booking preferences
            <span className="dp-count">{enabledCount}/3 meals enabled</span>
          </div>

          {MEALS.map(meal => {
            const p = prefs[meal];
            return (
              <div key={meal} className={`dp-meal-card ${p.enabled ? 'dp-meal-on' : ''}`}>
                {/* Meal header */}
                <div className="dp-meal-header">
                  <div className="dp-meal-left">
                    <span className="dp-meal-emoji">{MEAL_ICONS[meal]}</span>
                    <div>
                      <span className="dp-meal-name">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                      <span className="dp-meal-time">{MEAL_TIMES[meal]}</span>
                    </div>
                  </div>
                  <div className="dp-meal-right">
                    {p.enabled && p.items.length > 0 && (
                      <button className="dp-clear-btn" onClick={() => clearMeal(meal)}>Clear</button>
                    )}
                    {/* Toggle */}
                    <label className="dp-toggle">
                      <input type="checkbox" checked={p.enabled} onChange={() => toggleMeal(meal)} />
                      <span className="dp-toggle-track"><span className="dp-toggle-thumb" /></span>
                      <span className="dp-toggle-label">{p.enabled ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                </div>

                {/* Items panel */}
                {p.enabled && (
                  <div className="dp-items-panel">
                    {/* Selected items */}
                    {p.items.length > 0 ? (
                      <div className="dp-selected-items">
                        <span className="dp-panel-label">Will be booked daily:</span>
                        <div className="dp-chips-row">
                          {p.items.map((item, i) => {
                            // find config to know if it has qty
                            const menuItem = Object.values(weeklyMenu)
                              .flatMap(d => d[meal] || [])
                              .find(it => it.name === item.name);
                            const hasQty = menuItem?.hasQuantity;
                            const maxQty = menuItem?.maxQuantity || 10;
                            return (
                              <div key={i} className="dp-item-chip">
                                <span className="dp-chip-name">{item.name}</span>
                                {hasQty && (
                                  <div className="dp-chip-qty">
                                    <button onClick={() => changeQty(meal, item.name, -1, maxQty)}>−</button>
                                    <span>{item.quantity || 1}</span>
                                    <button onClick={() => changeQty(meal, item.name, +1, maxQty)}>+</button>
                                  </div>
                                )}
                                <button className="dp-chip-remove" onClick={() => toggleItem(meal, { name: item.name })}>×</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="dp-empty-items">
                        <span>No items selected yet.</span>
                        <span className="dp-empty-hint">Browse the weekly menu on the right and tap items to add them →</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Save button */}
          <div className="dp-save-row">
            <button
              className="dp-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : hasExisting ? 'Update Preferences' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* RIGHT: Weekly menu browser */}
        <div className="dp-right">
          <div className="dp-section-label">
            Browse weekly menu
            <span className="dp-count">tap items to add</span>
          </div>

          {/* Day tabs */}
          <div className="dp-day-tabs">
            {DAYS.map((day, i) => (
              <button
                key={day}
                className={`dp-day-tab ${previewDay === day ? 'active' : ''} ${i === todayDayIndex ? 'today' : ''}`}
                onClick={() => setPreviewDay(day)}
              >
                {DAY_LABELS[day]}
                {weeklyMenu[day] && <span className="dp-has-menu" />}
              </button>
            ))}
          </div>

          {/* Use whole day button */}
          {previewMenu && (
            <button className="dp-use-day-btn" onClick={() => useWholeDay(previewDay)}>
              ↓ Use all of {previewDay.charAt(0).toUpperCase()+previewDay.slice(1)}'s items
            </button>
          )}

          {/* Menu content */}
          {previewMenu ? (
            <div className="dp-menu-sections">
              {MEALS.map(meal => {
                const items = previewMenu[meal] || [];
                return (
                  <div key={meal} className="dp-menu-meal">
                    <div className="dp-menu-meal-header">
                      <span>{MEAL_ICONS[meal]}</span>
                      <span className="dp-menu-meal-name">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="dp-no-items">No items configured</p>
                    ) : (
                      <div className="dp-menu-items-list">
                        {items.map((item, idx) => {
                          const selected = prefs[meal].enabled && prefs[meal].items.find(i => i.name === item.name);
                          return (
                            <div
                              key={idx}
                              className={`dp-menu-item ${selected ? 'dp-menu-item-selected' : ''} ${!prefs[meal].enabled ? 'dp-menu-item-disabled' : ''}`}
                              onClick={() => {
                                if (!prefs[meal].enabled) {
                                  // auto-enable the meal when tapping an item
                                  setPrefs(p => ({
                                    ...p,
                                    [meal]: { ...p[meal], enabled: true }
                                  }));
                                }
                                toggleItem(meal, item);
                              }}
                            >
                              <div className="dp-menu-item-left">
                                <span className={`dp-menu-item-dot ${selected ? 'selected' : ''}`} />
                                <span className="dp-menu-item-name">{item.name}</span>
                              </div>
                              <div className="dp-menu-item-right">
                                {item.hasQuantity && (
                                  <span className="dp-menu-item-max">max {item.maxQuantity}</span>
                                )}
                                <span className="dp-menu-item-action">{selected ? '✓ Added' : '+ Add'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dp-no-menu">
              <span>🍽️</span>
              <p>No menu configured for {previewDay.charAt(0).toUpperCase()+previewDay.slice(1)} yet.</p>
              <p className="dp-no-menu-hint">Ask your admin to set up the weekly menu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefaultPreferences;