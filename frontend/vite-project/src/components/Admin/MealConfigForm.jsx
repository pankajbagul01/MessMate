import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllMealConfigs, getMealConfigByDate,
  updateMealConfig, deleteMealConfig, getWeeklyMenu
} from '../../services/api';
import './MealConfigForm.css';

const MEALS      = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MEAL_COLORS= { breakfast: 'mc-b', lunch: 'mc-l', dinner: 'mc-d' };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDate = (s) => {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short', year:'numeric' });
};

const MealConfigForm = () => {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);

  // ── state ──
  const [selDate,      setSelDate]      = useState(todayStr());
  const [activeMeal,   setActiveMeal]   = useState('breakfast');
  const [draft,        setDraft]        = useState({ breakfast:[], lunch:[], dinner:[] });
  const [existingDates, setExistingDates] = useState([]); // dates that have overrides
  const [weeklyMenu,   setWeeklyMenu]   = useState({});   // { monday: { ... } }
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [hasExisting,  setHasExisting]  = useState(false);
  const [msg,          setMsg]          = useState({ type:'', text:'' });

  // add-item form
  const [newItem,   setNewItem]   = useState({ name:'', hasQuantity:false, maxQuantity:'' });
  const [addError,  setAddError]  = useState('');

  useEffect(() => { fetchInitial(); }, []);
  useEffect(() => { loadDateConfig(); }, [selDate]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [configsRes, menuRes] = await Promise.allSettled([
        getAllMealConfigs(),
        getWeeklyMenu(),
      ]);
      if (configsRes.status === 'fulfilled') {
        setExistingDates((configsRes.value.data || []).map(c => c.date));
      }
      if (menuRes.status === 'fulfilled') {
        const map = {};
        (menuRes.value.data || []).forEach(d => { map[d.dayOfWeek] = d.meals; });
        setWeeklyMenu(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDateConfig = async () => {
    try {
      const res = await getMealConfigByDate(selDate);
      setDraft(res.data.meals || { breakfast:[], lunch:[], dinner:[] });
      setHasExisting(true);
    } catch {
      // 404 = no override for this date, start fresh
      setDraft({ breakfast:[], lunch:[], dinner:[] });
      setHasExisting(false);
    }
  };

  // ── item helpers ──
  const deepCopy = (o) => JSON.parse(JSON.stringify(o));

  const handleAddItem = (e) => {
    e.preventDefault();
    const name = newItem.name.trim();
    if (!name) { setAddError('Item name is required'); return; }
    if (draft[activeMeal].find(i => i.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Item already exists in this meal'); return;
    }
    if (newItem.hasQuantity && (!newItem.maxQuantity || +newItem.maxQuantity < 1)) {
      setAddError('Enter a valid max quantity'); return;
    }
    setDraft(prev => ({
      ...prev,
      [activeMeal]: [...prev[activeMeal], {
        name,
        hasQuantity: newItem.hasQuantity,
        maxQuantity: newItem.hasQuantity ? +newItem.maxQuantity : null,
      }]
    }));
    setNewItem({ name:'', hasQuantity:false, maxQuantity:'' });
    setAddError('');
    inputRef.current?.focus();
  };

  const removeItem = (meal, idx) => {
    setDraft(prev => ({ ...prev, [meal]: prev[meal].filter((_,i) => i !== idx) }));
  };

  const moveItem = (meal, idx, dir) => {
    setDraft(prev => {
      const arr = [...prev[meal]];
      const to  = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...prev, [meal]: arr };
    });
  };

  // ── copy weekly menu for this date's weekday into draft ──
  const copyFromWeekly = () => {
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const [y,m,d]  = selDate.split('-').map(Number);
    const dayName  = dayNames[new Date(y,m-1,d).getDay()];
    const dayMenu  = weeklyMenu[dayName];
    if (!dayMenu) { showMsg('error', `No weekly menu set for ${dayName}`); return; }
    setDraft(deepCopy(dayMenu));
    showMsg('success', `Loaded ${dayName}'s weekly menu — edit then save`);
  };

  // ── save ──
  const handleSave = async () => {
    const total = MEALS.reduce((s,m) => s + draft[m].length, 0);
    if (total === 0) { showMsg('error', 'Add at least one item before saving'); return; }
    setSaving(true);
    try {
      await updateMealConfig(selDate, { meals: draft });
      showMsg('success', `Override saved for ${fmtDate(selDate)}`);
      setHasExisting(true);
      if (!existingDates.includes(selDate)) {
        setExistingDates(prev => [...prev, selDate].sort());
      }
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  // ── delete override ──
  const handleDelete = async () => {
    if (!window.confirm(`Delete the override for ${fmtDate(selDate)}? The weekly menu will be used instead.`)) return;
    setDeleting(true);
    try {
      await deleteMealConfig(selDate);
      showMsg('success', 'Override deleted — weekly menu will be used');
      setDraft({ breakfast:[], lunch:[], dinner:[] });
      setHasExisting(false);
      setExistingDates(prev => prev.filter(d => d !== selDate));
    } catch (e) {
      showMsg('error', 'Delete failed');
    } finally { setDeleting(false); }
  };

  const totalItems = MEALS.reduce((s,m) => s + draft[m].length, 0);
  const upcomingOverrides = existingDates.filter(d => d >= todayStr()).sort();

  if (loading) return (
    <div className="loading-container"><div className="spinner"/><p>Loading...</p></div>
  );

  return (
    <div className="mc-container">

      {/* Header */}
      <div className="mc-header">
        <div>
          <button className="mc-back" onClick={() => navigate('/admin')}>← Dashboard</button>
          <h1>Date-Specific Menu Override</h1>
          <p>Override the weekly menu for a specific date — holidays, special events, or any one-off day.</p>
        </div>
      </div>

      {/* Alert */}
      {msg.text && <div className={`mc-alert mc-alert-${msg.type}`}>{msg.text}</div>}

      <div className="mc-layout">

        {/* LEFT: Existing overrides sidebar */}
        <div className="mc-sidebar">
          <div className="mc-sidebar-label">Existing overrides</div>
          {upcomingOverrides.length === 0 ? (
            <p className="mc-no-overrides">No upcoming overrides</p>
          ) : (
            upcomingOverrides.map(d => (
              <button
                key={d}
                className={`mc-date-row ${selDate === d ? 'active' : ''}`}
                onClick={() => setSelDate(d)}
              >
                <div className="mc-date-row-left">
                  <span className="mc-date-row-date">{fmtDate(d)}</span>
                  {d === todayStr() && <span className="mc-today-dot" />}
                </div>
                <span className="mc-override-badge">Override</span>
              </button>
            ))
          )}

          <div className="mc-sidebar-label" style={{marginTop:20}}>How overrides work</div>
          <div className="mc-how-it-works">
            <div className="mc-how-row">
              <span>1.</span>
              <span>Pick a date and build a custom menu</span>
            </div>
            <div className="mc-how-row">
              <span>2.</span>
              <span>Save — this overrides the weekly menu for that day only</span>
            </div>
            <div className="mc-how-row">
              <span>3.</span>
              <span>Students book from this custom menu instead</span>
            </div>
            <div className="mc-how-row">
              <span>4.</span>
              <span>Delete the override to revert to the weekly menu</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Editor */}
        <div className="mc-editor">

          {/* Date picker row */}
          <div className="mc-date-bar">
            <div className="mc-date-bar-left">
              <label>Date</label>
              <input
                type="date"
                value={selDate}
                onChange={e => setSelDate(e.target.value)}
                min={todayStr()}
              />
              <span className="mc-date-label">{fmtDate(selDate)}</span>
            </div>
            <div className="mc-date-bar-right">
              {hasExisting
                ? <span className="mc-status-badge override">Custom override active</span>
                : <span className="mc-status-badge weekly">Using weekly menu</span>
              }
            </div>
          </div>

          {/* Actions row */}
          <div className="mc-actions-row">
            <button className="mc-btn-outline" onClick={copyFromWeekly}>
              ↓ Load from weekly menu
            </button>
            {hasExisting && (
              <button className="mc-btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? '...' : 'Delete override'}
              </button>
            )}
            <button
              className="mc-btn-save"
              disabled={saving || totalItems === 0}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : hasExisting ? 'Update override' : 'Save as override'}
            </button>
          </div>

          {/* Meal tabs */}
          <div className="mc-meal-tabs">
            {MEALS.map(meal => (
              <button
                key={meal}
                className={`mc-meal-tab ${activeMeal === meal ? 'active' : ''} ${MEAL_COLORS[meal]}`}
                onClick={() => setActiveMeal(meal)}
              >
                {MEAL_ICONS[meal]}
                <span>{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                <span className="mc-meal-count">{draft[meal].length}</span>
              </button>
            ))}
          </div>

          {/* Items list */}
          <div className="mc-items-section">
            {draft[activeMeal].length === 0 ? (
              <div className="mc-empty-meal">
                <span>{MEAL_ICONS[activeMeal]}</span>
                <p>No items for {activeMeal} yet.</p>
                <p className="mc-empty-hint">Add items below, or load from the weekly menu.</p>
              </div>
            ) : (
              <div className="mc-items-list">
                {draft[activeMeal].map((item, idx) => (
                  <div key={idx} className="mc-item-row">
                    <div className="mc-item-reorder">
                      <button onClick={() => moveItem(activeMeal, idx, -1)} disabled={idx === 0}>↑</button>
                      <button onClick={() => moveItem(activeMeal, idx, +1)} disabled={idx === draft[activeMeal].length-1}>↓</button>
                    </div>
                    <span className="mc-item-num">{idx+1}</span>
                    <span className="mc-item-name">{item.name}</span>
                    {item.hasQuantity
                      ? <span className="mc-item-qty-badge">max {item.maxQuantity}</span>
                      : <span className="mc-item-unlimited">unlimited</span>
                    }
                    <button className="mc-item-remove" onClick={() => removeItem(activeMeal, idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add item form */}
          <form className="mc-add-form" onSubmit={handleAddItem}>
            <div className="mc-add-form-label">Add item to {activeMeal}</div>
            <div className="mc-add-row">
              <input
                ref={inputRef}
                type="text"
                placeholder={`e.g. ${activeMeal==='breakfast'?'Poha, Tea, Idli':activeMeal==='lunch'?'Dal, Rice, Sabzi':'Khichdi, Roti, Salad'}`}
                value={newItem.name}
                onChange={e => { setNewItem(p=>({...p, name:e.target.value})); setAddError(''); }}
                className="mc-name-input"
              />
              <label className="mc-qty-toggle">
                <input
                  type="checkbox"
                  checked={newItem.hasQuantity}
                  onChange={e => setNewItem(p=>({...p, hasQuantity:e.target.checked, maxQuantity:''}))}
                />
                <span className="mc-qty-track"><span className="mc-qty-thumb"/></span>
                Limit qty
              </label>
              {newItem.hasQuantity && (
                <input
                  type="number" placeholder="Max" min="1"
                  value={newItem.maxQuantity}
                  onChange={e => setNewItem(p=>({...p, maxQuantity:e.target.value}))}
                  className="mc-max-input"
                />
              )}
              <button type="submit" className="mc-add-btn">+ Add</button>
            </div>
            {addError && <p className="mc-add-error">{addError}</p>}
          </form>

          {/* Full day preview */}
          <div className="mc-preview">
            <div className="mc-preview-label">Full day preview — {fmtDate(selDate)}</div>
            <div className="mc-preview-grid">
              {MEALS.map(meal => (
                <div key={meal} className={`mc-preview-col ${MEAL_COLORS[meal]}`}>
                  <div className="mc-preview-col-header">
                    {MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}
                    <span className="mc-preview-count">{draft[meal].length}</span>
                  </div>
                  {draft[meal].length === 0
                    ? <p className="mc-preview-empty">No items</p>
                    : draft[meal].map((item, i) => (
                      <div key={i} className="mc-preview-item">
                        <span>{item.name}</span>
                        {item.hasQuantity && <span className="mc-preview-max">×{item.maxQuantity}</span>}
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MealConfigForm;