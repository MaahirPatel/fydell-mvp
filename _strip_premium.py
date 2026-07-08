"""Strip PREMIUM v2 CSS block from fydell-new-mvp.html"""
from pathlib import Path
import re

p = Path(__file__).parent / "fydell-new-mvp.html"
text = p.read_text(encoding="utf-8")
text = re.sub(
    r"\n/\* ={10,}\n   PREMIUM v2.*?(?=\n</style>)",
    "\n\n/* utility */\n.tabular{font-variant-numeric:tabular-nums}\n.grad-text{color:#8b9cff}\n.ndc-rec.rec-strong{background:rgba(61,214,140,.12);color:var(--green)}\n.ndc-rec.rec-lean{background:rgba(110,168,255,.12);color:#8eb0ff}\n.ndc-rec.rec-hold{background:rgba(245,185,66,.12);color:var(--warning)}\n",
    text,
    flags=re.DOTALL,
)
# Fix weak plan.featured override
text = text.replace(
    ".plan.featured{background:linear-gradient(180deg,rgba(124,92,255,.28),rgba(91,140,255,.1));border-color:rgba(124,92,255,.55)}",
    ".plan.featured{background:linear-gradient(165deg,#5b4cff 0%,#635bff 42%,#4f46e5 100%);border:1px solid rgba(255,255,255,.18);box-shadow:0 32px 80px rgba(99,91,255,.32),inset 0 1px 0 rgba(255,255,255,.1)}",
)
p.write_text(text, encoding="utf-8")
print("Stripped PREMIUM v2" if "PREMIUM v2" not in text else "FAILED")
