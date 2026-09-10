import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface RewardOffer {
  key: string;
  title: string;
  value: string;
  description?: string;
}

export default function RewardCenter() {
  const [offers, setOffers] = useState<RewardOffer[]>([]);
  const [tokenName, setTokenName] = useState("B4U Esports Token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOffers() {
      try {
        const response = await apiRequest("GET", "/api/token/rewards");
        const data = await response.json();
        setOffers(data.offers || []);
        setTokenName(data.tokenName || "B4U Esports Token");
      } catch (err: any) {
        setError(err.message || "Unable to load reward offers.");
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, []);

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-6 text-white">
      <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
        <h1 className="text-3xl font-black">{tokenName} Reward Center</h1>
        <p className="mt-2 text-sm text-slate-400">
          Daily, referral, purchase, ad, tournament, achievement, loyalty, and feedback rewards all flow into the same B4U Esports Token wallet.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Loading reward offers...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {offers.map((offer) => (
            <div key={offer.key} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur">
              <h2 className="text-lg font-black">{offer.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{offer.description ?? offer.value}</p>
              <p className="mt-4 text-xl font-black text-amber-300">{offer.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
