import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCookingSummary, getAnalytics, getMonthlyReport,
  getClosures, addClosureDate, removeClosureDate,
  getWeeklyMenu
} from '../../services/api';
import './AdminDashboard.css';

const MEALS      = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const tomorrowStr = () => {
  const d = new Date(); d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDate = (s) => {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  // ── state ──
  const [tab, setTab]           = useState('today');   // today | tomorrow | monthly | closures
  const [viewDate, setViewDate] = useState(todayStr());
  const [summary, setSummary]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [closures, setClosures] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth()+1);
  const [reportYear,  setReportYear]  = useState(new Date().getFullYear());

  // closure form
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [cDate,   setCDate]   = useState('');
  const [cReason, setCReason] = useState('');
  const [cMeals,  setCMeals]  = useState(['breakfast','lunch','dinner']);

  const [msg, setMsg] = useState({ type:'', text:'' });

  useEffect(() => { fetchForTab(); }, [tab, viewDate, reportMonth, reportYear]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const fetchForTab = async () => {
    setLoading(true);
    try {
      if (tab === 'today' || tab === 'tomorrow') {
        const d = tab === 'today' ? todayStr() : tomorrowStr();
        const [sumRes, anaRes] = await Promise.allSettled([
          getCookingSummary(d),
          getAnalytics(d),
        ]);
        setSummary(sumRes.status === 'fulfilled' ? sumRes.value.data : null);
        setAnalytics(anaRes.status === 'fulfilled' ? anaRes.value.data : null);
      } else if (tab === 'custom') {
        const [sumRes, anaRes] = await Promise.allSettled([
          getCookingSummary(viewDate),
          getAnalytics(viewDate),
        ]);
        setSummary(sumRes.status === 'fulfilled' ? sumRes.value.data : null);
        setAnalytics(anaRes.status === 'fulfilled' ? anaRes.value.data : null);
      } else if (tab === 'monthly') {
        const res = await getMonthlyReport(reportYear, reportMonth);
        setMonthlyReport(res.data);
      } else if (tab === 'closures') {
        const [clRes, menuRes] = await Promise.allSettled([getClosures(), getWeeklyMenu()]);
        if (clRes.status   === 'fulfilled') setClosures(clRes.value.data || []);
        if (menuRes.status === 'fulfilled') setWeeklyMenu(menuRes.value.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeDate = tab === 'today' ? todayStr() : tab === 'tomorrow' ? tomorrowStr() : viewDate;

  // ── cooking summary helpers ──
  // Number of students who booked a given meal (count of bookings, not item qty)
  // The API returns item-level quantities; we track unique student bookings via analytics
  const studentsForMeal = (meal) => {
    if (!analytics?.[meal]) return 0;
    // analytics[meal] = { itemName: totalQty } — number of entries tells us items booked
    // but we need booking count. Use summary keys as proxy: any non-zero item means students booked
    // Best proxy: take the max item count (non-quantity items are 1 per student)
    const items = summary?.[meal] || {};
    const nonQtyMax = Object.entries(items)
      .filter(([,v]) => v > 0)
      .map(([,v]) => v);
    return nonQtyMax.length ? Math.max(...nonQtyMax) : 0;
  };
  const totalOrders = () => summary?.totalBookings || 0;
  const hasAnyBooking = () => (summary?.totalBookings || 0) > 0 || MEALS.some(m => Object.keys(summary?.[m]||{}).length > 0);

  // ── closure handlers ──
  const handleAddClosure = async (e) => {
    e.preventDefault();
    try {
      await addClosureDate({ date: cDate, reason: cReason || 'Mess closed', affectedMeals: cMeals });
      showMsg('success', `Closure added for ${cDate}`);
      setShowClosureForm(false); setCDate(''); setCReason(''); setCMeals(['breakfast','lunch','dinner']);
      fetchForTab();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to add closure');
    }
  };
  const handleRemoveClosure = async (date) => {
    if (!window.confirm(`Remove closure for ${date}?`)) return;
    try {
      await removeClosureDate(date);
      showMsg('success', 'Closure removed');
      fetchForTab();
    } catch { showMsg('error', 'Failed to remove closure'); }
  };
  const toggleCMeal = (meal) =>
    setCMeals(prev => prev.includes(meal) ? prev.filter(m=>m!==meal) : [...prev, meal]);

  // ── monthly report helpers ──
  const topStudents = (n=5) => {
    if (!monthlyReport?.report) return [];
    return [...monthlyReport.report].sort((a,b) => b.totalMeals - a.totalMeals).slice(0, n);
  };

  return (
    <div className="ad-container">

      {/* ── Header ── */}
      <div className="ad-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="ad-subtext">Mess operations, bookings &amp; analytics</p>
        </div>
        <div className="ad-header-actions">
          <button className="ad-btn-outline" onClick={() => navigate('/admin/weekly-menu')}>📅 Weekly Menu</button>
          <button className="ad-btn-outline" onClick={() => navigate('/admin/meal-config')}>📝 Meal Config</button>
          <button className="ad-btn-primary" onClick={() => navigate('/admin/analytics')}>📊 Analytics</button>
        </div>
      </div>

      {/* ── Alert ── */}
      {msg.text && <div className={`ad-alert ad-alert-${msg.type}`}>{msg.text}</div>}

      {/* ── Tab bar ── */}
      <div className="ad-tabs">
        {[
          { key:'today',    label:"Today's Summary" },
          { key:'tomorrow', label:"Tomorrow's Bookings" },
          { key:'custom',   label:'Custom Date' },
          { key:'monthly',  label:'Monthly Report' },
          { key:'closures', label:'Closures' },
        ].map(t => (
          <button key={t.key} className={`ad-tab ${tab===t.key?'active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key==='closures' && closures.length>0 && tab!=='closures' && (
              <span className="ad-tab-badge">{closures.filter(c=>c.date>=todayStr()).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Custom date picker ── */}
      {tab === 'custom' && (
        <div className="ad-date-picker">
          <label>Select date</label>
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="loading-container"><div className="spinner"/><p>Loading...</p></div>
      ) : (

        <>
          {/* ══ TODAY / TOMORROW / CUSTOM ══ */}
          {(tab==='today'||tab==='tomorrow'||tab==='custom') && (
            <div className="ad-daily">

              {/* Stat row */}
              <div className="ad-stats-row">
                <div className="ad-stat-card orange">
                  <span className="ad-stat-num">{summary?.totalStudents || 0}</span>
                  <span className="ad-stat-label">Students booked</span>
                </div>
                <div className="ad-stat-card ad-stat-breakfast">
                  <span className="ad-stat-icon">🥐</span>
                  <span className="ad-stat-num">{studentsForMeal('breakfast')}</span>
                  <span className="ad-stat-label">Breakfast</span>
                </div>
                <div className="ad-stat-card ad-stat-lunch">
                  <span className="ad-stat-icon">🍛</span>
                  <span className="ad-stat-num">{studentsForMeal('lunch')}</span>
                  <span className="ad-stat-label">Lunch</span>
                </div>
                <div className="ad-stat-card ad-stat-dinner">
                  <span className="ad-stat-icon">🍽️</span>
                  <span className="ad-stat-num">{studentsForMeal('dinner')}</span>
                  <span className="ad-stat-label">Dinner</span>
                </div>
                <div className="ad-stat-card blue">
                  <span className="ad-stat-num">{summary?.totalBookings || 0}</span>
                  <span className="ad-stat-label">Total bookings</span>
                </div>
              </div>

              {/* Date label + nav */}
              <div className="ad-date-nav">
                <h2>
                  {MEAL_ICONS.breakfast} Cooking summary —{' '}
                  <span>{fmtDate(activeDate)}</span>
                  {tab==='today'    && <span className="ad-day-badge today">Today</span>}
                  {tab==='tomorrow' && <span className="ad-day-badge tomorrow">Tomorrow</span>}
                </h2>
                <div className="ad-nav-btns">
                  <button onClick={() => navigate(`/admin/analytics/${activeDate}`)}>📊 Full analytics</button>
                </div>
              </div>

              {/* Cooking cards */}
              {!hasAnyBooking() ? (
                <div className="ad-empty">
                  <span>📭</span>
                  <p>No bookings for this date yet.</p>
                </div>
              ) : (
                <div className="ad-meals-grid">
                  {MEALS.map(meal => {
                    const items  = summary?.[meal] || {};
                    const sorted = Object.entries(items).sort((a,b)=>b[1]-a[1]);
                    const studentCount = studentsForMeal(meal);
                    // Identify which items have quantity > 1 per student (quantity-type items)
                    // A quantity item will have a total that could be > studentCount
                    const isQtyItem = (itemName, qty) => studentCount > 0 && qty > studentCount;
                    return (
                      <div key={meal} className={`ad-meal-card ad-meal-${meal}`}>
                        <div className="ad-meal-card-header">
                          <span>{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                          <span className="ad-meal-total">{studentCount} students</span>
                        </div>
                        {sorted.length === 0 ? (
                          <p className="ad-no-orders">No orders</p>
                        ) : (
                          sorted.map(([item, qty]) => {
                            const isQty = isQtyItem(item, qty);
                            return (
                              <div key={item} className={`ad-item-row ${isQty ? 'ad-item-row-qty' : ''}`}>
                                <span className="ad-item-name">
                                  {item}
                                  {isQty && <span className="ad-qty-badge">qty</span>}
                                </span>
                                <div className="ad-item-bar-wrap">
                                  <div
                                    className={`ad-item-bar ${isQty ? 'ad-item-bar-qty' : ''}`}
                                    style={{ width: `${Math.min(100, Math.round((qty / (isQty ? qty : studentCount || 1)) * 100))}%` }}
                                  />
                                </div>
                                <span className={`ad-item-qty ${isQty ? 'ad-item-qty-highlight' : ''}`}>{qty}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ MONTHLY REPORT ══ */}
          {tab === 'monthly' && (
            <div className="ad-monthly">
              <div className="ad-month-controls">
                <select value={reportMonth} onChange={e=>setReportMonth(+e.target.value)}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={reportYear} onChange={e=>setReportYear(+e.target.value)}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="ad-month-meta">
                  {monthlyReport ? `${monthlyReport.totalBookings} bookings · ${monthlyReport.totalStudents} students` : ''}
                </span>
              </div>

              {!monthlyReport || monthlyReport.report?.length === 0 ? (
                <div className="ad-empty"><span>📊</span><p>No data for this period.</p></div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="ad-stats-row" style={{marginBottom:24}}>
                    <div className="ad-stat-card orange">
                      <span className="ad-stat-num">{monthlyReport.totalBookings}</span>
                      <span className="ad-stat-label">Total bookings</span>
                    </div>
                    <div className="ad-stat-card blue">
                      <span className="ad-stat-num">{monthlyReport.totalStudents}</span>
                      <span className="ad-stat-label">Active students</span>
                    </div>
                    {MEALS.map(meal => (
                      <div key={meal} className="ad-stat-card gray">
                        <span className="ad-stat-num">
                          {monthlyReport.report.reduce((s,r)=>s+(r[meal]||0),0)}
                        </span>
                        <span className="ad-stat-label">{meal.charAt(0).toUpperCase()+meal.slice(1)}s</span>
                      </div>
                    ))}
                  </div>

                  {/* Top consumers */}
                  <div className="ad-section-label">Top students by meal count</div>
                  <div className="ad-top-students">
                    {topStudents(5).map((s,i) => (
                      <div key={s.email} className="ad-student-row">
                        <span className="ad-rank">#{i+1}</span>
                        <div className="ad-student-info">
                          <span className="ad-student-name">{s.name}</span>
                          <span className="ad-student-email">{s.email}</span>
                        </div>
                        <div className="ad-student-meals">
                          <span className="ad-meal-chip breakfast">{s.breakfast}B</span>
                          <span className="ad-meal-chip lunch">{s.lunch}L</span>
                          <span className="ad-meal-chip dinner">{s.dinner}D</span>
                        </div>
                        <span className="ad-student-total">{s.totalMeals} meals</span>
                      </div>
                    ))}
                  </div>

                  {/* Full table */}
                  <div className="ad-section-label" style={{marginTop:24}}>All students</div>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Email</th>
                          <th>🥐 B</th>
                          <th>🍛 L</th>
                          <th>🍽️ D</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...monthlyReport.report]
                          .sort((a,b)=>b.totalMeals-a.totalMeals)
                          .map(s => (
                          <tr key={s.email}>
                            <td className="ad-td-name">{s.name}</td>
                            <td className="ad-td-email">{s.email}</td>
                            <td className="ad-td-center">{s.breakfast}</td>
                            <td className="ad-td-center">{s.lunch}</td>
                            <td className="ad-td-center">{s.dinner}</td>
                            <td className="ad-td-total">{s.totalMeals}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ CLOSURES ══ */}
          {tab === 'closures' && (
            <div className="ad-closures">
              <div className="ad-closures-header">
                <div>
                  <h2>Mess Closures</h2>
                  <p>Mark days when the mess is partially or fully closed. Students will see these on their dashboard.</p>
                </div>
                <button className="ad-btn-primary" onClick={() => setShowClosureForm(true)}>+ Add Closure</button>
              </div>

              {/* Weekly menu status */}
              <div className="ad-section-label">Weekly menu status</div>
              <div className="ad-weekly-status">
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                  const hasMenu = weeklyMenu.find(m => m.dayOfWeek === day);
                  return (
                    <div key={day} className={`ad-day-status ${hasMenu ? 'has-menu' : 'no-menu'}`}>
                      <span className="ad-day-name">{day.slice(0,3).toUpperCase()}</span>
                      <span className="ad-day-dot" />
                      <span className="ad-day-status-text">{hasMenu ? 'Set' : 'Not set'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Closures list */}
              <div className="ad-section-label" style={{marginTop:24}}>
                Scheduled closures
                <span className="ad-count-badge">{closures.length}</span>
              </div>

              {closures.length === 0 ? (
                <div className="ad-empty"><span>✅</span><p>No closures scheduled.</p></div>
              ) : (
                <div className="ad-closures-list">
                  {[...closures].sort((a,b)=>a.date.localeCompare(b.date)).map(c => {
                    const isPast = c.date < todayStr();
                    return (
                      <div key={c.date} className={`ad-closure-row ${isPast ? 'past' : ''}`}>
                        <div className="ad-closure-left">
                          <span className="ad-closure-date">{fmtDate(c.date)}</span>
                          {isPast && <span className="ad-closure-past-badge">Past</span>}
                        </div>
                        <span className="ad-closure-reason">{c.reason}</span>
                        <div className="ad-closure-meals">
                          {c.affectedMeals.map(m => (
                            <span key={m} className="ad-closure-meal-chip">{MEAL_ICONS[m]}</span>
                          ))}
                        </div>
                        <button className="ad-btn-remove" onClick={() => handleRemoveClosure(c.date)}>Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add closure form (inline, not modal) */}
              {showClosureForm && (
                <div className="ad-closure-form-wrap">
                  <div className="ad-closure-form">
                    <div className="ad-form-header">
                      <h3>Add Closure Date</h3>
                      <button className="ad-close-btn" onClick={() => setShowClosureForm(false)}>×</button>
                    </div>
                    <form onSubmit={handleAddClosure}>
                      <div className="ad-form-row">
                        <div className="ad-form-group">
                          <label>Date *</label>
                          <input type="date" value={cDate} onChange={e=>setCDate(e.target.value)} required min={todayStr()} />
                        </div>
                        <div className="ad-form-group">
                          <label>Reason</label>
                          <input type="text" placeholder="e.g. Holiday, Maintenance" value={cReason} onChange={e=>setCReason(e.target.value)} />
                        </div>
                      </div>
                      <div className="ad-form-group">
                        <label>Affected meals</label>
                        <div className="ad-meal-toggles">
                          {MEALS.map(meal => (
                            <label key={meal} className={`ad-meal-toggle-label ${cMeals.includes(meal)?'on':''}`}>
                              <input type="checkbox" checked={cMeals.includes(meal)} onChange={() => toggleCMeal(meal)} />
                              {MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="ad-form-actions">
                        <button type="button" className="ad-btn-outline" onClick={() => setShowClosureForm(false)}>Cancel</button>
                        <button type="submit" className="ad-btn-primary">Add Closure</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;