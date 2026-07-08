"""Apply approved copy + hero live-sim preview to fydell-new-mvp.html"""
from pathlib import Path
import re

p = Path(__file__).parent / "fydell-new-mvp.html"
text = p.read_text(encoding="utf-8")

HERO_SIM_CSS = """
/* hero — live simulation preview (reference layout) */
.hero-sim{min-height:520px!important;display:flex!important;flex-direction:column!important;overflow:hidden}
.hs-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border-soft);background:#070b14}
.hs-top .hs-brand{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;color:#fff}
.hs-top .hs-timer{font-family:ui-monospace,monospace;font-size:11px;color:#c2cad8;background:rgba(255,255,255,.04);border:1px solid var(--border-soft);padding:4px 8px;border-radius:6px}
.hs-steps{display:flex;gap:6px;flex-wrap:wrap}
.hs-steps span{font-size:9px;color:var(--muted);padding:3px 7px;border-radius:5px;border:1px solid var(--border-soft)}
.hs-steps span.on{color:#fff;border-color:rgba(124,92,255,.45);background:rgba(124,92,255,.12)}
.hs-body{flex:1;display:grid;grid-template-columns:0.72fr 1.35fr 0.78fr;gap:0;min-height:0}
.hs-col{border-right:1px solid var(--border-soft);padding:10px;overflow:hidden;background:rgba(255,255,255,.012)}
.hs-col:last-child{border-right:none}
.hs-label{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-2);margin-bottom:8px}
.hs-scenario h4{font-size:11px;font-weight:650;color:#fff;margin-bottom:4px}
.hs-scenario p{font-size:9.5px;color:var(--muted);line-height:1.45;margin-bottom:8px}
.hs-file{display:flex;align-items:center;gap:6px;font-size:9px;color:#c2cad8;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.hs-file:last-child{border:none}
.hs-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
.hs-kpi{background:rgba(255,255,255,.025);border:1px solid var(--border-soft);border-radius:8px;padding:6px}
.hs-kpi .k{font-size:8px;color:var(--muted-2)}
.hs-kpi .v{font-size:11px;font-weight:700;color:#fff;margin-top:2px}
.hs-kpi .d{font-size:8px;color:var(--green);margin-top:2px}
.hs-chart{height:72px;border-radius:8px;border:1px solid var(--border-soft);background:rgba(255,255,255,.02);padding:6px;margin-bottom:8px}
.hs-table{width:100%;border-collapse:collapse;font-size:8px}
.hs-table th,.hs-table td{padding:4px 5px;text-align:left;border-bottom:1px solid rgba(255,255,255,.04);color:#9aa4b8}
.hs-table th{color:var(--muted-2);font-weight:500}
.hs-chat .msg{margin-bottom:7px}
.hs-chat .role{font-size:8px;font-weight:700;color:#8eb0ff;margin-bottom:2px}
.hs-chat .role.you{color:var(--violet)}
.hs-chat .txt{font-size:9px;color:#c2cad8;line-height:1.4;background:rgba(255,255,255,.03);border:1px solid var(--border-soft);border-radius:7px;padding:5px 7px}
.hs-ring-wrap{display:flex;align-items:center;gap:10px;margin:8px 0}
.hs-ring{width:52px;height:52px;border-radius:50%;background:conic-gradient(var(--violet) 0 58%, rgba(255,255,255,.08) 58% 100%);display:flex;align-items:center;justify-content:center;position:relative}
.hs-ring::after{content:"";position:absolute;inset:6px;border-radius:50%;background:#0a0e1a}
.hs-ring b{position:relative;z-index:1;font-size:10px;color:#fff}
.hs-insight{font-size:8.5px;color:var(--muted);padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between}
.hs-insight span{color:var(--green);font-weight:600}
"""

HERO_SIM_HTML = """<div class="dash hero-sim">
        <div class="hs-top">
          <div class="hs-brand"><svg width="18" height="11" aria-hidden="true"><use href="#fy-mark"/></svg> Project Meridian</div>
          <div class="hs-steps"><span class="on">1 Analyze</span><span>2 Strategy</span><span>3 Model</span><span>4 Present</span><span>5 Q&amp;A</span></div>
          <div class="hs-timer">23:58</div>
        </div>
        <div class="hs-body">
          <div class="hs-col">
            <div class="hs-label">Scenario</div>
            <div class="hs-scenario">
              <h4>Acquisition Analysis</h4>
              <p>Evaluate whether to recommend acquiring a target company for $2.4B.</p>
            </div>
            <div class="hs-label">Files</div>
            <div class="hs-file"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> Case_Info_Memo.pdf</div>
            <div class="hs-file"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3dd68c" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> Financial_Statements.xlsx</div>
            <div class="hs-file"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8eb0ff" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> Industry_Analysis.pdf</div>
          </div>
          <div class="hs-col">
            <div class="hs-kpis">
              <div class="hs-kpi"><div class="k">Revenue (LTM)</div><div class="v">$1.23B</div><div class="d">+18.6% YoY</div></div>
              <div class="hs-kpi"><div class="k">EBITDA Margin</div><div class="v">20.1%</div><div class="d">+1.2pp</div></div>
              <div class="hs-kpi"><div class="k">EV / EBITDA</div><div class="v">8.6x</div><div class="d">in range</div></div>
            </div>
            <div class="hs-chart"><svg width="100%" height="100%" viewBox="0 0 280 56" preserveAspectRatio="none"><defs><linearGradient id="hsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff" stop-opacity=".35"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs><polygon points="0,56 0,38 40,32 80,36 120,24 160,28 200,18 240,22 280,12 280,56" fill="url(#hsg)"/><polyline points="0,38 40,32 80,36 120,24 160,28 200,18 240,22 280,12" fill="none" stroke="#8b6bff" stroke-width="1.5"/></svg></div>
            <table class="hs-table"><thead><tr><th>Metric</th><th>2024A</th><th>2025E</th><th>YoY</th></tr></thead><tbody><tr><td>Revenue</td><td>742</td><td>786</td><td>5.9%</td></tr><tr><td>EBITDA</td><td>146</td><td>158</td><td>8.2%</td></tr><tr><td>FCF</td><td>66</td><td>72</td><td>9.1%</td></tr></tbody></table>
          </div>
          <div class="hs-col">
            <div class="hs-label">Team chat</div>
            <div class="hs-chat">
              <div class="msg"><div class="role">Manager</div><div class="txt">Focus on the key value drivers and downside risks.</div></div>
              <div class="msg"><div class="role you">You</div><div class="txt">Reviewing the materials now and drafting the recommendation.</div></div>
              <div class="msg"><div class="role">Associate</div><div class="txt">I updated the assumptions and refreshed the analysis.</div></div>
            </div>
            <div class="hs-ring-wrap"><div class="hs-ring"><b>58%</b></div><div style="font-size:9px;color:var(--muted)">Simulation<br>progress</div></div>
            <div class="hs-label">Live insights</div>
            <div class="hs-insight">Revenue trend above peer avg <span>Up</span></div>
            <div class="hs-insight">Margin holds under stress <span>Up</span></div>
          </div>
        </div>
      </div>"""

# Inject CSS before utility block
if ".hero-sim{" not in text:
    text = text.replace("/* utility */", HERO_SIM_CSS + "\n/* utility */", 1)

# Replace hero dashboard block
text = re.sub(
    r'<div class="hero-stage">\s*<div class="dash">.*?</div>\s*</div>\s*</section>',
    f'<div class="hero-stage">\n      {HERO_SIM_HTML}\n    </div>\n  </section>',
    text,
    count=1,
    flags=re.DOTALL,
)

replacements = [
    ("<title>Fydell — See the work. Hire with conviction.</title>", "<title>Fydell — Hire with Conviction</title>"),
    ("<h1>See the work.<br><span class=\"grad-text\">Hire with conviction.</span></h1>",
     "<h1>Hire with <span class=\"grad-text\">Conviction</span></h1>"),
    ("<p class=\"sub\">Immersive simulations reveal how candidates think, decide, and perform—so you can hire the right people, not just the right resumes.</p>",
     "<p class=\"sub\">Fydell uses immersive simulations to reveal how people think, decide, and perform — so teams can hire based on real work, not polished resumes.</p>"),
    ("<div class=\"lbl\">TRUSTED BY MODERN HIRING TEAMS</div>",
     "<div class=\"lbl\">TRUSTED BY MODERN HIRING TEAMS</div>"),
    ("<h3>Real work. Real insight.</h3><p>Role-specific simulations show how candidates think and solve problems on the job.</p>",
     "<h3>Real work, real decisions</h3><p>Candidates step into realistic scenarios that mirror the challenges of the role.</p>"),
    ("<h3>Data you can trust.</h3><p>Objective scoring and rich analytics remove bias and surface true potential.</p>",
     "<h3>Data you can trust</h3><p>Structured evidence helps teams compare candidates with more confidence.</p>"),
    ("<h3>Better decisions, together.</h3><p>Collaborate with your team, compare candidates, and make confident, defensible calls.</p>",
     "<h3>Fairer for everyone</h3><p>Every candidate gets the same opportunity to show what they can do.</p>"),
    ("<h3>Built for impact.</h3><p>Improve quality of hire, reduce time to hire, and accelerate team performance.</p>",
     "<h3>Faster, smarter hiring</h3><p>Decision-ready reports help teams move faster without lowering the bar.</p>"),
    ('<div class="nm">Your organization</div><div class="em">Enterprise plan</div>',
     '<div class="nm">Your workspace</div><div class="em">Pilot plan</div>'),
    ('<span style="color:var(--muted);font-size:11px">Enterprise</span>',
     '<span style="color:var(--muted);font-size:11px">Pilot plan</span>'),
    ('data-monthly="$4,900" data-annual="$3,920">$4,900 <small>/month</small>',
     '">Contact us'),
    ('data-monthly="$14,900" data-annual="$11,920">$14,900 <small>/month</small>',
     '">Contact us'),
    ("Financial Analyst Simulation", "Project Meridian — Acquisition Analysis"),
    ("<h3>Q2 Financial Analysis</h3>", "<h3>Project Meridian — Acquisition Analysis</h3>"),
    ("Senior Financial Analyst Simulation", "Project Meridian — Acquisition Analysis"),
]
for a, b in replacements:
    text = text.replace(a, b)

# Trust categories — 6 only
old_trust = re.search(r'<div class="trust-icons">.*?</div>\s*</div></div>', text, re.DOTALL)
if old_trust:
    new_trust = """<div class="trust-icons">
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M12 3L3 8h18z"/></svg>Financial Services</span>
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>Technology</span>
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>Consulting</span>
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2z"/></svg>Healthcare</span>
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>Operations</span>
      <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>Professional Services</span>
    </div>
  </div></div>"""
    text = text[: old_trust.start()] + new_trust + text[old_trust.end() :]

p.write_text(text, encoding="utf-8")
print("Applied visual rebuild to fydell-new-mvp.html")
