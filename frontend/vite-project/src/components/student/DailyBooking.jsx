import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenuForDate, createBooking, cancelBooking, getSmartBooking, checkClosure } from '../../services/api';
import './DailyBooking.css';

const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MEAL_TIMES = { breakfast: '7:00 – 9:00 AM', lunch: '12:00 – 2:00 PM', dinner: '7:00 – 9:00 PM' };
const MEALS      = ['breakfast', 'lunch', 'dinner'];

// ── Date helpers (no timezone issues) ──────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const parseLocalDate = (dateStr) => {
  // always parse as LOCAL date, never UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplayDate = (dateStr) => {
  return parseLocalDate(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
};

const isDateBookable = (dateStr) => {
  // can book if date is tomorrow or further (not today, not past)
  const today = todayStr();
  if (dateStr <= today) return false;
  // deadline is 11:59 PM the day before the booking date
  const now = new Date();
  const deadline = parseLocalDate(dateStr);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(23, 59, 59, 999);
  return now <= deadline;
};

const getDateStatus = (dateStr) => {
  const today = todayStr();
  if (dateStr < today)  return 'past';
  if (dateStr === today) return 'today';
  if (!isDateBookable(dateStr)) return 'deadline-passed'; // tomorrow but after 11:59 PM
  return 'bookable';
};

// ───────────────────────────────────────────────────────────────────────────

const DailyBooking = () => {
  const { date }   = useParams();
  const navigate   = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(null); // meal type being submitted
  const [menu, setMenu]             = useState(null);  // { breakfast:[], lunch:[], dinner:[] }
  const [menuSource, setMenuSource] = useState('');    // 'date-specific' | 'weekly'
  const [existingBookings, setExistingBookings] = useState({}); // { breakfast: booking, ... }
  const [closure, setClosure]       = useState(null);
  const [message, setMessage]       = useState({ type: '', text: '' });

  // per-meal selected items
  const [selections, setSelections] = useState({
    breakfast: { enabled: false, items: [] },
    lunch:     { enabled: false, items: [] },
    dinner:    { enabled: false, items: [] },
  });

  const dateStatus = getDateStatus(date);

  useEffect(() => { fetchAll(); }, [date]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [menuRes, smartRes, closureRes] = await Promise.allSettled([
        getMenuForDate(date),
        getSmartBooking(date),
        checkClosure(date),
      ]);

      // ── menu ──
      if (menuRes.status === 'fulfilled') {
        setMenu(menuRes.value.data.menu?.meals || null);
        setMenuSource(menuRes.value.data.source);
      } else {
        setMenu(null);
      }

      // ── closure ──
      if (closureRes.status === 'fulfilled') {
        setClosure(closureRes.value.data);
      }

      // ── existing bookings ──
      if (smartRes.status === 'fulfilled') {
        const smart = smartRes.value.data;
        const existing = {};
        const initSelections = {
          breakfast: { enabled: false, items: [] },
          lunch:     { enabled: false, items: [] },
          dinner:    { enabled: false, items: [] },
        };

        if (smart.source === 'booking' && smart.data?.length > 0) {
          smart.data.forEach(b => {
            existing[b.mealType] = b;
            initSelections[b.mealType] = { enabled: true, items: b.items || [] };
          });
        } else if (smart.source === 'default' && smart.data?.length > 0) {
          // pre-fill from defaults but don't mark as "existing booking"
          smart.data.forEach(b => {
            initSelections[b.mealType] = { enabled: true, items: b.items || [] };
          });
        }

        setExistingBookings(existing);
        setSelections(initSelections);
      }

    } catch (e) {
      console.error(e);
      showMessage('error', 'Failed to load page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const isMealClosed = (mealType) =>
    closure?.isClosed && closure.affectedMeals?.includes(mealType);

  // ── item selection ──
  const toggleItem = (mealType, item) => {
    setSelections(prev => {
      const already = prev[mealType].items.find(i => i.name === item.name);
      const items = already
        ? prev[mealType].items.filter(i => i.name !== item.name)
        : [...prev[mealType].items, { name: item.name, quantity: item.hasQuantity ? 1 : null }];
      return { ...prev, [mealType]: { ...prev[mealType], items } };
    });
  };

  const changeQty = (mealType, itemName, delta, maxQty) => {
    setSelections(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: prev[mealType].items.map(i =>
          i.name === itemName
            ? { ...i, quantity: Math.min(maxQty, Math.max(1, (i.quantity || 1) + delta)) }
            : i
        )
      }
    }));
  };

  const toggleMeal = (mealType) => {
    if (isMealClosed(mealType)) return;
    setSelections(prev => ({
      ...prev,
      [mealType]: { ...prev[mealType], enabled: !prev[mealType].enabled }
    }));
  };

  // ── submit a single meal ──
  const handleBookMeal = async (mealType) => {
    const sel = selections[mealType];
    if (!sel.enabled || sel.items.length === 0) {
      showMessage('error', `Select at least one item for ${mealType}`);
      return;
    }
    setSubmitting(mealType);
    try {
      await createBooking({ date, mealType, items: sel.items });
      showMessage('success', `${mealType.charAt(0).toUpperCase()+mealType.slice(1)} booked!`);
      // refresh
      const res = await getSmartBooking(date);
      if (res.data.source === 'booking') {
        const updated = {};
        res.data.data.forEach(b => { updated[b.mealType] = b; });
        setExistingBookings(updated);
      }
    } catch (e) {
      showMessage('error', e.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(null);
    }
  };

  // ── cancel a single meal ──
  const handleCancelMeal = async (mealType) => {
    const booking = existingBookings[mealType];
    if (!booking) return;
    if (!window.confirm(`Cancel your ${mealType} booking?`)) return;
    setSubmitting(mealType);
    try {
      await cancelBooking(booking._id);
      showMessage('success', `${mealType.charAt(0).toUpperCase()+mealType.slice(1)} booking cancelled.`);
      setExistingBookings(prev => { const n = {...prev}; delete n[mealType]; return n; });
      setSelections(prev => ({ ...prev, [mealType]: { enabled: false, items: [] } }));
    } catch (e) {
      showMessage('error', e.response?.data?.message || 'Cancel failed');
    } finally {
      setSubmitting(null);
    }
  };

  // ─────────────── RENDER ───────────────
  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading menu for {formatDisplayDate(date)}...</p>
    </div>
  );

  // ── Blocked states ──
  if (dateStatus === 'past') return (
    <div className="db-blocked">
      <div className="blocked-icon">📅</div>
      <h2>Past Date</h2>
      <p>Bookings for <strong>{formatDisplayDate(date)}</strong> are no longer available.</p>
      <button className="db-btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  );

  if (dateStatus === 'today') return (
    <div className="db-blocked">
      <div className="blocked-icon">🕐</div>
      <h2>Today's booking is closed</h2>
      <p>You must book at least one day in advance, before 11:59 PM the previous night.</p>
      <button className="db-btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  );

  if (dateStatus === 'deadline-passed') return (
    <div className="db-blocked">
      <div className="blocked-icon">⏰</div>
      <h2>Booking deadline passed</h2>
      <p>The deadline for <strong>{formatDisplayDate(date)}</strong> was 11:59 PM last night.</p>
      <button className="db-btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  );

  if (!menu) return (
    <div className="db-blocked">
      <div className="blocked-icon">🍽️</div>
      <h2>No menu available</h2>
      <p>The admin hasn't configured a menu for <strong>{formatDisplayDate(date)}</strong> yet.</p>
      <button className="db-btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  );

  const isFullyClosed = closure?.isClosed && closure.affectedMeals?.length === 3;

  return (
    <div className="db-container">

      {/* Header */}
      <div className="db-header">
        <button className="db-back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="db-header-main">
          <div>
            <h1>Book Meals</h1>
            <p className="db-subdate">{formatDisplayDate(date)}</p>
          </div>
          <div className="db-header-meta">
            {menuSource === 'weekly' && (
              <span className="db-source-badge weekly">Weekly menu</span>
            )}
            {menuSource === 'date-specific' && (
              <span className="db-source-badge specific">Custom menu</span>
            )}
            <span className="db-deadline-note">⏰ Book before 11:59 PM tonight</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`db-alert db-alert-${message.type}`}>{message.text}</div>
      )}

      {/* Full closure banner */}
      {isFullyClosed && (
        <div className="db-closure-banner">
          🚫 Mess is fully closed on this day — <strong>{closure.reason}</strong>
        </div>
      )}

      {/* Meal sections */}
      <div className="db-meals">
        {MEALS.map(mealType => {
          const mealMenu   = menu[mealType] || [];
          const sel        = selections[mealType];
          const existing   = existingBookings[mealType];
          const closed     = isMealClosed(mealType);
          const noItems    = mealMenu.length === 0;
          const busy       = submitting === mealType;

          return (
            <div key={mealType} className={`db-meal-card ${closed || noItems ? 'db-meal-disabled' : ''} ${existing ? 'db-meal-booked' : ''}`}>

              {/* Meal header row */}
              <div className="db-meal-header">
                <div className="db-meal-left">
                  <span className="db-meal-emoji">{MEAL_ICONS[mealType]}</span>
                  <div>
                    <span className="db-meal-name">{mealType.charAt(0).toUpperCase()+mealType.slice(1)}</span>
                    <span className="db-meal-time">{MEAL_TIMES[mealType]}</span>
                  </div>
                </div>

                <div className="db-meal-right">
                  {closed && <span className="db-badge closed">Closed</span>}
                  {noItems && !closed && <span className="db-badge no-menu">No items</span>}
                  {existing && !closed && <span className="db-badge booked">✓ Booked</span>}

                  {!closed && !noItems && (
                    <label className="db-toggle">
                      <input
                        type="checkbox"
                        checked={sel.enabled}
                        onChange={() => toggleMeal(mealType)}
                      />
                      <span className="db-toggle-track">
                        <span className="db-toggle-thumb" />
                      </span>
                      <span className="db-toggle-label">{sel.enabled ? 'Selected' : 'Skip'}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Items panel — shown when toggled on */}
              {sel.enabled && !closed && !noItems && (
                <div className="db-items-panel">

                  <div className="db-items-grid">
                    {mealMenu.map((item, idx) => {
                      const selected = sel.items.find(i => i.name === item.name);
                      return (
                        <div
                          key={idx}
                          className={`db-item-tile ${selected ? 'selected' : ''}`}
                          onClick={() => toggleItem(mealType, item)}
                        >
                          <div className="db-item-tile-inner">
                            <span className="db-item-check">{selected ? '✓' : '+'}</span>
                            <span className="db-item-name">{item.name}</span>
                            {item.hasQuantity && (
                              <span className="db-item-max">max {item.maxQuantity}</span>
                            )}
                          </div>

                          {/* Quantity control inside tile */}
                          {selected && item.hasQuantity && (
                            <div className="db-qty-row" onClick={e => e.stopPropagation()}>
                              <button onClick={() => changeQty(mealType, item.name, -1, item.maxQuantity)}>−</button>
                              <span>{selected.quantity || 1}</span>
                              <button onClick={() => changeQty(mealType, item.name, +1, item.maxQuantity)}>+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selection summary + action */}
                  <div className="db-meal-footer">
                    <span className="db-selection-summary">
                      {sel.items.length === 0
                        ? 'Tap items to select'
                        : `${sel.items.length} item${sel.items.length > 1 ? 's' : ''} selected`}
                    </span>
                    <div className="db-meal-actions">
                      {existing && (
                        <button
                          className="db-btn-cancel"
                          disabled={busy}
                          onClick={() => handleCancelMeal(mealType)}
                        >
                          {busy ? '...' : 'Cancel booking'}
                        </button>
                      )}
                      <button
                        className="db-btn-book"
                        disabled={busy || sel.items.length === 0}
                        onClick={() => handleBookMeal(mealType)}
                      >
                        {busy ? 'Saving...' : existing ? 'Update booking' : 'Confirm booking'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing booking summary when collapsed */}
              {!sel.enabled && existing && (
                <div className="db-existing-summary">
                  {existing.items?.map((it, i) => (
                    <span key={i} className="db-chip">
                      {it.name}{it.quantity ? ` ×${it.quantity}` : ''}
                    </span>
                  ))}
                  <button className="db-chip-edit" onClick={() => toggleMeal(mealType)}>Edit</button>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DailyBooking;