import { createClient } from "@/utils/supabase/client";

export interface OAuthResult {
  success: boolean;
  error?: string;
  isProviderDisabled?: boolean;
}

/**
 * Safely initiates OAuth without crashing the user to Supabase's raw 400 JSON error page
 * if the provider is disabled or not configured in Supabase.
 */
export async function safeSignInWithOAuth(
  provider: "google" | "github",
  nextPath: string = "/dashboard"
): Promise<OAuthResult> {
  try {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    // 1. Request OAuth authorization URL with skipBrowserRedirect: true
    // This allows us to inspect the response before handing over control to the browser window.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || `Failed to initiate ${provider} authentication.` 
      };
    }

    if (!data?.url) {
      return { 
        success: false, 
        error: "Authentication service did not return an authorization URL." 
      };
    }

    // 2. Pre-flight check: inspect the authorization endpoint
    // If provider is disabled, Supabase returns HTTP 400 with {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
    try {
      const probe = await fetch(data.url);
      if (!probe.ok) {
        const errJson = await probe.json().catch(() => null);
        const errMsg = errJson?.msg || "";
        const errCode = errJson?.error_code || "";

        if (
          errCode === "validation_failed" ||
          errMsg.toLowerCase().includes("provider is not enabled") ||
          errMsg.toLowerCase().includes("unsupported provider")
        ) {
          const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
          return {
            success: false,
            isProviderDisabled: true,
            error: `${providerName} Authentication is not enabled yet in your Supabase project settings. Please sign in with email and password, or enable the ${providerName} provider in your Supabase Dashboard.`,
          };
        }

        return {
          success: false,
          error: errMsg || `Authentication service returned error (HTTP ${probe.status}).`,
        };
      }
    } catch (networkErr) {
      // If pre-flight fetch is blocked by CORS/network, proceed with browser redirection fallback
      console.warn("OAuth pre-flight check bypassed:", networkErr);
    }

    // 3. Provider is valid and enabled; safely redirect the user
    window.location.href = data.url;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed to start ${provider} sign-in.`,
    };
  }
}
