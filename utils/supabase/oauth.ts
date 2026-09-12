import { createClient } from "@/utils/supabase/client";

export interface OAuthResult {
  success: boolean;
  error?: string;
  isProviderDisabled?: boolean;
}

/**
 * Safely initiates OAuth without crashing or getting blocked by CORS fetch restrictions.
 */
export async function safeSignInWithOAuth(
  provider: "google" | "github",
  nextPath: string = "/dashboard"
): Promise<OAuthResult> {
  try {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isProviderDisabled =
        msg.includes("provider is not enabled") ||
        msg.includes("unsupported provider") ||
        msg.includes("not enabled");

      return {
        success: false,
        isProviderDisabled,
        error: error.message || `Failed to initiate ${provider} authentication.`,
      };
    }

    if (data?.url) {
      window.location.href = data.url;
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed to start ${provider} sign-in.`,
    };
  }
}

