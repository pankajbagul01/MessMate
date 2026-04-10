import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeklyMenu, createWeeklyMenu, deleteWeeklyMenu } from '../../services/api';
import './WeeklyMenuConfig.css';

const DAYS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };
const DAY_SHORT  = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const MEALS      = ['breakfast','lunch','dinner'];
const MEAL_ICONS = { breakfast:'🥐', lunch:'🍛', dinner:'🍽️' };
const MEAL_COLORS= { breakfast:'meal-b', lunch:'meal-l', dinner:'meal-d' };

// Today's day name
const todayDayName = () => {
  const idx = (new Date().getDay() + 6) % 7; // Mon=0
  return DAYS[idx];
};

const WeeklyMenuConfig = () => {
  const navigate   = useNavigate();
  const inputRef   = useRef(null);

  const [menuMap, setMenuMap]     = useState({});   // { monday: { breakfast:[], lunch:[], dinner:[] }, ... }
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(null);  // day being saved
  const [deleting, setDeleting]   = useState(null);  // day being deleted
  const [msg, setMsg]             = useState({ type:'', text:'' });

  // Editor state
  const [activeDay,  setActiveDay]  = useState(todayDayName());
  const [activeMeal, setActiveMeal] = useState('breakfast');

  // Working copy for the active day (edits live here before save)
  const [draft, setDraft] = useState({ breakfast:[], lunch:[], dinner:[] });

  // New item form
  const [newItem, setNewItem] = useState({ name:'', hasQuantity:false, maxQuantity:'' });
  const [addError, setAddError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  // Sync draft when switching days
  useEffect(() => {
    setDraft(deepCopy(menuMap[activeDay] || { breakfast:[], lunch:[], dinner:[] }));
    setActiveMeal('breakfast');
    setNewItem({ name:'', hasQuantity:false, maxQuantity:'' });
    setAddError('');
  }, [activeDay, menuMap]);

  const deepCopy = (o) => JSON.parse(JSON.stringify(o));

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await getWeeklyMenu();
      const map = {};
      (res.data || []).forEach(d => { map[d.dayOfWeek] = d.meals; });
      setMenuMap(map);
    } catch (e) {
      showMsg('error', 'Failed to load menus.');
    } finally {
      setLoading(false);
    }
  };

  // ── Add item to draft ──
  const handleAddItem = (e) => {
    e.preventDefault();
    const name = newItem.name.trim();
    if (!name) { setAddError('Item name is required'); return; }
    if (draft[activeMeal].find(i => i.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Item already exists in this meal');
      return;
    }
    if (newItem.hasQuantity && (!newItem.maxQuantity || +newItem.maxQuantity < 1)) {
      setAddError('Enter a valid max quantity');
      return;
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

  // ── Copy another day's menu into draft ──
  const copyFrom = (sourceDay) => {
    if (!menuMap[sourceDay]) { showMsg('error', `No saved menu for ${DAY_LABELS[sourceDay]}`); return; }
    setDraft(deepCopy(menuMap[sourceDay]));
    showMsg('success', `Copied from ${DAY_LABELS[sourceDay]} — click Save to apply`);
  };

  // ── Save active day ──
  const handleSave = async () => {
    const totalItems = MEALS.reduce((s,m) => s + draft[m].length, 0);
    if (totalItems === 0) { showMsg('error', 'Add at least one item before saving'); return; }
    setSaving(activeDay);
    try {
      await createWeeklyMenu({ dayOfWeek: activeDay, meals: draft });
      setMenuMap(prev => ({ ...prev, [activeDay]: deepCopy(draft) }));
      showMsg('success', `${DAY_LABELS[activeDay]}'s menu saved!`);
    } catch (e) {
      showMsg('error', e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  // ── Delete a day's menu ──
  const handleDelete = async (day) => {
    if (!window.confirm(`Delete ${DAY_LABELS[day]}'s menu? Students with defaults pointing to these items will be affected.`)) return;
    setDeleting(day);
    try {
      await deleteWeeklyMenu(day);
      setMenuMap(prev => { const n = {...prev}; delete n[day]; return n; });
      if (day === activeDay) setDraft({ breakfast:[], lunch:[], dinner:[] });
      showMsg('success', `${DAY_LABELS[day]}'s menu deleted`);
    } catch (e) {
      showMsg('error', 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Derived ──
  const isDirty = JSON.stringify(draft) !== JSON.stringify(menuMap[activeDay] || { breakfast:[], lunch:[], dinner:[] });
  const totalDraftItems = MEALS.reduce((s,m) => s + draft[m].length, 0);
  const configuredCount = DAYS.filter(d => menuMap[d] && MEALS.some(m => menuMap[d][m]?.length > 0)).length;

  if (loading) return (
    <div className="loading-container"><div className="spinner"/><p>Loading weekly menus...</p></div>
  );

  return (
    <div className="wm-container">

      {/* Header */}
      <div className="wm-header">
        <div>
          <button className="wm-back" onClick={() => navigate('/admin')}>← Dashboard</button>
          <h1>Weekly Menu</h1>
          <p>Configure the default menu for each day. Students will book from these items.</p>
        </div>
        <div className="wm-header-meta">
          <span className="wm-progress">
            <span className="wm-progress-bar" style={{ width: `${(configuredCount/7)*100}%` }} />
          </span>
          <span className="wm-progress-label">{configuredCount}/7 days configured</span>
        </div>
      </div>

      {/* Alert */}
      {msg.text && <div className={`wm-alert wm-alert-${msg.type}`}>{msg.text}</div>}

      <div className="wm-layout">

        {/* LEFT: Day selector */}
        <div className="wm-days-panel">
          <div className="wm-panel-label">Days of week</div>
          {DAYS.map(day => {
            const saved   = menuMap[day];
            const isToday = day === todayDayName();
            const itemCount = saved ? MEALS.reduce((s,m) => s + (saved[m]?.length||0), 0) : 0;
            return (
              <div
                key={day}
                className={`wm-day-row ${activeDay === day ? 'active' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setActiveDay(day)}
              >
                <div className="wm-day-row-left">
                  <span className="wm-day-name">{DAY_LABELS[day]}</span>
                  {isToday && <span className="wm-today-dot" />}
                </div>
                <div className="wm-day-row-right">
                  {saved ? (
                    <span className="wm-day-configured">{itemCount} items</span>
                  ) : (
                    <span className="wm-day-empty">Not set</span>
                  )}
                  {activeDay === day && isDirty && (
                    <span className="wm-unsaved-dot" title="Unsaved changes" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Editor */}
        <div className="wm-editor">

          {/* Editor header */}
          <div className="wm-editor-header">
            <div>
              <h2>{DAY_LABELS[activeDay]}</h2>
              <span className="wm-item-count">{totalDraftItems} items total</span>
              {isDirty && <span className="wm-dirty-badge">Unsaved changes</span>}
            </div>
            <div className="wm-editor-actions">
              {/* Copy from dropdown */}
              <div className="wm-copy-wrap">
                <select
                  className="wm-copy-select"
                  defaultValue=""
                  onChange={e => { if (e.target.value) { copyFrom(e.target.value); e.target.value=''; } }}
                >
                  <option value="" disabled>Copy from day…</option>
                  {DAYS.filter(d => d !== activeDay && menuMap[d]).map(d => (
                    <option key={d} value={d}>{DAY_LABELS[d]}</option>
                  ))}
                </select>
              </div>
              {menuMap[activeDay] && (
                <button
                  className="wm-btn-delete"
                  disabled={deleting === activeDay}
                  onClick={() => handleDelete(activeDay)}
                >
                  {deleting === activeDay ? '...' : 'Delete'}
                </button>
              )}
              <button
                className="wm-btn-save"
                disabled={saving === activeDay || !isDirty}
                onClick={handleSave}
              >
                {saving === activeDay ? 'Saving…' : isDirty ? 'Save changes' : 'Saved ✓'}
              </button>
            </div>
          </div>

          {/* Meal tabs */}
          <div className="wm-meal-tabs">
            {MEALS.map(meal => (
              <button
                key={meal}
                className={`wm-meal-tab ${activeMeal === meal ? 'active' : ''} ${MEAL_COLORS[meal]}`}
                onClick={() => setActiveMeal(meal)}
              >
                {MEAL_ICONS[meal]}
                <span>{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                <span className="wm-meal-count">{draft[meal].length}</span>
              </button>
            ))}
          </div>

          {/* Items for active meal */}
          <div className="wm-items-section">
            {draft[activeMeal].length === 0 ? (
              <div className="wm-empty-meal">
                <span>{MEAL_ICONS[activeMeal]}</span>
                <p>No items for {activeMeal} yet.</p>
                <p className="wm-empty-hint">Add items using the form below.</p>
              </div>
            ) : (
              <div className="wm-items-list">
                {draft[activeMeal].map((item, idx) => (
                  <div key={idx} className="wm-item-row">
                    <div className="wm-item-reorder">
                      <button onClick={() => moveItem(activeMeal, idx, -1)} disabled={idx === 0}>↑</button>
                      <button onClick={() => moveItem(activeMeal, idx, +1)} disabled={idx === draft[activeMeal].length-1}>↓</button>
                    </div>
                    <span className="wm-item-num">{idx+1}</span>
                    <span className="wm-item-name">{item.name}</span>
                    {item.hasQuantity ? (
                      <span className="wm-item-qty-badge">max {item.maxQuantity}</span>
                    ) : (
                      <span className="wm-item-unlimited">unlimited</span>
                    )}
                    <button className="wm-item-remove" onClick={() => removeItem(activeMeal, idx)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add item form */}
          <form className="wm-add-form" onSubmit={handleAddItem}>
            <div className="wm-add-form-label">Add item to {activeMeal}</div>
            <div className="wm-add-row">
              <input
                ref={inputRef}
                type="text"
                placeholder={`e.g. ${activeMeal === 'breakfast' ? 'Poha, Tea, Bread' : activeMeal === 'lunch' ? 'Dal, Rice, Roti' : 'Khichdi, Sabzi, Chapati'}`}
                value={newItem.name}
                onChange={e => { setNewItem(p => ({...p, name: e.target.value})); setAddError(''); }}
                className="wm-name-input"
              />
              <label className="wm-qty-toggle">
                <input
                  type="checkbox"
                  checked={newItem.hasQuantity}
                  onChange={e => setNewItem(p => ({...p, hasQuantity: e.target.checked, maxQuantity: ''}))}
                />
                <span className="wm-qty-track"><span className="wm-qty-thumb"/></span>
                Limit qty
              </label>
              {newItem.hasQuantity && (
                <input
                  type="number"
                  placeholder="Max"
                  min="1"
                  value={newItem.maxQuantity}
                  onChange={e => setNewItem(p => ({...p, maxQuantity: e.target.value}))}
                  className="wm-max-input"
                />
              )}
              <button type="submit" className="wm-add-btn">+ Add</button>
            </div>
            {addError && <p className="wm-add-error">{addError}</p>}
          </form>

          {/* All-meals preview */}
          <div className="wm-preview">
            <div className="wm-preview-label">Full day preview</div>
            <div className="wm-preview-grid">
              {MEALS.map(meal => (
                <div key={meal} className={`wm-preview-col ${MEAL_COLORS[meal]}`}>
                  <div className="wm-preview-col-header">
                    {MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}
                    <span className="wm-preview-col-count">{draft[meal].length}</span>
                  </div>
                  {draft[meal].length === 0 ? (
                    <p className="wm-preview-empty">No items</p>
                  ) : (
                    draft[meal].map((item, i) => (
                      <div key={i} className="wm-preview-item">
                        <span>{item.name}</span>
                        {item.hasQuantity && <span className="wm-preview-max">×{item.maxQuantity}</span>}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save bar */}
          {isDirty && (
            <div className="wm-save-bar">
              <span>You have unsaved changes for {DAY_LABELS[activeDay]}</span>
              <div className="wm-save-bar-actions">
                <button className="wm-btn-discard" onClick={() => setDraft(deepCopy(menuMap[activeDay] || { breakfast:[], lunch:[], dinner:[] }))}>
                  Discard
                </button>
                <button className="wm-btn-save" onClick={handleSave} disabled={saving === activeDay}>
                  {saving === activeDay ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyMenuConfig;