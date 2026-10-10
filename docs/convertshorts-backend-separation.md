# ConvertShorts backend separation

Updated on 2026-10-11 IST. **The Auth connection and password-reset fix are deployed. Payments and paid generation remain disabled.**

ConvertShorts previously used the Devaichat Supabase project, `chrfgzbecjvjazdovmyk`. Its password recovery request omitted a redirect override, so Supabase used the default Devaichat Site URL. ConvertShorts now connects to the owner-selected restored LearnForge project, `yttbbgsgjxemftjwyzdd`. Do not delete either project.

## Prepared and verified

- Restored LearnForge; status `ACTIVE_HEALTHY` in Mumbai.
- Created ConvertShorts workspace, billing, credit reservation and Razorpay tables with their existing permission checks and RLS.
- Added the private `convertshorts-private` media bucket, 500 MB owner quota, 150 MB upload limit and 30-day record/media retention.
- Deployed `convertshorts-billing` and `convertshorts-retention` Edge Functions. Both authenticate their protected operations inside the handler: Supabase user validation/HMAC for billing and the private Vault scheduler token for retention.
- Installed the hourly retention job pointing to the destination project's own function.
- Passed cloud isolation/revision, credit reservation/refund, Razorpay replay/test-mode and storage-retention SQL checks. Test changes were rolled back.
- Implemented explicit signup/recovery callbacks, early removal of callback tokens from the URL, verified password entry, matching-password validation, recovery reload handling, and backend-bound browser sessions.
- Verified the destination Site URL and Redirect URL as `https://convertshorts.com/apps/` after the owner saved them.
- The owner updated the ConvertShorts Vercel Production connection variables. Verified `/api/cloud` returns the destination project and matching publishable key.
- Merged PR #17 at `78fa2bbe6b3736c1219b40684d13468f7690821d`. Vercel reported success, and all three live Auth/router modules matched the tested source byte for byte.
- Both integration and editor-export CI passed. Account browser coverage includes new-document and existing-tab callbacks, invalid links, password confirmation/update, recovery reload, backend isolation and mobile layout. Supabase HTTP and Razorpay SDKs are mocked in these browser tests; real email delivery and checkout remain owner tests.
- The destination Auth settings and browser preflight endpoint respond successfully. Email signup is enabled; the destination currently reports `mailer_autoconfirm=true`, so signup email verification is not required. Configure production SMTP and enable confirmation before public launch.

Restoration retained **3 existing LearnForge Auth users and 11 courses**, plus other legacy tables/functions. Preserve those objects. Reusing this project separates ConvertShorts from Devaichat, but retains LearnForge's existing Auth users. The old site's deletion from Vercel did not delete this data.

The original project's ConvertShorts workspace, record, checkout and grant tables were empty when checked, with zero remaining credit balance. No Devaichat Auth users, passwords or data have been copied, changed or deleted.

## Remaining launch work

1. Review the restored LearnForge legacy resources and their advisor findings before public launch. In particular, old public definer RPCs and the `leaderboard` view must not grant ConvertShorts users unintended access to learning data. Keep or archive them deliberately; do not erase them automatically.
2. Verify the confirmation/recovery templates use `{{ .ConfirmationURL }}`. Configure production SMTP and enable email confirmation before public launch. The return URLs are already saved.
3. Save the matching Razorpay Test key pair and the chosen webhook signing secret in the destination project's Edge Function secrets. Keep `CONVERTSHORTS_BILLING_TEST_MODE=true` and `CONVERTSHORTS_HOSTED_ENABLED=false`. Secrets cannot be recovered from the source dashboard; use the owner's saved values. Never commit or print them.
4. Change the existing Razorpay Test webhook URL to `https://yttbbgsgjxemftjwyzdd.supabase.co/functions/v1/convertshorts-billing?action=webhook`, retaining `payment.captured` and `order.paid`. Its secret must match the destination backend.
5. After saving the destination payment secrets, recheck `/api/billing` for Test-mode availability. Its observed response currently has `enabled=false`, `generationEnabled=false`, and `markupPercent=20`. Real payment collection and funded-provider generation remain disabled until their tests pass.
6. Have the owner create/sign into the appropriate account and exercise a real email-confirmation/recovery link. Account/password entry is performed by the owner. Complete one Razorpay Test checkout and webhook delivery; no spendable credits or paid Fal requests are awarded in Test mode.

The Vercel connector did not expose the known ConvertShorts project (404 for its ID), and the authorized browser fallback timed out. The owner saved the Production variables directly; the verified GitHub merge triggered deployment. This access limitation is not a reason to delete Supabase projects.

The live site now uses the separate Auth backend and deployed recovery code. Devaichat's Auth settings remain unchanged. The Razorpay Test webhook still needs its destination update. Initial paid generation remains coming soon until funded-provider and live-payment verification is complete.
