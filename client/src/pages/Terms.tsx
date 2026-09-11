import { ArrowLeft, Scale } from "lucide-react";

export default function Terms() {
  return (
    <main className="flow-screen legal-screen">
      <section className="settings-card legal-card">
        <a className="back-button" href="/"><ArrowLeft size={18} /> Back home</a>
        <div className="legal-heading">
          <span className="energy-hygiene-mark"><Scale size={24} /></span>
          <div><p className="eyebrow">LEGAL</p><h1>Terms of Use</h1><p>Last updated September 11, 2026</p></div>
        </div>

        <section><h2>Using Energetic Safeguard</h2><p>Energetic Safeguard provides general wellness, grounding, reflection, and optional spiritual or symbolic practices. By using the service, you agree to use it lawfully and only if you are legally able to agree to these Terms in your jurisdiction.</p></section>
        <section><h2>Not medical or emergency care</h2><p>The service does not provide medical diagnosis, treatment, psychotherapy, crisis intervention, or emergency services. If you are in immediate danger, feel unable to stay safe, or have urgent medical concerns, seek appropriate personal, professional, medical, crisis, or emergency support.</p></section>
        <section><h2>Accounts</h2><p>You are responsible for keeping access to your sign-in account secure. Features such as saved rituals, private notes, cloud backups, and membership status may require an account.</p></section>
        <section><h2>Foundation and Sanctuary Plus</h2><p>The Foundation experience includes the app's core guided rituals and safety handoffs without a paid subscription. Sanctuary Plus is an optional recurring subscription for continuity and advanced habit features.</p></section>
        <section><h2>Subscriptions and cancellation</h2><p>Sanctuary Plus renews according to the billing interval shown at checkout until canceled. You can manage or cancel an active subscription through the membership controls. Deleting your account also attempts to cancel an active Sanctuary Plus subscription before account data is removed.</p></section>
        <section><h2>Payments and refunds</h2><p>Payments are processed by Stripe. Prices, taxes, billing intervals, and any promotional terms are shown at checkout. Refund rights, where applicable, are governed by the checkout terms and applicable law.</p></section>
        <section><h2>Your content</h2><p>You remain responsible for private notes and other information you choose to save. Do not use the service to store unlawful content or information you are not permitted to possess or share.</p></section>
        <section><h2>Availability and changes</h2><p>We may update features, rituals, pricing, or service providers over time. We may also suspend or discontinue features where necessary for security, maintenance, legal compliance, or product changes.</p></section>
        <section><h2>Responsible use</h2><p>Do not attempt to interfere with the service, bypass security controls, misuse another person's account, or use the service in a way that violates applicable law.</p></section>
        <section><h2>Limitations</h2><p>The service is provided as a wellness tool and may not be suitable for every person or situation. You remain responsible for deciding when to stop a practice and when to seek qualified human support.</p></section>
        <section><h2>Changes to these Terms</h2><p>We may revise these Terms as the service changes. The date above will be updated when material revisions are made.</p></section>
        <p className="legal-note">These product terms are a launch-ready baseline, not jurisdiction-specific legal advice. They should be reviewed before broad commercial release in each target market.</p>
      </section>
    </main>
  );
}
