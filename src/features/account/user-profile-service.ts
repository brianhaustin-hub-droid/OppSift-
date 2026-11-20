import { neonClient } from "../../app/auth/neon-client";

// user_profiles persistence preserved from the removed Settings screen.

export type UserProfile = {
  display_name: string | null;
  locale: string;
  time_zone: string | null;
};

function isProfileData(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.display_name === "string" || record.display_name === null) &&
    typeof record.locale === "string" &&
    (typeof record.time_zone === "string" || record.time_zone === null)
  );
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient
    .from("user_profiles")
    .select("display_name, locale, time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) return null;
  if (!isProfileData(result.data)) throw new Error("The profile response is invalid.");
  return result.data;
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  if (!neonClient) throw new Error("Neon Data API is not configured.");
  const result = await neonClient.from("user_profiles").upsert(
    {
      user_id: userId,
      display_name: profile.display_name,
      locale: profile.locale,
      time_zone: profile.time_zone,
    },
    { onConflict: "user_id" },
  );
  if (result.error) throw new Error(result.error.message);
}
