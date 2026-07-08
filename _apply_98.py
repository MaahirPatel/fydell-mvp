# -*- coding: utf-8 -*-
"""Apply 98% visual push: analytics rebuild + grouped sidebars."""
import re
from pathlib import Path

PATH = Path(__file__).parent / "fydell-new-mvp.html"
html = PATH.read_text(encoding="utf-8")

SPARK = '<svg class="spark" viewBox="0 0 140 36" preserveAspectRatio="none"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff" stop-opacity=".35"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs><polygon points="0,36 0,24 18,20 36,26 54,16 72,18 90,12 108,14 126,8 140,6 140,36" fill="url(#spg)"/><polyline points="0,24 18,20 36,26 54,16 72,18 90,12 108,14 126,8 140,6" fill="none" stroke="#8b6bff" stroke-width="1.5"/></svg>'

SIDE_CAND = '''  <aside class="side side-group">
    <a class="logo" onclick="go('landing')"><span class="mark"><svg class="mark-img" width="30" height="19" aria-label="Fydell"><use href="#fy-mark"/></svg></span><span class="word">fydell</span></a>
    <div class="side-nav-label">Overview</div>
    <nav><a class="" onclick="go('landing')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg><span>Home</span></a><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></a></nav>
    <div class="side-nav-label">Simulations</div>
    <nav><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Simulations</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span>Question Library</span></a></nav>
    <div class="side-nav-label">Talent</div>
    <nav><a class="on" onclick="go('candidates')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg><span>Candidates</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/></svg><span>Invitations</span></a></nav>
    <div class="side-nav-label">Insights</div>
    <nav><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><span>Reports</span></a><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="0.5"/><rect x="12" y="7" width="3" height="10" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/></svg><span>Analytics</span></a></nav>
    <div class="side-nav-label">Settings</div>
    <nav><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>Team</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/></svg><span>Templates</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>Integrations</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Company Settings</span></a></nav>
    <div class="side-foot"><a href="#"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Get help</a></div>
  </aside>'''

SIDE_SIMS = '''  <aside class="side side-sims">
    <a class="logo" onclick="go('landing')"><span class="mark"><svg class="mark-img" width="30" height="19" aria-label="Fydell"><use href="#fy-mark"/></svg></span><span class="word">fydell</span></a>
    <div class="org-pick"><div class="av">Y</div><div><div class="nm">Your organization</div><div class="em">Enterprise plan</div></div><span class="chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span></div>
    <nav><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></a><a class="on" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Simulations</span></a><a class="" onclick="go('candidates')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>Candidates</span></a><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="0.5"/><rect x="12" y="7" width="3" height="10" rx="0.5"/></svg><span>Analytics</span></a></nav>
    <div class="upsell"><div class="ut">Upgrade plan</div><p>Unlock advanced simulations, team insights, and more.</p><div class="diamond"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 7-10 13L2 10z"/></svg></div><button class="btn" onclick="go('pricing')">View plans</button></div>
    <div class="side-foot"><a href="#"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help &amp; Support</a></div>
  </aside>'''

SIDE_AN = '''  <aside class="side side-an">
    <a class="logo" onclick="go('landing')"><span class="mark"><svg class="mark-img" width="30" height="19" aria-label="Fydell"><use href="#fy-mark"/></svg></span><span class="word">fydell</span></a>
    <div class="side-nav-label" style="padding-top:4px">AI-Powered Simulations</div>
    <nav><a class="" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Dashboard</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Simulations</span></a><a class="" onclick="go('candidates')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>Candidates</span></a><a class="on" onclick="go('analytics')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="0.5"/><rect x="12" y="7" width="3" height="10" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/></svg><span>Analytics</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg><span>Assessments</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><span>Question Library</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg><span>Integrations</span></a><a class="" onclick="go('app-sims')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Settings</span></a></nav>
    <div class="side-plan"><b>Current plan</b><span style="color:var(--muted);font-size:11px">Enterprise</span><a href="#" onclick="go('pricing');return false">View usage →</a></div>
    <div class="side-foot"><a href="#"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help &amp; Support</a><a href="#"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Collapse</a></div>
  </aside>'''

ANALYTICS = f'''<section class="app" data-view="analytics">
{SIDE_AN}
  <div class="main" style="grid-template-columns:1fr">
    <div class="main-col">
      <div class="an-page-head">
        <div>
          <h1 class="page-title" style="font-size:22px;margin:0">Analytics</h1>
          <p class="page-sub" style="margin-top:4px">Measure what matters. Improve hiring outcomes.</p>
        </div>
        <div class="an-page-actions">
          <button class="nd-share" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg> Share report</button>
          <button class="nd-kebab" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
        </div>
      </div>
      <div class="an-filters">
        <span class="filt" style="height:32px;font-size:12px">Time range: Last 30 days <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
        <span class="filt" style="height:32px;font-size:12px">Role: All roles <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
        <span class="filt" style="height:32px;font-size:12px">Team: All teams <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
      </div>
      <div class="an-cards">
        <div class="an-card"><div class="ah"><span>Signal Quality</span></div><div class="metric-line"><div class="av">86%</div><div class="ad trend-up">+4 pts</div></div><div class="ak"><span class="rec-pill rec-signal" style="font-size:9px;padding:2px 7px">Strong</span></div>{SPARK}</div>
        <div class="an-card"><div class="ah"><span>Completion Rate</span></div><div class="metric-line"><div class="av">72%</div><div class="ad trend-up">+6 pts</div></div><div class="ak"><span class="rec-pill rec-review" style="font-size:9px;padding:2px 7px">Good</span></div>{SPARK}</div>
        <div class="an-card"><div class="ah"><span>Time to Decision</span></div><div class="metric-line"><div class="av">5.2 days</div><div class="ad trend-up">-0.8 days</div></div><div class="ak"><span class="rec-pill rec-signal" style="font-size:9px;padding:2px 7px">Faster</span></div>{SPARK}</div>
        <div class="an-card"><div class="ah"><span>Candidate Throughput</span></div><div class="metric-line"><div class="av">312</div><div class="ad trend-up">+18%</div></div><div class="ak"><span class="rec-pill rec-review" style="font-size:9px;padding:2px 7px">Up</span></div>{SPARK}</div>
      </div>
      <div class="an-row2">
        <div class="an-panel">
          <h3>Score distribution</h3><div class="ps">All completed simulations · last 90 days</div>
          <div class="an-area-wrap">
            <div class="an-area-chart"><svg width="100%" viewBox="0 0 480 180" style="display:block"><defs><linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff" stop-opacity=".35"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs><polygon points="20,160 20,120 80,100 140,110 200,80 260,90 320,60 380,70 440,40 460,35 460,160" fill="url(#areaG)"/><polyline points="20,120 80,100 140,110 200,80 260,90 320,60 380,70 440,40 460,35" fill="none" stroke="#8b6bff" stroke-width="2"/><polyline points="20,130 80,115 140,125 200,95 260,105 320,75 380,85 440,55 460,50" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 4"/><text x="20" y="175" fill="#64748b" font-size="9" font-family="Inter">40</text><text x="140" y="175" fill="#64748b" font-size="9" font-family="Inter">55</text><text x="260" y="175" fill="#64748b" font-size="9" font-family="Inter">70</text><text x="380" y="175" fill="#64748b" font-size="9" font-family="Inter">85</text></svg></div>
            <div class="an-stat-side"><div class="si"><div class="k">Mean score</div><div class="v">72</div></div><div class="si"><div class="k">Median score</div><div class="v">71</div></div><div class="si"><div class="k">Top decile</div><div class="v">18%</div></div></div>
          </div>
        </div>
        <div class="an-panel">
          <h3>Top skill area trends</h3><div class="ps">Change vs previous period</div>
          <div class="an-skill-list">
            <div class="an-skill-item"><span class="name">Analytical Reasoning</span><span class="pct" style="color:var(--green)">+8%</span><div class="bar"><i class="up" style="width:88%"></i></div></div>
            <div class="an-skill-item"><span class="name">Problem Solving</span><span class="pct" style="color:var(--green)">+5%</span><div class="bar"><i class="up" style="width:82%"></i></div></div>
            <div class="an-skill-item"><span class="name">Business Judgment</span><span class="pct" style="color:var(--green)">+3%</span><div class="bar"><i class="up" style="width:76%"></i></div></div>
            <div class="an-skill-item"><span class="name">Communication</span><span class="pct" style="color:var(--danger)">-2%</span><div class="bar"><i class="down" style="width:68%"></i></div></div>
            <div class="an-skill-item"><span class="name">Data Analysis</span><span class="pct" style="color:var(--green)">+4%</span><div class="bar"><i class="up" style="width:80%"></i></div></div>
          </div>
        </div>
      </div>
      <div class="an-row3">
        <div class="an-panel">
          <h3>Benchmark vs industry</h3><div class="ps">Skill percentile heatmap</div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted-2);margin:10px 0 6px"><span></span><span>&lt;25p</span><span>25p</span><span>50p</span><span>75p</span><span>&gt;90p</span></div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Financial Modeling</div>
          <div class="bm-grid"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><i class="c5"></i><i class="c5"></i></div>
          <div style="font-size:11px;color:var(--muted);margin:10px 0 4px">Data Analysis</div>
          <div class="bm-grid"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c3"></i><i class="c4"></i><i class="c4"></i></div>
          <div style="font-size:11px;color:var(--muted);margin:10px 0 4px">Business Judgment</div>
          <div class="bm-grid"><i class="c1"></i><i class="c2"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><i class="c5"></i></div>
          <div class="bm-legend"><span><b style="background:rgba(59,130,246,.4)"></b>Below</span><span><b style="background:rgba(61,214,140,.5)"></b>At/above</span></div>
        </div>
        <div class="an-panel">
          <h3>Performance by department</h3><div class="ps">Average simulation score</div>
          <table class="perf-table"><thead><tr><th>Department</th><th>Avg. score</th><th>vs prev.</th><th>Candidates</th></tr></thead><tbody>
            <tr><td>Finance</td><td><span class="mini-bar"><i style="width:88%"></i></span>88%</td><td style="color:var(--green)">+4%</td><td>42</td></tr>
            <tr><td>Consulting</td><td><span class="mini-bar"><i style="width:86%"></i></span>86%</td><td style="color:var(--green)">+2%</td><td>38</td></tr>
            <tr><td>Operations</td><td><span class="mini-bar"><i style="width:82%"></i></span>82%</td><td style="color:var(--green)">+1%</td><td>29</td></tr>
            <tr><td>Product</td><td><span class="mini-bar"><i style="width:79%"></i></span>79%</td><td style="color:var(--danger)">-1%</td><td>24</td></tr>
          </tbody></table>
        </div>
        <div class="an-panel">
          <h3>Performance by role</h3><div class="ps">Average simulation score</div>
          <table class="perf-table"><thead><tr><th>Role</th><th>Avg. score</th><th>vs prev.</th><th>Candidates</th></tr></thead><tbody>
            <tr><td>Financial Analyst</td><td><span class="mini-bar"><i style="width:86%"></i></span>86%</td><td style="color:var(--green)">+3%</td><td>56</td></tr>
            <tr><td>Consultant</td><td><span class="mini-bar"><i style="width:84%"></i></span>84%</td><td style="color:var(--green)">+2%</td><td>44</td></tr>
            <tr><td>Product Manager</td><td><span class="mini-bar"><i style="width:78%"></i></span>78%</td><td style="color:var(--danger)">-2%</td><td>31</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="an-bottom">
        <div class="an-panel">
          <h3>Insights</h3><div class="ps">AI-generated observations from your hiring data</div>
          <div class="an-insights-list">
            <div class="an-insight-row"><span class="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></span>Finance cohorts show the strongest analytical reasoning scores this period.</div>
            <div class="an-insight-row"><span class="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/></svg></span>Completion rates improved 6 points after shortening simulation length.</div>
            <div class="an-insight-row"><span class="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>Time to decision dropped below 6 days for the first time in 90 days.</div>
          </div>
        </div>
      </div>
      <div class="an-trust">
        <div class="lbl">Trusted by modern hiring teams</div>
        <div class="trust-icons">
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M12 3L3 8h18z"/></svg>Financial Services</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>Technology</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Consulting</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2z"/></svg>Healthcare</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>Retail</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-5-7 5v12z"/></svg>Manufacturing</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>Professional Services</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>Startups</span>
        </div>
      </div>
    </div>
  </div>
</section>'''

def replace_section(view, new_content, is_section=True):
    global html
    tag = 'section' if is_section else 'main'
    pat = rf'<{tag} class="[^"]*" data-view="{view}">.*?</{tag}>'
    m = re.search(pat, html, re.DOTALL)
    if not m:
        raise SystemExit(f"Could not find data-view={view}")
    html = html[:m.start()] + new_content + html[m.end():]

# Replace analytics
replace_section('analytics', ANALYTICS)

# Replace sidebars in app-sims and candidates
def replace_aside(view, new_aside):
    global html
    pat = rf'(<section class="app" data-view="{view}">\s*)<aside class="side">.*?</aside>'
    html, n = re.subn(pat, rf'\1{new_aside}', html, count=1, flags=re.DOTALL)
    if n != 1:
        raise SystemExit(f"aside replace failed for {view}")

replace_aside('app-sims', SIDE_SIMS)
replace_aside('candidates', SIDE_CAND)

# Pricing inline typography
html = html.replace(
    'font-size:clamp(44px,5.2vw,76px);line-height:1;letter-spacing:-.05em;font-weight:850;margin:18px 0 20px',
    'class="price-h1" style="margin:14px 0 16px"'
)
html = html.replace('font-size:18px;color:var(--muted);line-height:1.6', 'class="price-lead"')
html = html.replace(
    'font-size:clamp(34px,3.6vw,52px);line-height:1.06;letter-spacing:-.04em;font-weight:850;margin:16px 0 18px',
    'class="demo-h2" style="margin:12px 0 14px"'
)
html = html.replace('font-size:17px;color:var(--muted);line-height:1.6;margin-bottom:8px', 'class="demo-lead" style="margin-bottom:8px"')

# Company inline sizes
html = html.replace('font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1.15;margin:8px 0 16px', 'class="co-mission-h"')
html = html.replace('font-size:15px;line-height:1.65', 'class="co-mission-p"')

# Sim page button heights
html = html.replace('style="height:44px"', 'style="height:36px"')

PATH.write_text(html, encoding="utf-8")
print("Applied 98% push: analytics + sidebars + inline type fixes")
