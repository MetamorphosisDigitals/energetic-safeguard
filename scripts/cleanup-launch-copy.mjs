import fs from "node:fs";

const path = "client/src/pages/Home.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Could not find ${label}.`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Found ${label} more than once.`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce('import type { PremiumOfferKey } from "../../../server/payments/products";\n', '', "PremiumOfferKey import");
replaceOnce(' | "paywall";', ';', "paywall view type");
replaceOnce('  const premiumStatus = trpc.premium.status.useQuery(undefined, { enabled: isAuthenticated, retry: false });\n  const checkoutMutation = trpc.premium.createCheckoutSession.useMutation();\n', '', "legacy premium hooks");
replaceOnce('  // Guided practices are intentionally unrestricted; no trial or purchase gate is applied.\n  const hasPremiumAccess = true;\n  const freePracticesRemaining = 0;\n', '  // Guided practices are intentionally unrestricted; no trial or purchase gate is applied.\n', "legacy access counters");
replaceOnce('  useEffect(() => { const checkout = new URLSearchParams(window.location.search).get("checkout"); if (checkout === "success") { toast.success("Payment received. Your premium access will be available shortly."); void premiumStatus.refetch(); window.history.replaceState({}, "", window.location.pathname); } if (checkout === "cancelled") { toast.message("Checkout was cancelled. Your free practices are still available."); window.history.replaceState({}, "", window.location.pathname); } }, []);\n', '', "legacy checkout return effect");
replaceOnce('  function beginCheckout(offerKey: PremiumOfferKey) { if (!isAuthenticated) { toast.message("Sign in to keep your lifetime purchase connected to you."); startLogin(); return; } checkoutMutation.mutate({ offerKey }, { onSuccess: (result) => { if (result.alreadyPremium) { toast.success("Your account already has premium access."); void premiumStatus.refetch(); } else if (result.checkoutUrl) { toast.message("Opening secure checkout in a new tab."); window.open(result.checkoutUrl, "_blank", "noopener,noreferrer"); } }, onError: () => toast.error("We could not open checkout. Please try again.") }); }\n', '', "legacy checkout handler");

const freeNote = /\{!hasPremiumAccess && <div className="free-practice-note">.*?<\/div>\}/;
if (!freeNote.test(source)) throw new Error("Could not find legacy free-practice note.");
source = source.replace(freeNote, "");

const paywallLine = /^\s*\{view === "paywall" && <main className="flow-screen paywall-screen">.*$/m;
if (!paywallLine.test(source)) throw new Error("Could not find legacy lifetime paywall.");
source = source.replace(paywallLine, "");

replaceOnce(
  '<div className="setting-group future-state"><p className="eyebrow">COMING SOON</p><h2>Recent practices &amp; favorites</h2><p>Your practice history and saved favorites will appear here in a future update.</p></div>',
  '<div className="setting-group"><p className="eyebrow">YOUR ACCOUNT</p><h2>Profile, membership &amp; saved support</h2><p>Manage your account, Sanctuary Plus membership, saved rituals, practice history, and cloud continuity.</p><a className="secondary-button secondary-button--wide" href="/account">Open account</a><button className="secondary-button secondary-button--wide" onClick={() => setView("library")}>Open your library</button></div>',
  "stale Settings coming-soon block",
);

for (const stale of ["PremiumOfferKey", "premiumStatus", "checkoutMutation", "current_app_lifetime", "future_updates_lifetime", "three free practices", 'view === "paywall"', "future-state"]) {
  if (source.toLowerCase().includes(stale.toLowerCase())) throw new Error(`Stale launch copy remains: ${stale}`);
}

fs.writeFileSync(path, source);
