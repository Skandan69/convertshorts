# Paid launch checklist (prepared 2026-10-21)

Do these in order. Steps 1–4 are safe on the live site: generation stays switched off on the server until step 7.

## 1. Business details (blocks merge)
Fill `BUSINESS` at the top of `scripts/build-legal-pages.mjs` (seller legal name, postal address with PIN, support phone, grievance officer) and the same four placeholders in `contact.html`. Then:

```
node scripts/build-legal-pages.mjs
python3 tests/legal-pages.py --launch
```
CI runs the `--launch` check, so the pull request cannot pass with placeholders.

## 2. Database (Supabase → SQL editor, project `yttbbgsgjxemftjwyzdd`)
Run **before** deploying the new billing function, otherwise refund webhooks fail until you do.
1. `server/launch-hardening.sql`
2. `server/launch-hardening-verify.sql` — must print `PASS …` (needs one existing Auth user without credit grants; everything is rolled back).
3. `server/legacy-learnforge-lockdown.sql` — closes the public leaderboard/courses/lessons exposure. If it stops with "Lockdown stopped", nothing was changed; send the list it prints. The final query must return no rows.

## 3. Deploy
1. Merge the pull request → Vercel deploys the website.
2. Redeploy the `convertshorts-billing` Edge Function from this commit (`server/billing-edge.ts`, which imports `server/studio-core.mjs`, `server/billing-fx.mjs` and `apps/studio/pricing.js`). The markup, refund handling and soft launch live in that function; until it is redeployed the server still quotes 20%, and the site's 50% quotes are rejected as "price changed".
3. Check `https://convertshorts.com/api/billing`: `markupPercent` must be `50` and `pricingVersion` `2026-10-21-inr-v4-markup50`.

## 4. Supabase Auth
Configure production SMTP, turn on **Confirm email**, and check the confirmation and recovery templates use `{{ .ConfirmationURL }}`.

## 5. Razorpay
1. Complete account activation (Terms, Privacy, Refunds, Delivery, Contact and Pricing pages are now on the site).
2. Generate **Live** API keys.
3. Webhook URL `https://yttbbgsgjxemftjwyzdd.supabase.co/functions/v1/convertshorts-billing?action=webhook`, events: `payment.captured`, `order.paid`, `refund.processed`, `payment.dispute.created`, `payment.dispute.lost`. Choose a new webhook secret.

## 6. fal.ai
Create a dedicated API key for the business and add funds. Set a spending alert.

## 7. Edge Function secrets (soft launch)
| Secret | Value |
| --- | --- |
| `CONVERTSHORTS_RAZORPAY_KEY_ID` | `rzp_live_…` |
| `CONVERTSHORTS_RAZORPAY_KEY_SECRET` | live secret |
| `CONVERTSHORTS_RAZORPAY_WEBHOOK_SECRET` | the webhook secret from step 5 |
| `CONVERTSHORTS_FAL_KEY` | funded business key |
| `CONVERTSHORTS_HOSTED_ENABLED` | `true` |
| `CONVERTSHORTS_HOSTED_ALLOWLIST` | your own Supabase user id (Auth → Users) |

Delete `CONVERTSHORTS_BILLING_TEST_MODE`. With the allowlist set, only your account can buy and generate; everyone else still sees "coming soon".

## 8. Soft-launch test (your account, real money)
Sign in, reload the studio, then:
- buy ₹100 and confirm 100 credits appear;
- generate one FLUX image, one Nano Banana image, one MiniMax song and one 5-second Kling clip; compare the credits charged with the fal.ai dashboard cost × 1.5 × the day's rate;
- refund that ₹100 from the Razorpay dashboard and confirm the unspent balance drops;
- in the SQL editor run `select * from convertshorts_private.owner_review;` and check it lists what you expect.

## 9. Open to everyone
Delete `CONVERTSHORTS_HOSTED_ALLOWLIST`. The marketing pages still say "coming soon" at this point: ship the launch-copy update (pricing, creative studio and AI generator pages) at the same time.

## Ongoing
Check `select * from convertshorts_private.owner_review;` weekly: stuck or unchecked jobs, duplicate payments to refund, disputes and refund shortfalls. Release a stuck job with `select convertshorts_private.owner_release_stuck('<job id>');` only after confirming on the fal.ai dashboard that it never ran.
