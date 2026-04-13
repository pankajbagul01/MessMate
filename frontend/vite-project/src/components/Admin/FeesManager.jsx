import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMealPricing, setMealPricing,
  getMonthlyFees, markFeePaid, getStudentFeeHistory,
} from '../../services/api';
import './FeesManager.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MEAL_ICONS = { breakfast:'🥐', lunch:'🍛', dinner:'🍽️' };

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FeesManager = () => {
  const navigate = useNavigate();

  const now = new Date();
  const [selMonth,  setSelMonth]  = useState(now.getMonth() + 1);
  const [selYear,   setSelYear]   = useState(now.getFullYear());
  const [feesData,  setFeesData]  = useState(null);
  const [pricing,   setPricing]   = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [marking,   setMarking]   = useState(null); // userId being toggled

  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all'); // all | paid | unpaid
  const [sortCol,   setSortCol]   = useState('name');
  const [sortDir,   setSortDir]   = useState('asc');

  // Pricing editor
  const [editPricing, setEditPricing] = useState(false);
  const [draftPricing, setDraftPricing] = useState({ breakfast: 0, lunch: 0, dinner: 0 });

  // Student history modal
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyData,    setHistoryData]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notes modal
  const [notesModal, setNotesModal] = useState(null); // { userId, name, notes }

  const [msg, setMsg] = useState({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pricingRes, feesRes] = await Promise.allSettled([
        getMealPricing(),
        getMonthlyFees(selYear, selMonth),
      ]);
      if (pricingRes.status === 'fulfilled') {
        const p = pricingRes.value.data;
        setPricing(p);
        setDraftPricing({ breakfast: p.breakfast, lunch: p.lunch, dinner: p.dinner });
      }
      if (feesRes.status === 'fulfilled') {
        setFeesData(feesRes.value.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selMonth, selYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSavePricing = async () => {
    const { breakfast, lunch, dinner } = draftPricing;
    if ([breakfast, lunch, dinner].some(v => isNaN(+v) || +v < 0)) {
      showMsg('error', 'All prices must be valid non-negative numbers'); return;
    }
    setSaving(true);
    try {
      await setMealPricing({ breakfast: +breakfast, lunch: +lunch, dinner: +dinner });
      showMsg('success', 'Meal prices updated. Refresh to see recalculated fees.');
      setEditPricing(false);
      fetchAll();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Failed to save pricing'); }
    finally { setSaving(false); }
  };

  const handleTogglePaid = async (fee, paid) => {
    setMarking(fee.student._id);
    try {
      await markFeePaid({
        userId: fee.student._id,
        year: selYear,
        month: selMonth,
        paid,
        notes: notesModal?.notes || fee.notes || '',
      });
      showMsg('success', paid ? `${fee.student.name} marked as paid` : `${fee.student.name} marked as unpaid`);
      fetchAll();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Failed to update payment'); }
    finally { setMarking(null); }
  };

  const openHistory = async (student) => {
    setHistoryStudent(student);
    setHistoryLoading(true);
    try {
      const res = await getStudentFeeHistory(student._id);
      setHistoryData(res.data);
    } catch (e) { setHistoryData([]); }
    finally { setHistoryLoading(false); }
  };

  const exportCSV = () => {
    if (!feesData) return;
    const rows = sortedFees();
    const hdr  = 'Name,Email,Breakfast,Lunch,Dinner,Total Meals,Amount,Status\n';
    const body = rows.map(f =>
      `"${f.student.name}","${f.student.email}",${f.breakfastCount},${f.lunchCount},${f.dinnerCount},${f.totalMeals},${f.totalAmount},${f.paid ? 'Paid' : 'Unpaid'}`
    ).join('\n');
    const blob = new Blob([hdr+body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `fees_${selYear}_${MONTHS[selMonth-1]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── sorting / filtering ──
  const sortedFees = () => {
    if (!feesData?.fees) return [];
    let rows = [...feesData.fees];
    if (search) rows = rows.filter(f =>
      f.student.name.toLowerCase().includes(search.toLowerCase()) ||
      f.student.email.toLowerCase().includes(search.toLowerCase())
    );
    if (filter === 'paid')   rows = rows.filter(f => f.paid);
    if (filter === 'unpaid') rows = rows.filter(f => !f.paid && f.totalMeals > 0);
    rows.sort((a, b) => {
      let av = sortCol === 'name'   ? a.student.name :
               sortCol === 'meals'  ? a.totalMeals :
               sortCol === 'amount' ? a.totalAmount : a.student.name;
      let bv = sortCol === 'name'   ? b.student.name :
               sortCol === 'meals'  ? b.totalMeals :
               sortCol === 'amount' ? b.totalAmount : b.student.name;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const rows = sortedFees();

  return (
    <div className="fm-container">

      {/* Header */}
      <div className="fm-header">
        <div>
          <button className="fm-back" onClick={() => navigate('/admin')}>← Dashboard</button>
          <h1>Fees Manager</h1>
          <p>Calculate monthly meal fees, track payments, and manage meal pricing.</p>
        </div>
        <button className="fm-btn-outline" onClick={() => setEditPricing(true)}>
          ⚙ Set Meal Prices
        </button>
      </div>

      {/* Alert */}
      {msg.text && <div className={`fm-alert fm-alert-${msg.type}`}>{msg.text}</div>}

      {/* Pricing summary */}
      <div className="fm-pricing-strip">
        {['breakfast','lunch','dinner'].map(meal => (
          <div key={meal} className="fm-price-pill">
            {MEAL_ICONS[meal]}
            <span>{meal.charAt(0).toUpperCase()+meal.slice(1)}</span>
            <strong>{fmt(pricing[meal])}</strong>
          </div>
        ))}
        <span className="fm-pricing-note">per meal · <button className="fm-link" onClick={() => setEditPricing(true)}>Edit prices</button></span>
      </div>

      {/* Month selector + summary cards */}
      <div className="fm-controls">
        <div className="fm-month-selects">
          <select value={selMonth} onChange={e => setSelMonth(+e.target.value)}>
            {FULL_MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(+e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="fm-controls-right">
          {feesData && (
            <button className="fm-btn-outline" onClick={exportCSV}>↓ Export CSV</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"/><p>Calculating fees…</p></div>
      ) : feesData && (
        <>
          {/* Summary KPIs */}
          <div className="fm-kpi-row">
            <div className="fm-kpi">
              <span className="fm-kpi-num">{feesData.totalStudents}</span>
              <span className="fm-kpi-label">Students</span>
            </div>
            <div className="fm-kpi green">
              <span className="fm-kpi-num">{feesData.totalPaid}</span>
              <span className="fm-kpi-label">Paid</span>
            </div>
            <div className="fm-kpi orange">
              <span className="fm-kpi-num">{feesData.totalUnpaid}</span>
              <span className="fm-kpi-label">Unpaid</span>
            </div>
            <div className="fm-kpi blue">
              <span className="fm-kpi-num">{fmt(feesData.totalRevenue)}</span>
              <span className="fm-kpi-label">Collected</span>
            </div>
            <div className="fm-kpi red">
              <span className="fm-kpi-num">{fmt(feesData.pendingRevenue)}</span>
              <span className="fm-kpi-label">Pending</span>
            </div>
          </div>

          {/* Filters + search */}
          <div className="fm-table-toolbar">
            <div className="fm-filter-tabs">
              {['all','paid','unpaid'].map(f => (
                <button key={f} className={`fm-filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                  <span className="fm-tab-count">
                    {f==='all'    ? feesData.fees.length :
                     f==='paid'   ? feesData.totalPaid :
                                    feesData.totalUnpaid}
                  </span>
                </button>
              ))}
            </div>
            <input
              className="fm-search"
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="fm-table-wrap">
            <table className="fm-table">
              <thead>
                <tr>
                  <th className="fm-th-sort" onClick={() => handleSort('name')}>Student{sortIcon('name')}</th>
                  <th>🥐 B</th>
                  <th>🍛 L</th>
                  <th>🍽️ D</th>
                  <th className="fm-th-sort" onClick={() => handleSort('meals')}>Meals{sortIcon('meals')}</th>
                  <th className="fm-th-sort" onClick={() => handleSort('amount')}>Amount{sortIcon('amount')}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="fm-td-empty">No students match this filter.</td></tr>
                ) : rows.map(fee => (
                  <tr key={fee.student._id} className={fee.paid ? 'fm-row-paid' : fee.totalMeals===0 ? 'fm-row-zero' : ''}>
                    <td>
                      <div className="fm-student-cell">
                        <span className="fm-student-name">{fee.student.name}</span>
                        <span className="fm-student-email">{fee.student.email}</span>
                        {fee.notes && <span className="fm-notes-chip" title={fee.notes}>📝</span>}
                      </div>
                    </td>
                    <td className="fm-td-center">
                      <span className="fm-meal-chip b">{fee.breakfastCount}</span>
                    </td>
                    <td className="fm-td-center">
                      <span className="fm-meal-chip l">{fee.lunchCount}</span>
                    </td>
                    <td className="fm-td-center">
                      <span className="fm-meal-chip d">{fee.dinnerCount}</span>
                    </td>
                    <td className="fm-td-center fm-td-meals">{fee.totalMeals}</td>
                    <td className="fm-td-amount">{fmt(fee.totalAmount)}</td>
                    <td>
                      {fee.totalMeals === 0 ? (
                        <span className="fm-status-badge zero">No meals</span>
                      ) : fee.paid ? (
                        <span className="fm-status-badge paid">
                          ✓ Paid
                          {fee.paidAt && <span className="fm-paid-date">{new Date(fee.paidAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                        </span>
                      ) : (
                        <span className="fm-status-badge unpaid">Unpaid</span>
                      )}
                    </td>
                    <td>
                      <div className="fm-action-btns">
                        {fee.totalMeals > 0 && (
                          <>
                            {!fee.paid ? (
                              <button
                                className="fm-btn-pay"
                                disabled={marking === fee.student._id}
                                onClick={() => handleTogglePaid(fee, true)}
                              >
                                {marking === fee.student._id ? '…' : 'Mark Paid'}
                              </button>
                            ) : (
                              <button
                                className="fm-btn-unpay"
                                disabled={marking === fee.student._id}
                                onClick={() => handleTogglePaid(fee, false)}
                              >
                                {marking === fee.student._id ? '…' : 'Undo'}
                              </button>
                            )}
                          </>
                        )}
                        <button className="fm-btn-hist" onClick={() => openHistory(fee.student)}>History</button>
                        <button className="fm-btn-note" onClick={() => setNotesModal({ userId: fee.student._id, name: fee.student.name, notes: fee.notes || '' })}>
                          📝
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breakdown footer */}
          <div className="fm-breakdown">
            <div className="fm-breakdown-title">Pricing breakdown for {FULL_MONTHS[selMonth-1]} {selYear}</div>
            <div className="fm-breakdown-row">
              {['breakfast','lunch','dinner'].map(m => (
                <span key={m}>{MEAL_ICONS[m]} {m.charAt(0).toUpperCase()+m.slice(1)}: {fmt(feesData.rates[m])} × meals booked</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Pricing editor modal ── */}
      {editPricing && (
        <div className="fm-modal-overlay" onClick={() => setEditPricing(false)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <h3>Set Meal Prices</h3>
              <button className="fm-modal-close" onClick={() => setEditPricing(false)}>×</button>
            </div>
            <p className="fm-modal-sub">These prices are used to calculate monthly fees for all students.</p>
            <div className="fm-pricing-fields">
              {['breakfast','lunch','dinner'].map(meal => (
                <div key={meal} className="fm-price-field">
                  <label>{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase()+meal.slice(1)} (₹ per meal)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={draftPricing[meal]}
                    onChange={e => setDraftPricing(p => ({...p, [meal]: e.target.value}))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
            <div className="fm-modal-preview">
              <span>Example: 30 breakfasts × {fmt(draftPricing.breakfast||0)} = {fmt((draftPricing.breakfast||0)*30)}</span>
            </div>
            <div className="fm-modal-actions">
              <button className="fm-btn-outline" onClick={() => setEditPricing(false)}>Cancel</button>
              <button className="fm-btn-primary" disabled={saving} onClick={handleSavePricing}>
                {saving ? 'Saving…' : 'Save Prices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History modal ── */}
      {historyStudent && (
        <div className="fm-modal-overlay" onClick={() => setHistoryStudent(null)}>
          <div className="fm-modal fm-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <h3>{historyStudent.name} — Payment History</h3>
              <button className="fm-modal-close" onClick={() => setHistoryStudent(null)}>×</button>
            </div>
            {historyLoading ? (
              <div style={{padding:'24px',textAlign:'center',color:'var(--text-muted)'}}>Loading…</div>
            ) : historyData.length === 0 ? (
              <p className="fm-modal-empty">No payment records yet.</p>
            ) : (
              <table className="fm-table fm-hist-table">
                <thead>
                  <tr>
                    <th>Month</th><th>🥐 B</th><th>🍛 L</th><th>🍽️ D</th><th>Amount</th><th>Status</th><th>Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map(r => (
                    <tr key={`${r.year}-${r.month}`} className={r.paid ? 'fm-row-paid' : ''}>
                      <td className="fm-td-month">{MONTHS[r.month-1]} {r.year}</td>
                      <td className="fm-td-center">{r.breakfastCount}</td>
                      <td className="fm-td-center">{r.lunchCount}</td>
                      <td className="fm-td-center">{r.dinnerCount}</td>
                      <td className="fm-td-amount">{fmt(r.totalAmount)}</td>
                      <td>
                        <span className={`fm-status-badge ${r.paid?'paid':'unpaid'}`}>
                          {r.paid ? '✓ Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="fm-td-center" style={{fontSize:'12px',color:'var(--text-muted)'}}>
                        {r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Notes modal ── */}
      {notesModal && (
        <div className="fm-modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <h3>Notes — {notesModal.name}</h3>
              <button className="fm-modal-close" onClick={() => setNotesModal(null)}>×</button>
            </div>
            <textarea
              className="fm-notes-textarea"
              placeholder="Add a note about this student's payment (optional)…"
              value={notesModal.notes}
              onChange={e => setNotesModal(p => ({...p, notes: e.target.value}))}
              rows={4}
            />
            <div className="fm-modal-actions">
              <button className="fm-btn-outline" onClick={() => setNotesModal(null)}>Cancel</button>
              <button className="fm-btn-primary" onClick={async () => {
                const fee = feesData?.fees?.find(f => f.student._id === notesModal.userId);
                if (fee) await handleTogglePaid({...fee, notes: notesModal.notes}, fee.paid);
                setNotesModal(null);
              }}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesManager;