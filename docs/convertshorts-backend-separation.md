# ConvertShorts backend separation

Prepared on 2026-10-11 IST. **Production cutover is pending.**

ConvertShorts currently uses the Devaichat Supabase project, `chrfgzbecjvjazdovmyk`. Its password recovery request omitted a redirect override, so Supabase used the default Devaichat Site URL. The restored LearnForge project, `yttbbgsgjxemftjwyzdd`, is the owner-selected destination. Do not delete either project.

## Prepared and verified

- Restored LearnForge; status `ACTIVE_HEALTHY` in Mumbai.
- Created ConvertShorts workspace, billing, credit reservation and Razorpay tables with their existing permission checks and RLS.
- Added the private `convertshorts-private` media bucket, 500 MB owner quota, 150 MB upload limit and 30-day record/media retention.
- Deployed `convertshorts-billing` and `convertshorts-retention` Edge Functions. Both authenticate their protected operations inside the handler: Supabase user validation/HMAC for billing and the private Vault scheduler token for retention.
- Installed the hourly retention job pointing to the destination project's own function.
- Passed cloud isolation/revision, credit reservation/refund, Razorpay replay/test-mode and storage-retention SQL checks. Test changes were rolled back.
- Implemented explicit signup/recovery callbacks, early removal of callback tokens from the URL, verified password entry, matching-password validation, recovery reload handling, and backend-bound browser sessions.

The first inspection occurred while restoration was still finishing. The completed restore contains **3 LearnForge Auth users and 11 courses**, plus other legacy tables/functions. Preserve those objects. Reusing this project separates ConvertShorts from Devaichat, but retains LearnForge's existing Auth users. Do not describe it as an empty project or a completely fresh identity store. The old site's deletion from Vercel did not delete this data.

The original project's ConvertShorts workspace, record, checkout and grant tables were empty when checked, with zero remaining credit balance. No Devaichat Auth users, passwords or data have been copied, changed or deleted.

## Remaining cutover

1. Review the restored LearnForge legacy resources and their advisor findings before public launch. In particular, old public definer RPCs and the `leaderboard` view must not grant ConvertShorts users unintended access to learning data. Keep or archive them deliberately; do not erase them automatically.
2. Set the destination Auth Site URL and exact Redirect URL to `https://convertshorts.com/apps/`. Verify the confirmation/recovery templates use `{{ .ConfirmationURL }}`. Configure production SMTP before opening signup to everyone. Keep email verification enabled.
3. Save the matching Razorpay Test key pair and the chosen webhook signing secret in the destination project's Edge Function secrets. Keep `CONVERTSHORTS_BILLING_TEST_MODE=true` and `CONVERTSHORTS_HOSTED_ENABLED=false`. Secrets cannot be recovered from the source dashboard; use the owner's saved values. Never commit or print them.
4. Change the existing Razorpay Test webhook URL to `https://yttbbgsgjxemftjwyzdd.supabase.co/functions/v1/convertshorts-billing?action=webhook`, retaining `payment.captured` and `order.paid`. Its secret must match the destination backend.
5. Change only the ConvertShorts Vercel project's `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the destination, using its publishable client key. Keep server/payment/provider secrets out of the browser. Redeploy the tested source, then verify `/api/cloud` and `/api/billing` use the new project.
6. Have the owner create/sign into the appropriate account and exercise a real email-confirmation/recovery link. Account/password entry is performed by the owner. Complete one Razorpay Test checkout and webhook delivery; no spendable credits or paid Fal requests are awarded in Test mode.

The Vercel connector did not expose the known ConvertShorts project during this preparation (404 for its ID; team listing exposed only `simforge-web-staging`). That is an access limitation, not a reason to delete Supabase projects. An authorized browser fallback or corrected connector access is required for Vercel environment changes.

The live site, original payment webhook and original Auth settings have not been switched by this preparation. New password recovery code must be deployed together with its configured callback. Initial paid generation remains coming soon until funded-provider and live-payment verification is complete.
