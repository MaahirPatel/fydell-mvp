import re
path = r"C:\Users\Maahi\OneDrive\Documents\New project\fydell-app\fydell-new-mvp.html"
html = open(path, encoding="utf-8").read()
views = ["landing", "product", "solutions", "resources", "company", "pricing", "app-sims", "live", "candidates", "analytics"]
for v in views:
    print("OK" if f'data-view="{v}"' in html else "MISS", v)
checks = [
    ("$4,900", "$4,900" in html),
    ("Strong Signal", "Strong Signal" in html),
    ("Retail trust", "Retail" in html and "Startups" in html),
    ("Higher-quality hires", "Higher-quality hires" in html),
    ("score-ring", "score-ring" in html),
]
for name, ok in checks:
    print(name, "OK" if ok else "MISS")
