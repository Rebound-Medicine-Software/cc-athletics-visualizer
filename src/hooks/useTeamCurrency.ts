import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$", aud: "A$", cad: "C$", nzd: "NZ$", sgd: "S$", hkd: "HK$",
  eur: "€", gbp: "£", jpy: "¥", cny: "¥", inr: "₹", krw: "₩",
  chf: "CHF", sek: "kr", nok: "kr", dkk: "kr", zar: "R", brl: "R$",
  mxn: "Mex$", pln: "zł", try: "₺", aed: "د.إ", sar: "﷼",
};

export const getCurrencySymbol = (code?: string | null) => {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code.toLowerCase()] ?? code.toUpperCase() + " ";
};

/**
 * Returns the currency symbol for the team's connected Stripe account.
 * Reads from teams.setup_data.stripe_currency (e.g. "usd", "gbp", "eur").
 * Falls back to "$" when no Stripe account is connected.
 */
export const useTeamCurrency = (teamId?: string | null) => {
  const { data } = useQuery({
    queryKey: ["team-currency", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("stripe_account_id, setup_data")
        .eq("id", teamId!)
        .maybeSingle();
      const setup = (data?.setup_data ?? {}) as Record<string, any>;
      const code = data?.stripe_account_id ? (setup.stripe_currency as string) : null;
      return { code: code ?? null, symbol: getCurrencySymbol(code) };
    },
    staleTime: 5 * 60_000,
  });
  return data ?? { code: null, symbol: "$" };
};
