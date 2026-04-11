import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalytics, getCookingSummary, getMonthlyReport } from '../../services/api';
import './Analytics.css';

const MEALS      = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🥐', lunch: '🍛', dinner: '🍽️' };
const MEAL_COLORS= { breakfast: '#F59E0B', lunch: '#F97316', dinner: '#6366F1' };
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Date helpers (no timezone issues) ──────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const shiftDate = (dateStr, days) => {
  const [y,m,d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};
const fmtDate = (s) => {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' });
};
const fmtDateShort = (s) => {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short' });
};

// ── Mini bar chart (pure SVG, no library) ──────────────────────────
const BarChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const max  = Math.max(...data.map(d => d.value), 1);
  const W    = 100, H = 52, gap = 4;
  const bw   = Math.max(4, Math.floor((W - gap * (data.length - 1)) / data.length));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:52 }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh  = Math.max(2, Math.round((d.value / max) * (H - 14)));
        const x   = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - bh - 12} width={bw} height={bh}
              fill={color} rx="2" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
};

// ── Donut chart (pure SVG) ──────────────────────────────────────────
const DonutChart = ({ segments, size = 110 }) => {
  const r = 38, cx = size/2, cy = size/2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  let angle = -90;
  const arcs = segments.map(seg => {
    const pct   = seg.value / total;
    const start = angle;
    angle += pct * 360;
    return { ...seg, start, end: angle, pct };
  });
  const arc = (cx, cy, r, startDeg, endDeg) => {
    const s = endDeg - startDeg;
    if (s >= 360) {
      return `M ${cx+r} ${cy} A ${r} ${r} 0 1 1 ${cx+r-0.01} ${cy}`;
    }
    const rad = a => (a * Math.PI) / 180;
    const x1  = cx + r * Math.cos(rad(startDeg));
    const y1  = cy + r * Math.sin(rad(startDeg));
    const x2  = cx + r * Math.cos(rad(endDeg));
    const y2  = cy + r * Math.sin(rad(endDeg));
    const lg  = s > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((seg, i) => (
        <path key={i} d={arc(cx, cy, r, seg.start, seg.end)}
          fill="none" stroke={seg.color} strokeWidth="14"
          strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        fontSize="16" fontWeight="700" fill="var(--text-primary)">{total}</text>
      <text x={cx} y={cy+14} textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fill="var(--text-muted)">total</text>
    </svg>
  );
};

// ── Main component ──────────────────────────────────────────────────
const Analytics = () => {
  const { date: paramDate } = useParams();
  const navigate = useNavigate();

  const [tab,         setTab]         = useState('daily');
  const [selDate,     setSelDate]     = useState(paramDate || todayStr());
  const [selMonth,    setSelMonth]    = useState(new Date().getMonth() + 1);
  const [selYear,     setSelYear]     = useState(new Date().getFullYear());

  const [daily,       setDaily]       = useState(null);   // { analytics, cooking }
  const [monthly,     setMonthly]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [sortCol,     setSortCol]     = useState('totalMeals');
  const [sortDir,     setSortDir]     = useState('desc');
  const [search,      setSearch]      = useState('');

  // fetch daily
  const fetchDaily = useCallback(async (d) => {
    setLoading(true);
    try {
      const [anaRes, cookRes] = await Promise.allSettled([
        getAnalytics(d),
        getCookingSummary(d),
      ]);
      setDaily({
        analytics: anaRes.status  === 'fulfilled' ? anaRes.value.data  : null,
        cooking:   cookRes.status === 'fulfilled' ? cookRes.value.data : null,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMonthlyReport(selYear, selMonth);
      setMonthly(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selYear, selMonth]);

  useEffect(() => { if (tab === 'daily') fetchDaily(selDate); }, [selDate, tab]);
  useEffect(() => { if (tab === 'monthly') fetchMonthly(); }, [selMonth, selYear, tab]);
  useEffect(() => { if (paramDate) { setSelDate(paramDate); setTab('daily'); } }, [paramDate]);

  const navigateDate = (delta) => {
    const nd = shiftDate(selDate, delta);
    setSelDate(nd);
    navigate(`/admin/analytics/${nd}`, { replace: true });
  };

  // ── daily helpers ──
  const totalOf    = (obj) => obj ? Object.values(obj).reduce((s,v)=>s+v,0) : 0;
  const mealTotal  = (meal) => daily?.cooking ? Object.values(daily.cooking[meal]||{}).reduce((s,v)=>s+v,0) : 0;
  const grandTotal = () => MEALS.reduce((s,m) => s + mealTotal(m), 0);

  // ── monthly helpers ──
  const sortedStudents = () => {
    if (!monthly?.report) return [];
    let rows = [...monthly.report];
    if (search) rows = rows.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    );
    rows.sort((a,b) => sortDir === 'asc' ? a[sortCol]-b[sortCol] : b[sortCol]-a[sortCol]);
    return rows;
  };
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const exportCSV = () => {
    if (!monthly?.report) return;
    const rows = sortedStudents();
    const header = 'Name,Email,Breakfast,Lunch,Dinner,Total\n';
    const body   = rows.map(r => `"${r.name}","${r.email}",${r.breakfast},${r.lunch},${r.dinner},${r.totalMeals}`).join('\n');
    const blob   = new Blob([header+body], { type:'text/csv' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = `meals_${selYear}_${MONTH_SHORT[selMonth-1]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="an-container">

      {/* Header */}
      <div className="an-header">
        <div>
          <button className="an-back" onClick={() => navigate('/admin')}>← Dashboard</button>
          <h1>Analytics & Reports</h1>
        </div>
        <div className="an-tabs">
          <button className={`an-tab ${tab==='daily'?'active':''}`}   onClick={() => setTab('daily')}>Daily</button>
          <button className={`an-tab ${tab==='monthly'?'active':''}`} onClick={() => setTab('monthly')}>Monthly</button>
        </div>
      </div>

      {/* ══ DAILY ══ */}
      {tab === 'daily' && (
        <div className="an-daily">

          {/* Date navigator */}
          <div className="an-date-bar">
            <button className="an-nav-btn" onClick={() => navigateDate(-1)}>←</button>
            <div className="an-date-center">
              <input type="date" value={selDate}
                onChange={e => { setSelDate(e.target.value); navigate(`/admin/analytics/${e.target.value}`, { replace:true }); }}
              />
              <span className="an-date-label">{fmtDate(selDate)}</span>
              {selDate === todayStr() && <span className="an-today-chip">Today</span>}
            </div>
            <button className="an-nav-btn" onClick={() => navigateDate(+1)}>→</button>
            <button className="an-today-btn" onClick={() => { setSelDate(todayStr()); navigate(`/admin/analytics/${todayStr()}`, { replace:true }); }}>
              Today
            </button>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner"/><p>Loading...</p></div>
          ) : !daily ? null : (
            <>
              {/* KPI row */}
              <div className="an-kpi-row">
                <div className="an-kpi orange">
                  <span className="an-kpi-num">{daily.cooking?.totalStudents || 0}</span>
                  <span className="an-kpi-label">Students</span>
                </div>
                <div className="an-kpi blue">
                  <span className="an-kpi-num">{daily.cooking?.totalBookings || 0}</span>
                  <span className="an-kpi-label">Bookings</span>
                </div>
                {MEALS.map(meal => (
                  <div key={meal} className="an-kpi gray">
                    <span className="an-kpi-num">{mealTotal(meal)}</span>
                    <span className="an-kpi-label">{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                  </div>
                ))}
              </div>

              {grandTotal() === 0 ? (
                <div className="an-empty">
                  <span>📭</span>
                  <p>No bookings for {fmtDateShort(selDate)}.</p>
                </div>
              ) : (
                <>
                  {/* Overview row: donut + per-meal bars */}
                  <div className="an-overview-row">
                    {/* Donut */}
                    <div className="an-donut-card">
                      <div className="an-card-label">Meal distribution</div>
                      <div className="an-donut-wrap">
                        <DonutChart segments={MEALS.map(m => ({
                          value: mealTotal(m), color: MEAL_COLORS[m]
                        }))} size={120} />
                        <div className="an-donut-legend">
                          {MEALS.map(m => (
                            <div key={m} className="an-legend-row">
                              <span className="an-legend-dot" style={{ background: MEAL_COLORS[m] }} />
                              <span className="an-legend-label">{m.charAt(0).toUpperCase()+m.slice(1)}</span>
                              <span className="an-legend-val">{mealTotal(m)}</span>
                              <span className="an-legend-pct">
                                {grandTotal() ? Math.round((mealTotal(m)/grandTotal())*100) : 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Per-meal item breakdown */}
                    {MEALS.map(meal => {
                      const items  = daily.cooking?.[meal] || {};
                      const sorted = Object.entries(items).sort((a,b)=>b[1]-a[1]);
                      const total  = mealTotal(meal);
                      return (
                        <div key={meal} className={`an-meal-card an-meal-${meal}`}>
                          <div className="an-meal-card-header">
                            <span>{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                            <span className="an-meal-total">{total} items</span>
                          </div>
                          {sorted.length === 0 ? (
                            <p className="an-no-orders">No orders</p>
                          ) : (
                            sorted.map(([name, qty]) => {
                              const pct = total ? Math.round((qty/total)*100) : 0;
                              return (
                                <div key={name} className="an-item-row">
                                  <span className="an-item-name">{name}</span>
                                  <div className="an-bar-wrap">
                                    <div className="an-bar" style={{ width:`${pct}%`, background: MEAL_COLORS[meal] }} />
                                  </div>
                                  <span className="an-item-qty">{qty}</span>
                                  <span className="an-item-pct">{pct}%</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Analytics table — per-meal detailed */}
                  {daily.analytics && (
                    <div className="an-detail-section">
                      <div className="an-section-label">Item-wise breakdown</div>
                      <div className="an-detail-grid">
                        {MEALS.map(meal => {
                          const data   = daily.analytics[meal] || {};
                          const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
                          const total  = totalOf(data);
                          if (sorted.length === 0) return null;
                          return (
                            <div key={meal} className="an-detail-card">
                              <div className={`an-detail-header an-dh-${meal}`}>
                                <span>{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
                                <span>{total} total</span>
                              </div>
                              <table className="an-detail-table">
                                <thead>
                                  <tr><th>Item</th><th>Qty</th><th>Share</th></tr>
                                </thead>
                                <tbody>
                                  {sorted.map(([name, qty]) => {
                                    const pct = total ? ((qty/total)*100).toFixed(1) : 0;
                                    return (
                                      <tr key={name}>
                                        <td>{name}</td>
                                        <td className="an-td-center">{qty}</td>
                                        <td>
                                          <div className="an-pct-bar-wrap">
                                            <div className="an-pct-bar" style={{ width:`${pct}%`, background: MEAL_COLORS[meal] }} />
                                            <span>{pct}%</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ MONTHLY ══ */}
      {tab === 'monthly' && (
        <div className="an-monthly">

          {/* Controls */}
          <div className="an-month-bar">
            <div className="an-month-selects">
              <select value={selMonth} onChange={e => setSelMonth(+e.target.value)}>
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select value={selYear} onChange={e => setSelYear(+e.target.value)}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="an-month-actions">
              {monthly && (
                <button className="an-export-btn" onClick={exportCSV}>↓ Export CSV</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner"/><p>Loading...</p></div>
          ) : !monthly ? null : (
            <>
              {/* KPI row */}
              <div className="an-kpi-row">
                <div className="an-kpi orange">
                  <span className="an-kpi-num">{monthly.totalBookings}</span>
                  <span className="an-kpi-label">Total bookings</span>
                </div>
                <div className="an-kpi blue">
                  <span className="an-kpi-num">{monthly.totalStudents}</span>
                  <span className="an-kpi-label">Active students</span>
                </div>
                {MEALS.map(meal => (
                  <div key={meal} className="an-kpi gray">
                    <span className="an-kpi-num">
                      {(monthly.report||[]).reduce((s,r)=>s+(r[meal]||0),0)}
                    </span>
                    <span className="an-kpi-label">{meal.charAt(0).toUpperCase()+meal.slice(1)}s</span>
                  </div>
                ))}
              </div>

              {monthly.report?.length === 0 ? (
                <div className="an-empty"><span>📊</span><p>No bookings for {MONTHS[selMonth-1]} {selYear}.</p></div>
              ) : (
                <>
                  {/* Meal distribution donut */}
                  <div className="an-month-overview">
                    <div className="an-donut-card">
                      <div className="an-card-label">Meal mix — {MONTH_SHORT[selMonth-1]} {selYear}</div>
                      <div className="an-donut-wrap">
                        <DonutChart segments={MEALS.map(m => ({
                          value: (monthly.report||[]).reduce((s,r)=>s+(r[m]||0),0),
                          color: MEAL_COLORS[m]
                        }))} size={120} />
                        <div className="an-donut-legend">
                          {MEALS.map(m => {
                            const v = (monthly.report||[]).reduce((s,r)=>s+(r[m]||0),0);
                            return (
                              <div key={m} className="an-legend-row">
                                <span className="an-legend-dot" style={{ background: MEAL_COLORS[m] }} />
                                <span className="an-legend-label">{m.charAt(0).toUpperCase()+m.slice(1)}</span>
                                <span className="an-legend-val">{v}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Top 5 students mini chart */}
                    <div className="an-top5-card">
                      <div className="an-card-label">Top 5 by meals</div>
                      {[...monthly.report].sort((a,b)=>b.totalMeals-a.totalMeals).slice(0,5).map((s,i) => (
                        <div key={s.email} className="an-top5-row">
                          <span className="an-top5-rank">#{i+1}</span>
                          <div className="an-top5-info">
                            <span className="an-top5-name">{s.name}</span>
                            <div className="an-top5-bar-wrap">
                              <div className="an-top5-bar" style={{ width: `${Math.round((s.totalMeals / (monthly.report[0]?.totalMeals||1))*100)}%` }} />
                            </div>
                          </div>
                          <span className="an-top5-total">{s.totalMeals}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student table */}
                  <div className="an-table-section">
                    <div className="an-table-toolbar">
                      <div className="an-section-label" style={{margin:0}}>
                        All students
                        <span className="an-count-badge">{sortedStudents().length}</span>
                      </div>
                      <input
                        className="an-search"
                        type="text"
                        placeholder="Search student…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="an-table-wrap">
                      <table className="an-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th className="an-th-sort" onClick={() => handleSort('breakfast')}>🥐{sortIcon('breakfast')}</th>
                            <th className="an-th-sort" onClick={() => handleSort('lunch')}>🍛{sortIcon('lunch')}</th>
                            <th className="an-th-sort" onClick={() => handleSort('dinner')}>🍽️{sortIcon('dinner')}</th>
                            <th className="an-th-sort" onClick={() => handleSort('totalMeals')}>Total{sortIcon('totalMeals')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStudents().map((s, i) => (
                            <tr key={s.email}>
                              <td className="an-td-muted">{i+1}</td>
                              <td className="an-td-name">{s.name}</td>
                              <td className="an-td-email">{s.email}</td>
                              <td className="an-td-center">
                                <span className="an-meal-chip b">{s.breakfast}</span>
                              </td>
                              <td className="an-td-center">
                                <span className="an-meal-chip l">{s.lunch}</span>
                              </td>
                              <td className="an-td-center">
                                <span className="an-meal-chip d">{s.dinner}</span>
                              </td>
                              <td className="an-td-total">{s.totalMeals}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;