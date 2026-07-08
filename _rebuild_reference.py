"""Rebuild fydell-new-mvp.html CSS from reference-aligned base — remove all conflicting override layers."""
from pathlib import Path
import re

root = Path(__file__).parent
current = (root / "fydell-new-mvp.html").read_text(encoding="utf-8")
backup = (root / "fydell-new-mvp.backup.html").read_text(encoding="utf-8")

def extract_style(text: str) -> str:
    m = re.search(r"<style>(.*?)</style>", text, re.DOTALL)
    return m.group(1) if m else ""

def extract_body_after_style(text: str) -> str:
    m = re.search(r"</style>\s*(.*)$", text, re.DOTALL)
    return m.group(1) if m else ""

backup_css = extract_style(backup)
# Drop the destructive "refinements" block that flattens hero/dashboard
backup_css = re.sub(
    r"\n/\* ===== refinements ===== \*/.*?(?=\n/\* ===== hero dashboard|\n/\* trust icons|\n\.cards\.c5)",
    "\n",
    backup_css,
    flags=re.DOTALL,
)

current_css = extract_style(current)

def slice_css(css: str, start: str, end: str | None = None) -> str:
    i = css.find(start)
    if i < 0:
        return ""
    j = css.find(end, i) if end else len(css)
    return css[i:j] if j > i else css[i:]

# Extra blocks from current file (not in clean backup base)
extra = ""
for block_start, block_end in [
    ("/* analytics */\n", "/* analytics — reference layout */"),
    ("/* analytics — reference layout */", "/* grouped sidebar */"),
    ("/* grouped sidebar */", "/* ===== hero dashboard panels ===== */"),
    ("/* pricing billing toggle */", "/* ============================================================\n   PREMIUM v2"),
    ("/* pricing billing toggle */", "@media(max-width:1180px){.demo-grid"),
]:
    chunk = slice_css(current_css, block_start, block_end)
    if chunk and chunk not in extra:
        extra += chunk

# Candidate / sim / live extras from current (between chat and analytics)
cand_chunk = slice_css(current_css, "/* candidate review */", "/* analytics */")
if cand_chunk:
    extra = cand_chunk + extra

# Sim-page and live-status from current if missing
for marker in [".sim-page-head", ".live-status", ".demo-features", ".principles-row"]:
    if marker not in backup_css and marker in current_css:
        pass  # included in cand_chunk or extra

REFERENCE_PATCH = """
/* ============================================================
   REFERENCE ALIGNMENT (uploaded screenshots — single pass)
   ============================================================ */
:root{
  --bg:#03050d;--bg-2:#060914;--bg-3:#0a0f1f;
  --panel:rgba(12,16,30,0.78);--panel-strong:rgba(15,20,36,0.92);
  --panel-soft:rgba(255,255,255,0.035);
  --border:rgba(255,255,255,0.095);--border-soft:rgba(255,255,255,0.055);
  --text:#f8fafc;--muted:#9aa4b8;--muted-2:#667085;
  --violet:#7c5cff;--violet-2:#9b5cff;--blue:#5b8cff;
  --cyan:#67e8f9;--green:#3dd68c;--warning:#f5b942;--danger:#fb7185;
  --shadow:0 30px 100px rgba(0,0,0,0.55);
  --ease:cubic-bezier(0.16,1,0.3,1);
  --maxw:1360px;
}
body{background:var(--bg);text-rendering:geometricPrecision}
.bg-grain{display:block!important;opacity:.038!important}
.glow-3{width:680px;height:680px;top:240px;right:6%;
  background:radial-gradient(circle,rgba(124,92,255,.12),transparent 68%)}

.nav{height:76px;padding:0 48px}
.nav-links a{font-size:15px;font-weight:600;color:rgba(255,255,255,0.76)}
.nav-links a.active::after{bottom:-26px}
.btn-demo{height:44px;border-radius:12px;box-shadow:0 14px 42px rgba(124,92,255,.35)}

.hero{min-height:780px;padding:120px 64px 56px;max-width:var(--maxw);
  grid-template-columns:0.92fr 1.18fr;gap:56px;align-items:center}
.hero-copy{max-width:520px}
.hero h1{font-size:clamp(54px,5.6vw,72px)!important;line-height:1.02!important;
  letter-spacing:-.055em!important;font-weight:800!important;margin:18px 0 20px!important;color:#fff!important}
.hero .sub{font-size:17px!important;line-height:1.62!important;max-width:520px!important;margin-bottom:28px!important}
.hero-ctas{margin-bottom:36px}
.hero-ctas .btn{height:46px;padding:0 22px;font-size:15px;border-radius:11px}
.hero-metrics{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:16px!important;
  margin-top:40px!important;padding-top:28px!important;border-top:1px solid var(--border-soft)!important}
.hero-metrics .metric{padding:0!important;border:none!important;margin:0!important}
.metric .num{font-size:36px!important;font-weight:800!important;color:#fff!important;
  background:none!important;-webkit-text-fill-color:#fff!important;letter-spacing:-.03em!important}
.metric .lbl{font-size:12px!important;color:var(--muted)!important;margin-top:6px!important;max-width:none!important}

.hero-stage{margin-right:-8px}
.hero-stage::before{inset:-56px -40px;filter:blur(48px)}
.dash{transform:perspective(1600px) rotateY(-8deg) rotateX(2deg)!important;
  min-height:540px!important;border-radius:24px!important;
  background:linear-gradient(180deg,rgba(15,20,36,.94),rgba(7,10,20,.98))!important;
  border:1px solid rgba(255,255,255,.12)!important;
  box-shadow:0 80px 180px rgba(0,0,0,.70),0 0 100px rgba(124,92,255,.18),inset 0 1px 0 rgba(255,255,255,.08)!important}
.nd-add{background:linear-gradient(135deg,#7c5cff,#5b8cff)!important;height:32px;font-size:12px}

.trust{padding:40px 0}
.trust .lbl{font-size:11px;letter-spacing:.22em;color:var(--muted-2)}
.trust-icons span{font-size:13.5px;color:#9aa6bd}
.trust-icons span svg{width:16px;height:16px;color:#7f8aa3}

.sec-head h2{font-size:clamp(32px,3.4vw,44px)}
.sec-head p{font-size:16px}
.card{border-radius:16px;padding:22px}
.card h3{font-size:16px}
.card p{font-size:14px}

.split-hero h1{font-size:clamp(40px,4vw,56px)!important;font-weight:800!important}
.split-hero .sub{font-size:17px!important}

.price-h1{font-size:clamp(36px,3.8vw,48px)!important;font-weight:800!important}
.plan.featured{background:linear-gradient(165deg,#5b4cff 0%,#635bff 42%,#4f46e5 100%)!important;
  border:1px solid rgba(255,255,255,.18)!important;
  box-shadow:0 32px 80px rgba(99,91,255,.32),inset 0 1px 0 rgba(255,255,255,.1)!important}
.plan.featured .pdesc,.plan.featured .feats li,.plan.featured .price-num small{color:rgba(255,255,255,.75)!important}
.plan.featured .price-num{color:#fff!important}
.plan.featured .btn-primary{background:#fff!important;color:#4f46e5!important;
  box-shadow:0 8px 24px rgba(0,0,0,.2)!important}
.plan-popular-ring .badge{text-transform:uppercase;font-size:10px;letter-spacing:.1em}

.app.active{background:
  radial-gradient(55% 45% at 75% -5%,rgba(124,58,237,.22),transparent 65%),
  radial-gradient(40% 35% at 12% 18%,rgba(91,140,255,.08),transparent 60%),
  var(--bg)!important}
.page-title{font-size:24px;font-weight:800}
.an-card,.an-panel,.rail-card,.sim-card{background:var(--panel)!important;border:1px solid var(--border-soft)!important}

@media(max-width:1180px){
  .hero{min-height:auto;padding:80px 32px 48px}
  .dash{transform:none!important}
  .demo-grid{grid-template-columns:1fr}
  .price-hero{grid-template-columns:1fr}
  .an-row2,.an-row3{grid-template-columns:1fr}
  .res-hero{grid-template-columns:1fr}
  .cards.c5{grid-template-columns:repeat(2,1fr)}
  .res-feat{grid-template-columns:1fr}
}
"""

# Remove duplicate :root from backup_css start (patch replaces)
backup_css = re.sub(r"^:root\{[^}]+\}\s*", "", backup_css, count=1)

final_css = REFERENCE_PATCH + backup_css + "\n" + extra

body = extract_body_after_style(current)
# Ensure grain + glow-3 in ambient
if "glow-3" not in body:
    body = body.replace(
        '<div class="bg-glow glow-2"></div>',
        '<div class="bg-glow glow-2"></div>\n  <div class="bg-glow glow-3"></div>',
        1,
    )
# Remove stripe-only hero classes
body = body.replace(' class="hero page-marketing-spotlight"', ' class="hero"', 1)
body = re.sub(r'\s*<div class="dash-progress"[^>]*>.*?</div>\s*', "\n        ", body, count=1)

head = current.split("<style>")[0]
out = head + "<style>\n" + final_css + "\n</style>\n" + body

(root / "fydell-new-mvp.html").write_text(out, encoding="utf-8")
print("Rebuilt CSS:", len(final_css), "chars | removed refinements + premium v2 layers")
