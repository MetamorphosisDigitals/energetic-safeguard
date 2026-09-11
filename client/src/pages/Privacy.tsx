import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <main className="flow-screen legal-screen">
      <section className="settings-card legal-card">
        <a className="back-button" href="/"><ArrowLeft size={18} /> Back home</a>
        <div className="legal-heading">
          <span className="energy-hygiene-mark"><ShieldCheck size={24} /></span>
          <div><p className="eyebrow">LEGAL</p><h1>Privacy Policy</h1><p>Last updated September 11, 2026</p></div>
        </div>

        <section><h2>What we collect</h2><p>Energetic Safeguard may store account information supplied by your sign-in provider, such as your name, email address, sign-in method, account identifier, and sign-in timestamps.</p><p>If you use account features, we may also store saved rituals, practice history, private notes, tags, preferences, routine backups, and related organization settings.</p></section>
        <section><h2>Payments</h2><p>Subscription payments are processed by Stripe. We store only the payment-provider identifiers and subscription status needed to provide membership access. We do not store your full card number.</p></section>
        <section><h2>How we use information</h2><p>We use account data to provide sign-in, saved support, cloud continuity, membership status, account security, and product reliability. We do not sell personal information to advertisers.</p></section>
        <section><h2>Safety and wellness information</h2><p>Energetic Safeguard is a general wellness and spiritual-support product. It is not a medical service and is not designed to diagnose, treat, or provide emergency care.</p></section>
        <section><h2>Cookies and local storage</h2><p>We use a secure session cookie to keep you signed in. The app may also use browser storage for preferences, onboarding state, and device-local routine information.</p></section>
        <section><h2>Service providers</h2><p>We may use infrastructure, authentication, payment, storage, analytics, and error-monitoring providers to operate the service. These providers process information only as needed to provide their services to us.</p></section>
        <section><h2>Retention and deletion</h2><p>You can permanently delete your account from the Account screen. Account deletion removes your profile and user-owned app data and cancels an active Sanctuary Plus subscription before deletion. Minimal payment-event identifiers may be retained without a user association where needed for payment integrity, fraud prevention, accounting, or legal obligations.</p></section>
        <section><h2>Your choices</h2><p>You can use the Foundation ritual and safety-support experience without purchasing Sanctuary Plus. You may sign out at any time and may delete your account from the Account screen.</p></section>
        <section><h2>Changes</h2><p>We may update this policy as the product or its service providers change. The date above will be updated when material revisions are made.</p></section>
        <p className="legal-note">This product policy is intended to describe the app's current data practices. Production legal copy should be reviewed for the jurisdictions in which the service is offered.</p>
      </section>
    </main>
  );
}
