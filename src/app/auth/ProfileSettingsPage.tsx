import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { neonClient } from "./neon-client";
import { useNavigate } from "../routing/router";

type ProfileData = {
  display_name: string | null;
  locale: string;
  time_zone: string | null;
};

function isProfileData(value: unknown): value is ProfileData {
  if (typeof value !== "object" || value === null) return false;
  return (
    "display_name" in value &&
    (typeof value.display_name === "string" || value.display_name === null) &&
    "locale" in value &&
    typeof value.locale === "string" &&
    "time_zone" in value &&
    (typeof value.time_zone === "string" || value.time_zone === null)
  );
}

export function ProfileSettingsPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [locale, setLocale] = useState("en");
  const [timeZone, setTimeZone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user || !neonClient) {
        setError("Sign in and connect Neon before editing your profile.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setLoadedForUserId(null);
      setDisplayName(user.name);
      setLocale("en");
      setTimeZone("");
      try {
        const result = await neonClient
          .from("user_profiles")
          .select("display_name, locale, time_zone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        if (result.data !== null) {
          if (!isProfileData(result.data)) throw new Error("The profile response is invalid.");
          if (active) {
            setDisplayName(result.data.display_name ?? user.name);
            setLocale(result.data.locale);
            setTimeZone(result.data.time_zone ?? "");
          }
        }
        if (active) setLoadedForUserId(user.id);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "The profile could not be loaded.");
          setLoadedForUserId(user.id);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !neonClient) {
      setError("Sign in and connect Neon before editing your profile.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await neonClient.from("user_profiles").upsert(
        {
          user_id: user.id,
          display_name: displayName.trim() || null,
          locale: locale.trim(),
          time_zone: timeZone.trim() || null,
        },
        { onConflict: "user_id" },
      );
      if (result.error) throw new Error(result.error.message);
      setMessage("Profile preferences saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");
    try {
      await signOut();
      navigate("/login");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const accountCreated = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString()
    : "Unavailable";

  return (
    <div className="platform-page">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Account</p>
          <h1>Settings</h1>
          <p className="page-heading__description">Profile and regional preferences for your account.</p>
        </div>
      </header>
      <section className="auth-panel" aria-labelledby="profile-settings-title">
        <h2 id="profile-settings-title">Profile preferences</h2>
        <div className="auth-account">
          {user?.image && <img alt="" className="auth-account__image" src={user.image} />}
          <dl>
            <div><dt>Email</dt><dd>{user?.email ?? "No authenticated account"}</dd></div>
            <div><dt>Email verification</dt><dd>{user ? user.emailVerified ? "Verified" : "Not verified" : "Unavailable"}</dd></div>
            <div><dt>Account created</dt><dd>{accountCreated}</dd></div>
          </dl>
          <button
            className="ui-button ui-button--secondary"
            disabled={signingOut || !user}
            onClick={() => void handleSignOut()}
            type="button"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {error && <p className="auth-panel__error" role="alert">{error}</p>}
        {loading || !user || loadedForUserId !== user.id ? <p role="status">Loading profile…</p> : (
          <form className="auth-form" onSubmit={(event) => void saveProfile(event)}>
            <label>
              Display name
              <input autoComplete="name" maxLength={120} onChange={(event) => setDisplayName(event.currentTarget.value)} value={displayName} />
            </label>
            <label>
              Locale
              <input maxLength={35} onChange={(event) => setLocale(event.currentTarget.value)} required value={locale} />
            </label>
            <label>
              Time zone
              <input maxLength={80} onChange={(event) => setTimeZone(event.currentTarget.value)} placeholder="e.g. Europe/London" value={timeZone} />
            </label>
            {message && <p className="auth-panel__message" role="status">{message}</p>}
            <button className="ui-button ui-button--primary" disabled={busy} type="submit">
              {busy ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
