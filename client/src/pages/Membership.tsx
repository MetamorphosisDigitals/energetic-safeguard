import { useEffect } from "react";
import { ArrowLeft, Check, Cloud, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type PlusOfferKey = "sanctuary_plus_monthly" | "sanctuary_plus_annual";

export default function Membership() {
  const { isAuthenticated, loading } = useAuth();
  const status = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const checkout = trpc.subscription.createCheckoutSession.useMutation();
  const portal = trpc.subscription.createPortalSession.useMutation();
  const isPlus = status.data?.plan === "plus";

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("checkout");
    if (result === "success") {
      toast.success("Payment received. Sanctuary Plus will update as soon as Stripe confirms the subscription.");
      void status.refetch();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (result === "cancelled") {
      toast.message("Checkout was cancelled. Your Foundation support remains available.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function beginCheckout(offerKey: PlusOfferKey) {
    if (!isAuthenticated) {
      toast.message("Sign in first so Plus stays connected to your account.");
      startLogin();
      return;
    }
    checkout.mutate({ offerKey }, {
      onSuccess: (result) => {
        if (result.alreadySubscribed) {
          toast.success("Sanctuary Plus is already active on this account.");
          void status.refetch();
          return;
        }
        if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      },
      onError: () => toast.error("Plus checkout is not available yet. Please try again later."),
    });
  }

  function manageSubscription() {
    portal.mutate(undefined, {
      onSuccess: ({ portalUrl }) => window.location.assign(portalUrl),
      onError: () => toast.error("Subscription management is not available yet."),
    });
  }

  return (
    <main className="flow-screen paywall-screen membership-screen">
      <section className="paywall-card membership-card">
        <a className="back-button" href="/account"><ArrowLeft size={18} /> Back to account</a>
        <div className="paywall-mark"><Sparkles size={30} /></div>
        <p className="eyebrow">MEMBERSHIP</p>
        <h1>Core support stays free. Plus adds continuity.</h1>
        <p className="paywall-intro">Every Foundation ritual, the one-minute orientation, and every safety handoff remain available without a subscription.</p>

        <div className="offer-stack">
          <article className="offer-card">
            <span className="offer-kicker">FOUNDATION</span>
            <h2>Free</h2>
            <strong>$0</strong>
            <p>A complete everyday grounding and energetic-support foundation.</p>
            <div className="practice-meta">
              <span><Check size={15} /> All 18 Foundation rituals</span>
              <span><ShieldCheck size={15} /> Safety handoffs</span>
              <span><Check size={15} /> One-minute orientation support</span>
            </div>
          </article>

          <article className="offer-card offer-card--featured">
            <span className="offer-kicker">RECOMMENDED</span>
            <h2>Sanctuary Plus</h2>
            <strong>$49 <small>USD / year</small></strong>
            <span className="offer-value-note">About $4.08/month · save about 42% vs monthly</span>
            <p>Keep your support connected across devices and unlock advanced habit tools.</p>
            <div className="practice-meta">
              <span><Cloud size={15} /> Cloud continuity</span>
              <span><Sparkles size={15} /> Advanced habit tools</span>
              <span><ShieldCheck size={15} /> Foundation rituals remain unrestricted</span>
            </div>
            {isPlus ? (
              <button className="primary-button primary-button--wide" disabled={portal.isPending} onClick={manageSubscription}><CreditCard size={17} /> {portal.isPending ? "Opening…" : "Manage subscription"}</button>
            ) : (
              <button className="primary-button primary-button--wide" disabled={checkout.isPending || loading} onClick={() => beginCheckout("sanctuary_plus_annual")}>{checkout.isPending ? "Preparing checkout…" : "Choose annual — $49/year"}</button>
            )}
          </article>
        </div>

        {!isPlus && <button className="secondary-button secondary-button--wide" disabled={checkout.isPending || loading} onClick={() => beginCheckout("sanctuary_plus_monthly")}>Choose monthly — $6.99/month</button>}
        {isPlus && <p className="paywall-footnote">Your Plus membership is active{status.data?.currentPeriodEnd ? ` through ${new Date(status.data.currentPeriodEnd).toLocaleDateString()}` : ""}.</p>}
        {status.data?.isInGracePeriod && <p className="paywall-footnote">Your optional Plus features are in a seven-day payment grace period. Foundation rituals and safety support are unaffected.</p>}
      </section>
    </main>
  );
}