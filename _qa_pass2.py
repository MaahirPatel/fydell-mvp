"""Second visual QA pass — content + color cleanup for fydell-new-mvp.html"""
from pathlib import Path
import re

p = Path(__file__).parent / "fydell-new-mvp.html"
t = p.read_text(encoding="utf-8")

replacements = [
    # malformed pricing attrs
    ('class="price-num" ">Contact us', 'class="price-num">Contact us'),
    # brand logo — keep pink/purple right ring (reference)
    # ('<stop stop-color="#EC4899"/><stop offset="1" stop-color="#9333EA"/>',
    #  '<stop stop-color="#5b8cff"/><stop offset="1" stop-color="#7c5cff"/>'),
    # plan accent stripe color
    ('#635bff', '#7c5cff'),
    ('rgba(99,91,255', 'rgba(124,92,255'),
    ('--danger:#fb7185', '--danger:#8eb0ff'),
    ('border-color:rgba(251,113,133', 'border-color:rgba(142,176,255'),
    # pink/red UI accents → violet/blue
    ('stroke="#fb7185"', 'stroke="#8eb0ff"'),
    ('#9b5cff,#ec4899', '#7c5cff,#5b8cff'),
    ('#f5b942,#fb7185', '#5b8cff,#7c5cff'),
    ('.an-skill-item .bar i.down{background:linear-gradient(90deg,#fb7185,#f5b942)}',
     '.an-skill-item .bar i.down{background:linear-gradient(90deg,#5b8cff,#7c5cff)}'),
    # generic copy fixes
    ('Research, guides, and real-world stories to help you hire with more confidence, less guesswork, and better outcomes.',
     'Guides, frameworks, and product resources to help hiring teams evaluate work with more confidence.'),
    ('<h3>The Definitive Guide to Work Simulations in Hiring</h3>',
     '<h3>Work Simulation Guide</h3>'),
    ('<span class="res-tag" style="color:#8eb0ff">CASE STUDY</span>\n          <h3>How a finance team scaled hiring without compromise</h3>\n          <p>45% improvement in quality of hire using Fydell simulations.</p>\n          <a class="res-meta">Read story',
     '<span class="res-tag" style="color:#8eb0ff">GUIDE</span>\n          <h3>Hiring Signal Framework</h3>\n          <p>Structure evidence across skills, decisions, and work quality.</p>\n          <a class="res-meta">Read guide'),
    ('<span class="res-tag" style="color:#8eb0ff">BENCHMARK REPORT</span>\n          <h3>2025 Skills Assessment Benchmark Report</h3>\n          <p>Key data from 100K+ anonymized candidates across 12 industries.</p>',
     '<span class="res-tag" style="color:#8eb0ff">TEMPLATE</span>\n          <h3>Structured Evaluation Template</h3>\n          <p>A practical rubric for comparing candidates on demonstrated work.</p>'),
    ('<span class="res-pill">Case studies</span>', ''),
    ('<span class="res-tag">CASE STUDY</span><h3>How a team improved hiring quality by 37%</h3><p>Raising the bar, without slowing down.</p><a class="res-meta">Read story',
     '<span class="res-tag">CHECKLIST</span><h3>Simulation Design Checklist</h3><p>Design role-specific scenarios that mirror real work.</p><a class="res-meta">View checklist'),
    ('<h3>Building a Skills-Based Hiring Strategy</h3>', '<h3>Candidate Experience Notes</h3>'),
    ('<h3>Designing Simulations That Predict Performance</h3>', '<h3>Reducing Bias in Skills Assessment</h3>'),
    ('<h3>2025 Candidate Experience Report</h3>', '<h3>Simulation Design Checklist</h3>'),
    ('discover how leading teams hire on signal', 'see how structured simulations improve hiring decisions'),
    ('<div class="val">2M+</div><div class="lbl">Simulations completed</div>',
     '<div class="val">—</div><div class="lbl">Simulations completed</div>'),
    ('<div class="lbl">Higher-quality hires</div>', '<div class="lbl">Stronger hire quality</div>'),
    # analytics trust row — 6 categories only
    ('<span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>Retail</span>\n          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-5-7 5v12z"/></svg>Manufacturing</span>\n          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>Professional Services</span>\n          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>Startups</span>',
     '<span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>Operations</span>\n          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>Professional Services</span>'),
]

for a, b in replacements:
    t = t.replace(a, b)

p.write_text(t, encoding="utf-8")
print("QA HTML pass done")
