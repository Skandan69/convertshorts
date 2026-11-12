"""Checks the policy pages a paid launch needs (Razorpay and Indian e-commerce rules).

python3 tests/legal-pages.py           # structure checks; warns about unfilled business details
python3 tests/legal-pages.py --launch  # also fails while any business detail is a placeholder
"""
import pathlib, re, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
launch = '--launch' in sys.argv
pages = {'terms': 'Terms of Service', 'privacy': 'Privacy Policy', 'refund-policy': 'Refund', 'shipping-policy': 'Delivery', 'contact': 'Contact'}
placeholder = re.compile(r'\[(Seller legal name|Postal address with PIN code|Support phone number|Grievance officer name)\]')
markup = subprocess.run(['node', '--input-type=module', '-e', "import {MARKUP_LABEL} from './apps/studio/pricing.js';process.stdout.write(MARKUP_LABEL)"], cwd=root, capture_output=True, text=True, check=True).stdout

problems, pending = [], []
for slug, title in pages.items():
    html = (root / f'{slug}.html').read_text()
    if title not in html: problems.append(f'{slug}: missing heading "{title}"')
    if f'https://convertshorts.com/{slug}' not in (root / 'sitemap.xml').read_text(): problems.append(f'{slug}: not in sitemap')
    if placeholder.search(html): pending.append(slug)
    stale = [s for s in ('no account to create', 'do not collect names, email addresses or payment details', 'There are no plans for one', 'no paid tier') if s in html]
    if stale: problems.append(f'{slug}: outdated free-only statement {stale}')

terms = (root / 'terms.html').read_text()
for needed in ('₹100', '₹500', '₹1,000', f'{markup} service margin', '30 days', 'grievance officer', 'Hyderabad'):
    if needed not in terms: problems.append(f'terms: missing "{needed}"')
privacy = (root / 'privacy.html').read_text()
for needed in ('Supabase', 'fal.ai', 'Razorpay', 'Digital Personal Data Protection Act'):
    if needed not in privacy: problems.append(f'privacy: missing "{needed}"')
checkout = (root / 'payments/checkout.html').read_text()
for link in ('/terms', '/refund-policy', '/shipping-policy'):
    if f'href="{link}"' not in checkout: problems.append(f'checkout: no link to {link}')
about = (root / 'about.html').read_text()
if 'We will not add an account system' in about: problems.append('about: still says there will never be accounts')

if problems:
    print('FAIL legal pages:\n  ' + '\n  '.join(problems)); sys.exit(1)
if pending:
    msg = 'business details still placeholders in: ' + ', '.join(pending) + ' (fill in business-details.json, then run node scripts/build-legal-pages.mjs)'
    if launch: print('FAIL ' + msg); sys.exit(1)
    print('WARN ' + msg)
print('PASS legal pages: terms, privacy, refunds, delivery and contact are present, linked from checkout, in the sitemap and match current pricing')
