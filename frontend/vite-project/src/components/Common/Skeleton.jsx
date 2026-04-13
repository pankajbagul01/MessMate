import React from 'react';
import './Skeleton.css';

// ── Primitive ────────────────────────────────────────────────────────
export const SkeletonBox = ({ width = '100%', height = '16px', radius = '6px', style = {} }) => (
  <div
    className="sk-box"
    style={{ width, height, borderRadius: radius, ...style }}
  />
);

// ── Pre-built page skeletons ─────────────────────────────────────────

export const DashboardSkeleton = () => (
  <div className="sk-page">
    <div className="sk-header-row">
      <div><SkeletonBox width="220px" height="28px" /><SkeletonBox width="160px" height="14px" style={{marginTop:8}} /></div>
      <SkeletonBox width="130px" height="38px" radius="8px" />
    </div>
    <div className="sk-grid-3" style={{marginBottom:28}}>
      {[1,2,3].map(i => <SkeletonBox key={i} height="90px" radius="12px" />)}
    </div>
    <SkeletonBox width="180px" height="20px" style={{marginBottom:14}} />
    <div className="sk-grid-3">
      {[1,2,3].map(i => <SkeletonBox key={i} height="160px" radius="12px" />)}
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 6 }) => (
  <div className="sk-page">
    <div className="sk-header-row">
      <SkeletonBox width="200px" height="28px" />
      <SkeletonBox width="120px" height="36px" radius="8px" />
    </div>
    <div className="sk-grid-5" style={{marginBottom:20}}>
      {[1,2,3,4,5].map(i => <SkeletonBox key={i} height="80px" radius="12px" />)}
    </div>
    <SkeletonBox height="44px" radius="8px" style={{marginBottom:12}} />
    {Array.from({length: rows}).map((_,i) => (
      <SkeletonBox key={i} height="52px" radius="8px" style={{marginBottom:6}} />
    ))}
  </div>
);

export const CardListSkeleton = ({ cards = 4 }) => (
  <div className="sk-page">
    <div className="sk-header-row">
      <SkeletonBox width="200px" height="28px" />
      <SkeletonBox width="110px" height="36px" radius="8px" />
    </div>
    {Array.from({length: cards}).map((_,i) => (
      <div key={i} className="sk-card">
        <div className="sk-card-inner">
          <SkeletonBox width="44px" height="44px" radius="50%" />
          <div style={{flex:1}}>
            <SkeletonBox width="140px" height="16px" style={{marginBottom:8}} />
            <SkeletonBox width="90px" height="12px" />
          </div>
          <SkeletonBox width="80px" height="28px" radius="20px" />
        </div>
        <div className="sk-chips">
          {[1,2,3].map(j => <SkeletonBox key={j} width="70px" height="26px" radius="20px" />)}
        </div>
      </div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="sk-page">
    <SkeletonBox width="220px" height="28px" style={{marginBottom:8}} />
    <SkeletonBox width="340px" height="14px" style={{marginBottom:28}} />
    <div className="sk-form-card">
      {[1,2,3].map(i => (
        <div key={i} style={{marginBottom:20}}>
          <SkeletonBox width="100px" height="13px" style={{marginBottom:8}} />
          <SkeletonBox height="40px" radius="8px" />
        </div>
      ))}
      <SkeletonBox height="42px" radius="8px" />
    </div>
  </div>
);

export const WeeklyMenuSkeleton = () => (
  <div className="sk-page">
    <div className="sk-header-row">
      <SkeletonBox width="200px" height="28px" />
      <SkeletonBox width="130px" height="38px" radius="8px" />
    </div>
    <div className="sk-weekly-layout">
      <div className="sk-day-strip">
        {[1,2,3,4,5,6,7].map(i => <SkeletonBox key={i} height="64px" radius="12px" />)}
      </div>
      <SkeletonBox height="380px" radius="12px" />
    </div>
  </div>
);

export default SkeletonBox;