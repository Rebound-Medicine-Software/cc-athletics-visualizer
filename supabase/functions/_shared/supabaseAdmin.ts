// Shared helper for getting the project's privileged Supabase key inside
// Edge Functions.
//
// Background (framework.md Section 3, item 16): the legacy
// SUPABASE_SERVICE_ROLE_KEY leaked in plaintext in a public migration file.
// Supabase has retired direct rotation of legacy anon/service_role keys -
// the supported fix is to create a new secret key (sb_secret_...) alongside
// the old one, migrate every caller over to it, then deactivate the legacy
// key in Settings > API Keys. This helper is that migration point: it reads
// the new secret key first (auto-injected by the platform as
// SUPABASE_SECRET_KEYS, a JSON object keyed by name - this project's key is
// named "default"), and only falls back to the legacy env var so functions
// keep working during the migration window. Once the legacy key is
// deactivated in the dashboard, the fallback becomes moot.
//
// See: https://supabase.com/docs/guides/getting-started/api-keys#leaked-key

export function getServiceRoleKey(): string {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (secretKeysRaw) {
        try {
              const secretKeys = JSON.parse(secretKeysRaw);
                    if (secretKeys?.default) {
                            return secretKeys.default as string;
                                  }
                                      } catch (err) {
                                            console.error("[supabaseAdmin] failed to parse SUPABASE_SECRET_KEYS", err);
                                                }
                                                  }
                                                    return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
                                                    }
                                                    
