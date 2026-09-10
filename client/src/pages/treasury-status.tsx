import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface TreasuryOverview {
  issued: number;
  burned: number;
  pendingRedemptions: number;
  reserve: number;
  settings: Record<string, string>;
}

export default function TreasuryStatus() {
  const [overview, setOverview] = useState<TreasuryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const response = await apiRequest("GET", "/api/admin/token/treasury");
        const data = await response.json();
        setOverview(data.overview);
      } catch (err: any) {
        setError(err.message || "Unable to load treasury overview.");
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-3xl font-semibold">Treasury Status</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Monitor overall token issuance, burn events, and pending redemption volume.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Loading treasury status...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : overview ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase text-slate-500">Issued tokens</p>
            <p className="mt-3 text-3xl font-semibold">{overview.issued}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase text-slate-500">Burned tokens</p>
            <p className="mt-3 text-3xl font-semibold">{overview.burned}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase text-slate-500">Pending redemptions</p>
            <p className="mt-3 text-3xl font-semibold">{overview.pendingRedemptions}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm uppercase text-slate-500">Reserve balance</p>
            <p className="mt-3 text-3xl font-semibold">{overview.reserve}</p>
          </div>
        </div>
      ) : null}

      {overview ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">System Settings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(overview.settings).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">{key}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
