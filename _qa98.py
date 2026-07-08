import re
html = open('fydell-new-mvp.html', encoding='utf-8').read()
views = ['landing','product','solutions','resources','company','pricing','app-sims','live','candidates','analytics']
for v in views:
    assert f'data-view="{v}"' in html, v
for bad in ['style="class=', 'Brex', 'Sarah Chen', 'Acme Corp', 'Goldman', 'JPMorgan', '$4,900', '$14,900',
            'CASE STUDY', '2M+', 'leading teams', '635bff', 'David Park', 'NorthBridge',
            'fb7185', 'f43f5e', 'ff5d73', '99,91,255']:
    assert bad not in html, f'found {bad}'
for good in ['Hire with', 'Conviction', 'Contact us', 'Strong Signal', 'Financial Analyst Simulation',
             'AI-POWERED SIMULATIONS', 'Project Meridian', 'Candidate A', 'Your workspace', 'Pilot plan',
             'Real work, real decisions', 'A better way to hire', 'hero-sim', 'TRUSTED BY LEADING ORGANIZATIONS',
             'EC4899', 'proven performers']:
    assert good in html, good
print('QA OK')
