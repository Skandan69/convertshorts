// Builds the Terms, Privacy, Refund & Cancellation and Shipping & Delivery pages.
// Business details live here once. Fill in every BUSINESS value before paid launch:
// Razorpay and the Consumer Protection (E-Commerce) Rules 2020 expect the seller's
// name, address and contact details, and a grievance officer, on the website.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CREDIT_PLANS,MARKUP_LABEL} from '../apps/studio/pricing.js';

export const BUSINESS = {
  seller: '[Seller legal name]',            // individual's legal name or registered business name
  address: '[Postal address with PIN code]',
  phone: '[Support phone number]',
  email: 'skandan.kovuri@gmail.com',
  grievanceOfficer: '[Grievance officer name]',
  courts: 'Hyderabad, Telangana',
  updated: '2026-10-21'
};
export const PLACEHOLDER = /\[(Seller legal name|Postal address with PIN code|Support phone number|Grievance officer name)\]/;

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const B=Object.fromEntries(Object.entries(BUSINESS).map(([k,v])=>[k,esc(v)]));
const mail=`<a href="mailto:${B.email}">${B.email}</a>`;
const packs=CREDIT_PLANS.map(p=>'₹'+(p.amountCents/100).toLocaleString('en-IN')).join(', ');

const shell=(slug,title,description,heading,body)=>`<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1839125817868305" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BFWSBHKF1P"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-BFWSBHKF1P");</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | ConvertShorts</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://convertshorts.com/${slug}">
<meta name="robots" content="index, follow">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<nav>
  <div class="nav-left">
    <a href="/" class="logo">Convert<span>Shorts</span></a>
    <div class="nav-links">
      <a href="/">🎬 Convert Video</a>
      <a href="/pdf">📄 Convert PDF &amp; Docs</a>
      <a href="/creative-studio">✦ Creative Studio</a>
      <a href="/creative-studio-pricing">Pricing</a>
      <a href="/contact">Contact</a>
    </div>
  </div>
</nav>
<main class="section" style="max-width:780px;">
<h1 style="font-size:clamp(1.6rem,3vw,2.2rem);margin-bottom:1rem;">${heading}</h1>
<div class="seo-text">
<p><em>Last updated: ${B.updated}</em></p>
${body}
</div>
</main>
<hr class="div">
<footer>
  <p style="margin-bottom:6px;"><strong>ConvertShorts</strong> — operated by ${B.seller}</p>
  <p><a href="/" style="color:var(--muted);">Quick tools</a> &middot; <a href="/creative-studio" style="color:var(--muted);">Creative Studio</a> &middot; <a href="/creative-studio-pricing" style="color:var(--muted);">Pricing</a></p>
  <p style="margin-top:8px;"><a href="/about" style="color:var(--muted);">About</a> &middot; <a href="/privacy" style="color:var(--muted);">Privacy Policy</a> &middot; <a href="/terms" style="color:var(--muted);">Terms</a> &middot; <a href="/refund-policy" style="color:var(--muted);">Refunds &amp; Cancellation</a> &middot; <a href="/shipping-policy" style="color:var(--muted);">Delivery</a> &middot; <a href="/contact" style="color:var(--muted);">Contact</a></p>
</footer>
</body>
</html>
`;

const seller=`<h3>Who we are</h3>
<p>ConvertShorts (convertshorts.com) is operated by <strong>${B.seller}</strong>, ${B.address}, India. Phone: ${B.phone}. Email: ${mail}. In these pages, "we" and "us" mean ConvertShorts and its operator.</p>`;

const terms=shell('terms','Terms of Service','Terms for ConvertShorts free browser tools, Creative Studio accounts, cloud storage and prepaid AI generation credits.','Terms of Service',`
<p>These terms apply when you use convertshorts.com, including the free quick tools, the Creative Studio, a ConvertShorts account and prepaid AI generation credits. By using the site you agree to them. If you buy credits, the <a href="/refund-policy">Refund &amp; Cancellation Policy</a> and <a href="/shipping-policy">Delivery Policy</a> also apply.</p>
${seller}

<h3>Free tools</h3>
<p>The quick tools (video converter, PDF tools, animation and drawing tools) and the Creative Studio editors are free and run in your browser. They do not need an account, and files you open in them stay on your device unless you choose to save them to your cloud library.</p>

<h3>Your account</h3>
<p>An account is optional and needed only for the cloud library and AI generation. You must be at least 18, or use the site with a parent or guardian's consent. Keep your password safe; you are responsible for activity on your account. Tell us at ${mail} if you think someone else has used it.</p>

<h3>Cloud library</h3>
<p>Signed-in accounts get 500 MB of private cloud storage, with uploads up to 150 MB per file. Each cloud file and synced project is kept for 30 days from when it was first saved and is then deleted automatically. The library shows each expiry date. Download anything you want to keep before it expires; we cannot recover expired files.</p>

<h3>Prepaid AI credits</h3>
<ul>
<li>Credits are sold as one-time top-ups of ${packs}. 1 credit = ₹1. There is no subscription and nothing renews automatically.</li>
<li>Each AI generation uses credits. The exact price is shown before you submit and depends on the model, resolution, duration and number of outputs. Prices are the AI provider's published cost plus our ${MARKUP_LABEL} service margin, converted from US dollars at a daily reference rate. Current rates are on the <a href="/creative-studio-pricing">pricing page</a>.</li>
<li>Credits do not expire while your account exists. They have no cash value, cannot be transferred to another account and cannot be exchanged except as set out in the <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.</li>
<li>If a generation fails on the provider's side, the credits reserved for it are returned to your balance when the studio checks the job, which it does while you have the studio open. If a job is still unresolved after a day, we review it and return the credits if it did not complete.</li>
<li>If a payment is refunded or reversed (for example a chargeback), the same amount of unused credits is removed from your balance.</li>
<li>Prices for future generations can change when provider prices or exchange rates change. Credits you already hold keep their ₹1 value.</li>
</ul>

<h3>AI generation</h3>
<p>Generation is performed by third-party AI services (currently fal.ai and the model makers it hosts). Your prompt and any reference images or audio you choose are sent to them to produce the result. AI output can be inaccurate, unexpected or similar to existing works. Check it before you rely on or publish it. We may refuse or remove a request that breaks these terms or a provider's rules, and provider safety filters stay on.</p>

<h3>What you may not do</h3>
<p>Do not use ConvertShorts to create, upload or share anything unlawful; anything that sexualises minors; non-consensual intimate imagery; content that infringes someone else's copyright, trademark or privacy; impersonation of real people meant to deceive; malware; or material that harasses or threatens anyone. Do not try to break, overload, scrape or get around the limits or payment checks of the site. We may suspend or close accounts that do. If we close an account for a serious breach, unused credits may be forfeited to the extent the law allows.</p>

<h3>Ownership</h3>
<p>You keep ownership of files you upload. As between you and us, you own what you create with the editors and the AI output you generate, subject to the AI providers' own terms and to any rights other people hold in material you supplied. Nothing you make is watermarked. You give us only the permission needed to store your cloud files and send your inputs to the AI provider to deliver the service.</p>

<h3>Service availability</h3>
<p>The site is provided "as is". We work to keep it running but do not guarantee it will be uninterrupted or error-free, that every generation will succeed, or that a particular model will stay available. Browser tools depend on your device and browser. Always keep your own copies of important files.</p>

<h3>Limitation of liability</h3>
<p>To the extent the law allows, we are not liable for indirect or consequential loss, lost work, lost profits or missed deadlines. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under Indian consumer law that cannot be limited.</p>

<h3>Third-party services</h3>
<p>We use Supabase (accounts, database and cloud storage), Razorpay (payments), fal.ai (AI generation), Vercel (hosting), and Google Analytics and AdSense. Their own terms and privacy policies also apply to what they do. See the <a href="/privacy">Privacy Policy</a>.</p>

<h3>Grievances and disputes</h3>
<p>If something has gone wrong, email ${mail} first; we aim to reply within 2 working days. Our grievance officer is ${B.grievanceOfficer}, reachable at the same address and at ${B.phone}. We acknowledge complaints within 48 hours and aim to resolve them within one month. These terms are governed by the laws of India, and the courts at ${B.courts} have jurisdiction, without affecting any right you have to approach a consumer commission.</p>

<h3>Changes</h3>
<p>We may update these terms. We will change the date at the top of this page and describe significant changes affecting paid credits on the pricing page. Credits bought before a change keep their value.</p>
`);

const privacy=shell('privacy','Privacy Policy','What ConvertShorts collects for free tools, accounts, cloud storage, AI generation and payments, who processes it, how long it is kept and your rights.','Privacy Policy',`
<h3>The short version</h3>
<p>The free quick tools and editors run in your browser: files you open in them stay on your device. If you create an account, save to the cloud library, generate with AI or buy credits, we and the services listed below process the data needed to do that. We do not sell your data.</p>
${seller}

<h3>What we collect</h3>
<ul>
<li><strong>Account:</strong> your email address and either a securely hashed password or, if you sign in with Google, your Google account's basic profile (name, email and picture), handled by Supabase Auth, plus sign-in timestamps.</li>
<li><strong>Cloud library:</strong> files, projects and settings you choose to save, with their names and sizes.</li>
<li><strong>AI generation:</strong> your prompts, settings, and any reference images or audio you attach, the resulting media, and a record of each request (model, status, credits used, time).</li>
<li><strong>Payments:</strong> order and payment identifiers, amounts, dates and status. Card, UPI and bank details are entered on Razorpay's checkout and are never received or stored by us.</li>
<li><strong>Usage and device data:</strong> pages viewed, approximate region, browser and device type, through Google Analytics, and standard request logs (including IP address) kept by our hosting providers for security.</li>
<li><strong>Messages:</strong> anything you send us by email.</li>
</ul>

<h3>Why we use it</h3>
<p>To provide your account, library and AI generations; to take payments, keep your credit balance and meet tax and accounting duties; to prevent fraud and abuse; to answer support requests; and to understand which tools to improve. We use your email to send account messages (such as confirmation and password reset), not marketing, unless you ask us to.</p>

<h3>Who processes it</h3>
<ul>
<li><strong>Supabase</strong>: accounts, database and cloud storage (servers in Mumbai, India).</li>
<li><strong>fal.ai</strong> and the AI model providers it hosts: receive your prompts and reference files to generate results (fal.ai is a US company; processing is mainly outside India).</li>
<li><strong>Razorpay</strong>: payment processing in India.</li>
<li><strong>Vercel</strong>: website hosting and delivery (global network).</li>
<li><strong>Google</strong>: Analytics and AdSense. Google and its partners use cookies to measure visits and, where ads are shown, to serve ads based on your visits to this and other sites. You can opt out of personalised ads at <a href="https://adssettings.google.com" rel="noopener">Google Ads Settings</a> or <a href="https://www.aboutads.info" rel="noopener">aboutads.info</a>.</li>
</ul>
<p>Some of these providers process data outside India. We share only what each needs to do its job.</p>

<h3>How long we keep it</h3>
<ul>
<li>Cloud files and synced projects: deleted automatically 30 days after first save.</li>
<li>Generated media: copies you save to the library follow the same 30-day rule. The original result file is hosted by fal.ai at a hard-to-guess web link that anyone holding the link can open, and fal.ai keeps it, and the request data, under its own retention policy.</li>
<li>Account data: until you delete your account or ask us to.</li>
<li>Payment and credit records: kept for up to 8 years for tax and accounting law, even after an account is deleted (without your login details).</li>
</ul>

<h3>Your rights</h3>
<p>Under India's Digital Personal Data Protection Act 2023 you can ask to access, correct or erase your personal data, withdraw consent, nominate someone to act for you, and raise a grievance. Email ${mail}. Our grievance officer is ${B.grievanceOfficer} (${B.phone}). If we cannot resolve your complaint you can approach the Data Protection Board of India.</p>

<h3>Children</h3>
<p>Accounts, cloud storage and paid AI generation are for people aged 18 or over, or used with a parent or guardian's consent. We do not knowingly create accounts for children without that consent; contact us and we will delete such an account.</p>

<h3>Cookies</h3>
<p>Sign-in keeps a session token in your browser's local storage. Google Analytics and AdSense set cookies. You can block or delete cookies in your browser; the quick tools keep working, but you will need to sign in again.</p>

<h3>Security</h3>
<p>Data is sent over HTTPS. Database access rules keep each account's library, balance and orders private to that account. No system is perfectly secure; tell us at ${mail} if you find a problem.</p>

<h3>Changes</h3>
<p>If this policy changes we will update the date at the top of this page.</p>
`);

const refunds=shell('refund-policy','Refund & Cancellation Policy','How refunds and cancellations work for ConvertShorts prepaid AI credit top-ups, failed generations and duplicate payments.','Refund &amp; Cancellation Policy',`
<p>This policy covers prepaid AI credit top-ups (${packs}) bought on convertshorts.com. The free tools and editors cost nothing, so there is nothing to refund for them.</p>
${seller}

<h3>Cancellation</h3>
<p>There are no subscriptions. Each top-up is a single payment and nothing renews automatically, so there is nothing to cancel. You can stop using the service at any time.</p>

<h3>Failed generations</h3>
<p>If an AI generation fails on the provider's side, the credits reserved for it are returned to your balance when the studio checks the job (it does this while the studio is open); unresolved jobs are reviewed by us after a day. If a request stays "uncertain" (for example the provider timed out), email us with the job number shown in the studio; we check the provider's records and return the credits if it did not run.</p>

<h3>Unused top-ups</h3>
<p>You can request a full refund of a top-up within 7 days of purchase if none of its credits have been used. After that, or once credits from it have been used, top-ups are not refundable, except where the law requires otherwise or under the cases below.</p>

<h3>Payment problems</h3>
<ul>
<li><strong>Charged twice:</strong> if you were charged more than once for the same top-up, the extra payment is refunded in full.</li>
<li><strong>Paid but no credits:</strong> if your payment succeeded but credits did not appear within 1 hour, contact us. We either add the credits or refund the payment.</li>
<li><strong>Service fault:</strong> if a fault on our side stops you using credits you bought, we refund the unused amount.</li>
</ul>

<h3>How to request a refund</h3>
<p>Email ${mail} from the address on your account with the Razorpay payment ID (starting <code>pay_</code>) or order ID, the date and the amount. We reply within 2 working days.</p>

<h3>How refunds are paid</h3>
<p>Approved refunds go back to the original payment method through Razorpay. We start them within 2 working days of approval; banks usually show them within 5–7 working days. When a top-up is refunded, the matching unused credits are removed from your balance.</p>

<h3>Contact</h3>
<p>${B.seller}, ${B.address}. Phone ${B.phone}. Email ${mail}.</p>
`);

const delivery=shell('shipping-policy','Shipping & Delivery Policy','ConvertShorts sells digital AI credits only. How and when credits and generated files are delivered.','Shipping &amp; Delivery Policy',`
<p>ConvertShorts sells digital services only. Nothing is shipped physically and there are no shipping charges.</p>
${seller}

<h3>Credits</h3>
<p>Prepaid credits are added to the ConvertShorts account you were signed in to when you paid, as soon as Razorpay confirms the payment. This is usually within a few seconds and at most a few minutes. Your balance is shown in the studio under Pricing &amp; credits. If credits have not appeared within 1 hour of a successful payment, email ${mail} with your payment ID; see the <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.</p>

<h3>Generated files</h3>
<p>AI results are delivered in the studio when the generation finishes, typically within seconds for images and a few minutes for video and music. You can download them straight away. Saved results stay in your cloud library for 30 days; download anything you want to keep.</p>

<h3>Where we deliver</h3>
<p>The service is offered online and paid in Indian rupees. Anyone who can reach the website and pay through Razorpay can use it.</p>

<h3>Contact</h3>
<p>${B.seller}, ${B.address}. Phone ${B.phone}. Email ${mail}.</p>
`);

for(const [file,html] of [['terms.html',terms],['privacy.html',privacy],['refund-policy.html',refunds],['shipping-policy.html',delivery]])await fs.writeFile(path.join(root,file),html);
const pending=Object.values(BUSINESS).some(v=>PLACEHOLDER.test(v));
console.log('Built Terms, Privacy, Refund & Cancellation and Delivery pages.'+(pending?' WARNING: business details are still placeholders; fill BUSINESS in scripts/build-legal-pages.mjs before paid launch.':''));
