import { useState } from "react";
import { AlertTriangle, ArrowLeft, Cloud, Heart, LogOut, ShieldCheck, Sparkles, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const subscriptionStatus = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const routineSummary = trpc.routineHistory.summary.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const favorites = trpc.library.favorites.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const history = trpc.library.history.useQuery({ limit: 50 }, {
    enabled: isAuthenticated,
    retry: false,
  });
  const deleteAccount = trpc.auth.deleteAccount.useMutation();

  async function signOut() {
    await logout();
    window.location.assign("/");
  }

  function permanentlyDeleteAccount() {
    if (deleteConfirmation !== "DELETE") return;
    deleteAccount.mutate({ confirmation: "DELETE" }, {
      onSuccess: () => window.location.assign("/?account=deleted"),
      onError: (error) => toast.error(error.message || "Your account could not be deleted. Nothing was removed."),
    });
  }

  if (loading) {
    return (
      <main className="flow-screen settings-screen">
        <section className="settings-card">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Loading your profile…</h1>
        </section>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="flow-screen settings-screen">
        <section className="settings-card">
          <a className="back-button" href="/"><ArrowLeft size={18} /> Back home</a>
          <div className="settings-heading">
            <div>
              <p className="eyebrow">YOUR ACCOUNT</p>
              <h1>Profile</h1>
            </div>
          </div>
          <div className="setting-group">
            <UserRound size={28} />
            <h2>Sign in to keep your support with you.</h2>
            <p>Your saved rituals, practice history, notes and cloud routine backups can stay connected to your account across devices.</p>
            <button className="primary-button primary-button--wide" onClick={startLogin}>Sign in</button>
          </div>
          <div className="legal-links"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a></div>
        </section>
      </main>
    );
  }

  const displayName = user.name?.trim() || "Energetic Safeguard member";
  const membershipLabel = subscriptionStatus.data?.plan === "plus" ? "Sanctuary Plus" : "Free";
  const isPlus = subscriptionStatus.data?.plan === "plus";

  return (
    <main className="flow-screen settings-screen account-screen">
      <section className="settings-card account-card">
        <a className="back-button" href="/"><ArrowLeft size={18} /> Back home</a>
        <div className="settings-heading">
          <div>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h1>Profile</h1>
          </div>
          <span className="energy-hygiene-mark"><UserRound size={25} /></span>
        </div>

        <div className="setting-group account-identity">
          <h2>{displayName}</h2>
          <p>{user.email || "No email is available from your sign-in provider."}</p>
          <small>Member since {formatDate(user.createdAt)}</small>
        </div>

        <div className="setting-group">
          <p className="eyebrow">MEMBERSHIP</p>
          <h2>{membershipLabel}</h2>
          <p>{isPlus ? "Your optional Plus continuity and habit features are connected to this account." : "You are using the complete Foundation experience. Guided rituals and safety support remain free."}</p>
          <div className="practice-meta">
            <span><ShieldCheck size={17} /> {membershipLabel}</span>
            <span><Sparkles size={17} /> Last signed in {formatDate(user.lastSignedIn)}</span>
          </div>
          <a className="primary-button primary-button--wide" href="/membership">{isPlus ? "Manage membership" : "View Free + Plus"}</a>
        </div>

        <div className="setting-group">
          <p className="eyebrow">YOUR DATA</p>
          <h2>Your saved support</h2>
          <div className="practice-meta">
            <span><Heart size={17} /> {favorites.data?.length ?? 0} saved rituals</span>
            <span><Sparkles size={17} /> {history.data?.length ?? 0} recent practices</span>
            <span><Cloud size={17} /> {routineSummary.data?.count ?? 0} cloud routine backups</span>
          </div>
          <a className="secondary-button secondary-button--wide" href="/?view=library">Open your library</a>
        </div>

        <div className="setting-group">
          <p className="eyebrow">SIGN-IN DETAILS</p>
          <h2>Account information</h2>
          <p><b>Sign-in method:</b> {user.loginMethod || "Connected account"}</p>
          <p><b>Email:</b> {user.email || "Not provided"}</p>
        </div>

        <div className="setting-group">
          <p className="eyebrow">PRIVACY &amp; TERMS</p>
          <h2>Your privacy controls</h2>
          <p>Review how account, saved-support and membership information are handled.</p>
          <div className="legal-links"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a></div>
        </div>

        <div className="wellness-note">
          <ShieldCheck size={19} />
          <p><b>Privacy</b>Your account data is used to provide your saved support, history, cloud continuity and membership state.</p>
        </div>

        <button className="secondary-button secondary-button--wide" onClick={signOut}><LogOut size={17} /> Sign out</button>

        <div className="setting-group danger-zone">
          <div className="danger-zone__heading"><AlertTriangle size={20} /><div><p className="eyebrow">DANGER ZONE</p><h2>Delete account permanently</h2></div></div>
          <p>This permanently removes your profile, saved rituals, history, private notes, preferences, saved filters, and cloud routine backups.</p>
          <p>{isPlus ? "Your active Sanctuary Plus subscription will be canceled first so it cannot renew after your account is removed." : "If a recurring Plus subscription is connected to this account, it will be canceled before deletion."}</p>
          <label className="delete-confirmation">Type <b>DELETE</b> to confirm<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" spellCheck={false} /></label>
          <button className="danger-button" disabled={deleteConfirmation !== "DELETE" || deleteAccount.isPending} onClick={permanentlyDeleteAccount}><Trash2 size={17} /> {deleteAccount.isPending ? "Deleting account…" : "Delete my account"}</button>
          <small>This action cannot be undone.</small>
        </div>
      </section>
    </main>
  );
}
