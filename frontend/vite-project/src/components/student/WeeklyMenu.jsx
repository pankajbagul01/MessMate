import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeklyMenu, getUpcomingClosures, getSmartBooking } from '../../services/api';
import './WeeklyMenu.css';

const DAYS       = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };
const MEALS      = ['breakfast','lunch','dinner'];
const MEAL_ICONS = { breakfast:'🥐', lunch:'🍛', dinner:'🍽️' };
const MEAL_TIMES = { breakfast:'7–9 AM', lunch:'12–2 PM', dinner:'7–9 PM' };

// ── date helpers ──────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Get the next 7 days as { dateStr, dayName, label, isToday, isTomorrow }
const getWeekDays = () => {
  const today    = new Date();
  const todayS   = todayStr();
  const tomorrowS= tomorrowStr();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayIdx  = d.getDay(); // 0=Sun
    const dayName = DAYS[(dayIdx + 6) % 7]; // shift so Mon=0
    return {
      dateStr,
      dayName,
      label:      DAY_LABELS[dayName],
      shortDate:  d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
      isToday:    dateStr === todayS,
      isTomorrow: dateStr === tomorrowS,
    };
  });
};

const isBookable = (dateStr) => {
  const today = todayStr();
  if (dateStr <= today) return false;       // today or past — can't book
  const now      = new Date();
  const [y,m,d]  = dateStr.split('-').map(Number);
  const deadline = new Date(y, m-1, d);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(23, 59, 59, 999);
  return now <= deadline;
};

// ─────────────────────────────────────────────────────────────────────
const WeeklyMenu = () => {
  const navigate = useNavigate();

  const [weeklyMenu,  setWeeklyMenu]  = useState({});  // { monday: { breakfast:[], ... } }
  const [closures,    setClosures]    = useState([]);   // upcoming closure objects
  const [bookings,    setBookings]    = useState({});   // { dateStr: smartBookingData }
  const [loading,     setLoading]     = useState(true);
  const [activeDay,   setActiveDay]   = useState(null); // dateStr of expanded day
  const [activeMeal,  setActiveMeal]  = useState('breakfast');

  const weekDays = getWeekDays();

  useEffect(() => {
    fetchAll();
  }, []);

  // default expanded day = tomorrow (or today if nothing else)
  useEffect(() => {
    if (weekDays.length > 0 && !activeDay) {
      const tomorrow = weekDays.find(d => d.isTomorrow);
      setActiveDay(tomorrow ? tomorrow.dateStr : weekDays[0].dateStr);
    }
  }, [weekDays]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [menuRes, closureRes] = await Promise.allSettled([
        getWeeklyMenu(),
        getUpcomingClosures(),
      ]);

      // build menuMap
      if (menuRes.status === 'fulfilled') {
        const map = {};
        (menuRes.value.data || []).forEach(d => { map[d.dayOfWeek] = d.meals; });
        setWeeklyMenu(map);
      }

      if (closureRes.status === 'fulfilled') {
        setClosures(closureRes.value.data || []);
      }

      // fetch booking status for each of the 7 days concurrently
      const days = getWeekDays();
      const bookingResults = await Promise.allSettled(
        days.map(d => getSmartBooking(d.dateStr))
      );
      const bMap = {};
      days.forEach((d, i) => {
        if (bookingResults[i].status === 'fulfilled') {
          bMap[d.dateStr] = bookingResults[i].value.data;
        }
      });
      setBookings(bMap);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── helpers ──
  const getClosureForDate = (dateStr) =>
    closures.find(c => c.date === dateStr) || null;

  const isMealClosed = (dateStr, meal) => {
    const c = getClosureForDate(dateStr);
    return c ? c.affectedMeals.includes(meal) : false;
  };

  const getBookingForMeal = (dateStr, meal) => {
    const smart = bookings[dateStr];
    if (!smart || !smart.data) return null;
    if (smart.source === 'booking') return smart.data.find(b => b.mealType === meal) || null;
    return null; // default / none — not a confirmed booking
  };

  const isDefaultForMeal = (dateStr, meal) => {
    const smart = bookings[dateStr];
    return smart?.source === 'default' &&
      smart.data?.some(b => b.mealType === meal);
  };

  const getMealItems = (dayName, meal) =>
    weeklyMenu[dayName]?.[meal] || [];

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Loading weekly menu…</p>
    </div>
  );

  const activeDayObj = weekDays.find(d => d.dateStr === activeDay);
  const closure      = activeDay ? getClosureForDate(activeDay) : null;
  const activeMeals  = activeDayObj ? getMealItems(activeDayObj.dayName, activeMeal) : [];

  return (
    <div className="wm-student-container">

      {/* Header */}
      <div className="wm-student-header">
        <div>
          <h1>This Week's Menu</h1>
          <p>Browse what's being served each day and book your meals.</p>
        </div>
        <button className="wm-s-book-btn" onClick={() => navigate('/daily-booking/' + tomorrowStr())}>
          + Book Tomorrow
        </button>
      </div>

      {/* Upcoming closures banner */}
      {closures.filter(c => c.date >= todayStr()).slice(0,2).map(c => (
        <div key={c.date} className="wm-s-closure-banner">
          ⚠️ Mess closed on <strong>{new Date(...c.date.split('-').map(Number)).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}</strong> — {c.reason}
        </div>
      ))}

      <div className="wm-s-layout">

        {/* Day strip */}
        <div className="wm-s-day-strip">
          {weekDays.map(day => {
            const dayClosure   = getClosureForDate(day.dateStr);
            const fullyBooked  = MEALS.every(m => !!getBookingForMeal(day.dateStr, m));
            const partBooked   = !fullyBooked && MEALS.some(m => !!getBookingForMeal(day.dateStr, m));
            const hasMenu      = !!weeklyMenu[day.dayName];

            return (
              <button
                key={day.dateStr}
                className={`wm-s-day-card ${activeDay === day.dateStr ? 'active' : ''} ${day.isToday ? 'today' : ''} ${day.isTomorrow ? 'tomorrow' : ''} ${dayClosure ? 'closed' : ''}`}
                onClick={() => { setActiveDay(day.dateStr); setActiveMeal('breakfast'); }}
              >
                <span className="wm-s-day-name">{day.label.slice(0,3)}</span>
                <span className="wm-s-day-date">{day.shortDate}</span>

                {/* status dots */}
                <div className="wm-s-day-dots">
                  {dayClosure ? (
                    <span className="wm-s-dot closed" title="Mess closed" />
                  ) : hasMenu ? (
                    <>
                      {fullyBooked  && <span className="wm-s-dot booked"   title="All meals booked" />}
                      {partBooked   && <span className="wm-s-dot partial"  title="Some meals booked" />}
                      {!partBooked && !fullyBooked && <span className="wm-s-dot menu" title="Menu available" />}
                    </>
                  ) : (
                    <span className="wm-s-dot no-menu" title="No menu set" />
                  )}
                </div>

                {day.isToday    && <span className="wm-s-day-badge today">Today</span>}
                {day.isTomorrow && <span className="wm-s-day-badge tomorrow">Tomorrow</span>}
              </button>
            );
          })}
        </div>

        {/* Day detail panel */}
        {activeDayObj && (
          <div className="wm-s-detail">

            {/* Detail header */}
            <div className="wm-s-detail-header">
              <div>
                <h2>{activeDayObj.label}</h2>
                <span className="wm-s-detail-date">{activeDayObj.shortDate}</span>
              </div>
              <div className="wm-s-detail-actions">
                {closure ? (
                  <span className="wm-s-closed-badge">🔒 Mess Closed — {closure.reason}</span>
                ) : isBookable(activeDayObj.dateStr) ? (
                  <button
                    className="wm-s-book-btn-sm"
                    onClick={() => navigate('/daily-booking/' + activeDayObj.dateStr)}
                  >
                    Book this day →
                  </button>
                ) : activeDayObj.isToday ? (
                  <span className="wm-s-status-note">Booking closed for today</span>
                ) : (
                  <span className="wm-s-status-note">Deadline passed</span>
                )}
              </div>
            </div>

            {/* Meal tabs */}
            <div className="wm-s-meal-tabs">
              {MEALS.map(meal => {
                const booked    = !!getBookingForMeal(activeDayObj.dateStr, meal);
                const isDefault = isDefaultForMeal(activeDayObj.dateStr, meal);
                const mClosed   = isMealClosed(activeDayObj.dateStr, meal);
                const items     = getMealItems(activeDayObj.dayName, meal);
                return (
                  <button
                    key={meal}
                    className={`wm-s-meal-tab ${activeMeal === meal ? 'active' : ''}`}
                    onClick={() => setActiveMeal(meal)}
                  >
                    <span className="wm-s-tab-icon">{MEAL_ICONS[meal]}</span>
                    <span className="wm-s-tab-name">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                    <span className="wm-s-tab-count">{items.length}</span>
                    {mClosed  && <span className="wm-s-tab-dot closed"  />}
                    {booked   && <span className="wm-s-tab-dot booked"  />}
                    {isDefault && !booked && <span className="wm-s-tab-dot default" />}
                  </button>
                );
              })}
            </div>

            {/* Meal content */}
            <div className="wm-s-meal-content">
              {isMealClosed(activeDayObj.dateStr, activeMeal) ? (
                <div className="wm-s-meal-closed">
                  <span>🔒</span>
                  <p>This meal is closed on {activeDayObj.label}.</p>
                  <p className="wm-s-sub">{closure?.reason || 'Mess closed'}</p>
                </div>
              ) : activeMeals.length === 0 ? (
                <div className="wm-s-no-menu">
                  <span>🍽️</span>
                  <p>No menu configured for this meal yet.</p>
                  <p className="wm-s-sub">Check back later or contact the mess admin.</p>
                </div>
              ) : (
                <>
                  {/* Booking status for this meal */}
                  {(() => {
                    const booking   = getBookingForMeal(activeDayObj.dateStr, activeMeal);
                    const isDefault = isDefaultForMeal(activeDayObj.dateStr, activeMeal);
                    if (booking) return (
                      <div className="wm-s-booking-status booked">
                        ✓ You've booked this meal
                        {booking.items?.length > 0 && (
                          <span className="wm-s-booked-items">
                            {booking.items.map(i => i.name + (i.quantity ? ` ×${i.quantity}` : '')).join(', ')}
                          </span>
                        )}
                      </div>
                    );
                    if (isDefault) return (
                      <div className="wm-s-booking-status default">
                        ⚙ Will be auto-booked at midnight based on your defaults
                      </div>
                    );
                    if (isBookable(activeDayObj.dateStr)) return (
                      <div className="wm-s-booking-status none">
                        Not booked yet
                        <button
                          className="wm-s-inline-book"
                          onClick={() => navigate('/daily-booking/' + activeDayObj.dateStr)}
                        >
                          Book now →
                        </button>
                      </div>
                    );
                    return null;
                  })()}

                  {/* Meal time */}
                  <div className="wm-s-meal-time">
                    🕐 {MEAL_TIMES[activeMeal]}
                  </div>

                  {/* Items */}
                  <div className="wm-s-items-grid">
                    {activeMeals.map((item, i) => (
                      <div key={i} className="wm-s-item-card">
                        <span className="wm-s-item-name">{item.name}</span>
                        {item.hasQuantity && (
                          <span className="wm-s-item-max">max {item.maxQuantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Legend */}
      <div className="wm-s-legend">
        <span><span className="wm-s-dot booked"  /> All meals booked</span>
        <span><span className="wm-s-dot partial" /> Some meals booked</span>
        <span><span className="wm-s-dot menu"    /> Menu available</span>
        <span><span className="wm-s-dot default" /> Auto-booking set</span>
        <span><span className="wm-s-dot closed"  /> Mess closed</span>
        <span><span className="wm-s-dot no-menu" /> No menu yet</span>
      </div>
    </div>
  );
};

export default WeeklyMenu;