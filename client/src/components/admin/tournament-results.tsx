import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trophy, RotateCcw, Save, Crosshair, Clock, Swords, Shield, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Tournament { id: string; title: string; status: string; }
interface Match { id: string; matchNumber: number; status: string; mapName?: string; roomCode?: string; }
interface RawPlayer { email?: string; phone?: string; ign?: string; uid?: string; pubgIgn?: string; pubgUid?: string; }

// Per-player result row
interface PlayerRow {
  ign: string;           // player IGN — primary key
  uid: string;           // PUBG UID
  teamId: string;
  teamName: string;
  teamLogo?: string | null;
  placement: number | '';     // finish position (1–16)
  survivalTime: string;       // e.g. "18:42"
  kills: number | '';         // kill points
  damage: number | '';        // damage dealt
}

function placementPts(pos: number | ''): number {
  if (pos === '' || !pos) return 0;
  const map: Record<number, number> = {1:20,2:14,3:10,4:8,5:6,6:4,7:3,8:2,9:1};
  return map[Number(pos)] ?? 0;
}
function rowTotal(r: PlayerRow): number {
  return placementPts(r.placement) + (Number(r.kills) || 0);
}

function playerIgn(p: RawPlayer): string {
  return p.ign || p.pubgIgn || p.email || 'Player';
}
function playerUid(p: RawPlayer): string {
  return p.uid || p.pubgUid || '';
}

function TeamLogo({ logo, name, cls = "h-7 w-7" }: { logo?: string | null; name: string; cls?: string }) {
  if (typeof logo === 'string' && /^https?:\/\//i.test(logo))
    return <img src={logo} alt="" className={`${cls} rounded-md object-cover border border-amber-700/30`} />;
  return (
    <div className={`${cls} rounded-md bg-amber-900/50 border border-amber-700/30 flex items-center justify-center text-[9px] font-black text-amber-200`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function TournamentResults() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selTournament, setSelTournament] = useState("");
  const [selMatch, setSelMatch] = useState("");
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const justPicked = useRef(false);

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/tournaments");
      return r.json().then((d: any) => Array.isArray(d) ? d : d.tournaments || []);
    },
  });

  // Show all tournaments in results (admin needs to enter results for any tournament)
  const activeTournaments = (tournaments as Tournament[])
    .sort((a: any, b: any) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime());

  const { data: tData, isLoading: loading } = useQuery({
    queryKey: [`/api/tournaments/${selTournament}`],
    enabled: !!selTournament,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/tournaments/${selTournament}`);
      return r.json();
    },
  });

  // Also fetch /teams endpoint which has the full player roster (pubgIgn, pubgUid, email, phone)
  const { data: teamsData } = useQuery({
    queryKey: [`/api/tournaments/${selTournament}/teams`],
    enabled: !!selTournament,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/tournaments/${selTournament}/teams`);
      const d = await r.json();
      return d?.teams || [];
    },
  });

  // Use teamsData (richer, has full pubgIgn/pubgUid roster) as primary.
  // Normalize player fields so both pubgIgn and ign work.
  const mergedTeams = (() => {
    // Build a map of match results keyed by teamId from tData
    const base: any[] = tData?.teams || [];

    // If teamsData is available, use it as the authoritative source for player rosters
    const richSource: any[] = teamsData && teamsData.length > 0 ? teamsData : base;

    return richSource.map((t: any) => {
      // Normalize every player: ensure both ign/uid AND pubgIgn/pubgUid are set
      const rawPlayers: any[] = Array.isArray(t.players) ? t.players : [];
      const normalizedPlayers: RawPlayer[] = rawPlayers.map((p: any) => ({
        ign:     p.ign     || p.pubgIgn || '',
        uid:     p.uid     || p.pubgUid || '',
        pubgIgn: p.pubgIgn || p.ign     || '',
        pubgUid: p.pubgUid || p.uid     || '',
        email:   p.email   || '',
        phone:   p.phone   || '',
      }));

      // Merge match result data from tData if available
      const tDataTeam = base.find((b: any) => b.id === t.id);
      return {
        ...t,
        players: normalizedPlayers,
        teamLogo: t.teamLogo || tDataTeam?.teamLogo || null,
        // carry matchResults reference from tData
        _matchResults: tDataTeam?._matchResults,
      };
    });
  })();

  // Save: send per-team aggregated results + full playerRows in metadata
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Group player rows by team
      const byTeam = new Map<string, PlayerRow[]>();
      rows.forEach(r => {
        if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
        byTeam.get(r.teamId)!.push(r);
      });

      const results = Array.from(byTeam.entries()).map(([teamId, players]) => {
        const totalKills = players.reduce((s, p) => s + (Number(p.kills) || 0), 0);
        // Use the best placement among players (lowest number = best)
        const placements = players.map(p => Number(p.placement) || 999).filter(n => n < 999);
        const bestPlacement = placements.length ? Math.min(...placements) : null;
        const pt = bestPlacement ? placementPts(bestPlacement) : 0;
        const wwcd = players.some(p => Number(p.placement) === 1) ? 1 : 0;
        return {
          teamId,
          placement: bestPlacement,
          placementPoints: pt,
          kills: totalKills,
          wwcd,
          prize: '0',
          // Full per-player data stored in metadata for top fragger
          playerRows: players.map(p => ({
            ign: p.ign,
            uid: p.uid,
            placement: p.placement,
            survivalTime: p.survivalTime,
            kills: Number(p.kills) || 0,
            damage: Number(p.damage) || 0,
            total: rowTotal(p),
          })),
        };
      });

      const r = await apiRequest("POST",
        `/api/tournaments/${selTournament}/matches/${selMatch}/complete`,
        { results }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      return d;
    },
    onSuccess: () => {
      toast({ title: 'Results Saved', description: 'Leaderboard updated successfully.', variant: 'success' });
      qc.invalidateQueries({ queryKey: [`/api/tournaments/${selTournament}`] });
    },
    onError: (e: Error) => toast({ title: 'Save Failed', description: e.message, variant: 'destructive' }),
  });

  const buildRows = useCallback((matchId: string): PlayerRow[] => {
    if (!mergedTeams || mergedTeams.length === 0) return [];
    // matchResults come from tData (the tournament detail endpoint)
    const matchResultsList: any[] = (tData?.matchResults || {})[matchId] || [];
    const saved = new Map<string, any>(matchResultsList.map((r: any) => [r.teamId, r]));
    const result: PlayerRow[] = [];

    mergedTeams.forEach((t: any) => {
      const players: RawPlayer[] = Array.isArray(t.players) ? t.players : [];
      const s = saved.get(t.id);
      const savedPlayerRows: any[] = s?.metadata?.playerRows || [];
      const savedMap = new Map(savedPlayerRows.map((p: any, idx: number) => {
        const key = String(p.uid || p.ign || `__row_${idx}`);
        return [key, p];
      }));

      if (players.length === 0) {
        // No roster — preserve the first saved row if present
        const sp = savedPlayerRows[0] || {};
        result.push({
          ign: t.name || 'Team',
          uid: '',
          teamId: t.id,
          teamName: t.name,
          teamLogo: t.teamLogo || null,
          placement: sp.placement ?? '',
          survivalTime: sp.survivalTime ?? '',
          kills: sp.kills ?? '',
          damage: sp.damage ?? '',
        });
      } else {
        players.forEach(p => {
          const ign = playerIgn(p);
          const rowKey = String(p.uid || ign || '');
          const sp = savedMap.get(rowKey) || savedMap.get(ign) || {};
          result.push({
            ign,
            uid: playerUid(p),
            teamId: t.id,
            teamName: t.name,
            teamLogo: t.teamLogo || null,
            placement: sp.placement ?? '',
            survivalTime: sp.survivalTime ?? '',
            kills: sp.kills ?? '',
            damage: sp.damage ?? '',
          });
        });
      }
    });
    return result;
  }, [tData, mergedTeams]);

  const pickMatch = (id: string) => { justPicked.current = true; setSelMatch(id); setRows(buildRows(id)); };

  const upd = (ign: string, teamId: string, f: keyof PlayerRow, v: any) =>
    setRows(p => p.map(r => r.ign === ign && r.teamId === teamId ? { ...r, [f]: v } : r));

  const reset = () => {
    setRows(p => p.map(r => ({ ...r, placement: '', survivalTime: '', kills: '', damage: '' })));
    toast({ title: 'Fields Reset', description: 'All fields cleared.', variant: 'info' });
  };

  useEffect(() => { setSelMatch(""); setRows([]); }, [selTournament]);
  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return; }
    if (selMatch && mergedTeams.length > 0) setRows(buildRows(selMatch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tData, teamsData]);

  const matchInfo = tData?.matches?.find((m: Match) => m.id === selMatch);
  const title = tData?.tournament?.title || tournaments.find(t => t.id === selTournament)?.title || '';

  // Group rows by team for display
  const teamIds = Array.from(new Map(rows.map(r => [r.teamId, r.teamName])).entries());

  const rc = (rank: number) => {
    if (rank === 1) return 'text-amber-300';
    if (rank === 2) return 'text-slate-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-amber-200/70';
  };

  return (
    <div className="space-y-4">

      {/* PAGE HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-800/30 bg-gradient-to-br from-[#2a1a0e] via-[#3b1f0a] to-[#1a0e05] px-5 py-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(180,100,20,0.15),transparent_60%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">Tournament Result Manager</h2>
            {title && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70 mt-0.5">{title}</p>}
            <p className="text-[11px] text-slate-400 mt-1">Per-player: Placement · Survival Time · Kills · Damage → Total auto-calculated.</p>
          </div>
          <span className="shrink-0 h-11 w-11 rounded-xl bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/40 flex items-center justify-center">
            <Trophy className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* SELECTORS */}
      <Card className="border-slate-700/40 bg-slate-900/80 text-white">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-bold text-slate-200">Select Tournament &amp; Match</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Tournament</Label>
              <Select value={selTournament} onValueChange={setSelTournament}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-sm h-9"><SelectValue placeholder="Select tournament…" /></SelectTrigger>
                <SelectContent>{activeTournaments.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title} {['completed','cancelled'].includes(t.status) ? '(Past)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Match</Label>
              <Select value={selMatch} onValueChange={pickMatch} disabled={!selTournament || loading}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-sm h-9"><SelectValue placeholder={loading ? "Loading…" : "Select match…"} /></SelectTrigger>
                <SelectContent>
                  {(tData?.matches || []).map((m: Match) => (
                    <SelectItem key={m.id} value={m.id}>Match {m.matchNumber}{m.mapName ? ` — ${m.mapName}` : ''} ({m.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {matchInfo && (
            <div className="flex flex-wrap gap-3 items-center rounded-lg border border-slate-700/40 bg-slate-950/50 px-3 py-2 text-xs">
              <span className="text-slate-500">Match <b className="text-white">#{matchInfo.matchNumber}</b></span>
              <span className="text-slate-500">Map <b className="text-white">{matchInfo.mapName || 'TBA'}</b></span>
              <span className="text-slate-500">Room <b className="text-white">{matchInfo.roomCode || 'TBA'}</b></span>
              <Badge className={matchInfo.status === 'completed' ? 'bg-emerald-700/70 text-emerald-100 text-[10px]' : 'bg-blue-700/70 text-blue-100 text-[10px]'}>{matchInfo.status}</Badge>
              {matchInfo.status === 'completed' && <span className="text-emerald-400 text-[10px]">✓ Saved — edit &amp; re-save anytime</span>}
            </div>
          )}
          {selMatch && !loading && rows.length === 0 && (
            <Alert className="border-slate-700 bg-slate-900/60 text-slate-400 text-xs py-2">
              <AlertDescription>No registered teams found for this tournament.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* RESULT ENTRY — scrollable table card */}
      {selMatch && rows.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/80 shadow-xl">

          {/* sticky header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#2a1a0e] via-[#3b1f0a] to-[#1a0e05] px-4 py-3 sticky top-0 z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,100,20,0.12),transparent_60%)]" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400/60">{title}</p>
                <h3 className="text-sm font-black text-white">Match {matchInfo?.matchNumber} · Player Standings</h3>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-300/40 mt-0.5">
                  PLACEMENT · SURVIVAL · KILLS · DAMAGE · TOTAL = PLACEMENT PTS + KILLS
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="border-slate-600/50 text-slate-400 text-[11px] h-8 px-3" onClick={reset}>
                  <RotateCcw className="mr-1 h-3 w-3" />Reset
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-[11px] h-8 px-3 font-bold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}Save
                </Button>
              </div>
            </div>
          </div>

          {/* scroll wrapper */}
          <div className="overflow-x-auto bg-gradient-to-b from-[#1e1008] to-[#120a04]" style={{WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
            <table className="w-full" style={{minWidth:'700px'}}>
              <thead>
                <tr className="bg-slate-950 text-amber-400/55 text-[9px] uppercase tracking-[0.18em] border-b border-amber-900/25">
                  <th className="px-3 py-2 text-left font-black w-[28px]"></th>
                  <th className="px-3 py-2 text-left font-black">Player</th>
                  <th className="px-3 py-2 text-center font-black w-[56px]"><span className="flex items-center justify-center gap-0.5"><Shield className="h-2.5 w-2.5"/>Pos</span></th>
                  <th className="px-3 py-2 text-center font-black w-[80px]"><span className="flex items-center justify-center gap-0.5"><Clock className="h-2.5 w-2.5"/>Survival</span></th>
                  <th className="px-3 py-2 text-center font-black w-[56px]"><span className="flex items-center justify-center gap-0.5"><Crosshair className="h-2.5 w-2.5"/>Kills</span></th>
                  <th className="px-3 py-2 text-center font-black w-[72px]"><span className="flex items-center justify-center gap-0.5"><Swords className="h-2.5 w-2.5"/>Damage</span></th>
                  <th className="px-3 py-2 text-center font-black w-[52px]"><span className="flex items-center justify-center gap-0.5"><Zap className="h-2.5 w-2.5"/>Total</span></th>
                </tr>
              </thead>
              <tbody>
                {teamIds.map(([teamId, teamName]) => {
                  const teamRows = rows.filter(r => r.teamId === teamId);
                  const teamLogo = teamRows[0]?.teamLogo;
                  const teamKills = teamRows.reduce((s, r) => s + (Number(r.kills) || 0), 0);
                  const teamTotal = teamRows.reduce((s, r) => s + rowTotal(r), 0);
                  return (
                    <>
                      {/* Team header row — full-width divider */}
                      <tr key={`team-${teamId}`} className="border-b border-amber-900/20 bg-amber-900/10">
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo logo={teamLogo} name={teamName} cls="h-6 w-6"/>
                            <p className="text-[11px] font-black text-amber-200/80 flex-1 truncate">{teamName.toUpperCase()}</p>
                            <span className="text-[10px] text-amber-400/50">{teamRows.length} players</span>
                            <span className="text-[10px] font-bold text-amber-300/70">{teamKills} kills · {teamTotal} pts</span>
                          </div>
                        </td>
                      </tr>
                      {/* Player rows */}
                      {teamRows.map((r, pi) => {
                        const tot = rowTotal(r);
                        return (
                          <tr key={r.ign} className="border-b border-amber-900/10 last:border-b-0 hover:bg-amber-900/5 transition-colors">
                            <td className="px-3 py-2 text-center">
                              <Crosshair className="h-3 w-3 text-amber-700/50 mx-auto"/>
                            </td>
                            <td className="px-3 py-2 min-w-0">
                              <p className="text-[12px] font-bold text-amber-100/85 truncate">{r.ign}</p>
                              {r.uid && <p className="text-[9px] text-slate-600 truncate">UID: {r.uid}</p>}
                            </td>
                            {/* Placement */}
                            <td className="px-2 py-1.5">
                              <Input type="number" min={1} max={16} value={r.placement}
                                onChange={e => upd(r.ign, r.teamId, 'placement', e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-cyan-300 px-1" placeholder="1-16"/>
                            </td>
                            {/* Survival time */}
                            <td className="px-2 py-1.5">
                              <Input type="text" value={r.survivalTime}
                                onChange={e => upd(r.ign, r.teamId, 'survivalTime', e.target.value)}
                                className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-slate-300 px-1" placeholder="mm:ss"/>
                            </td>
                            {/* Kills */}
                            <td className="px-2 py-1.5">
                              <Input type="number" min={0} value={r.kills}
                                onChange={e => upd(r.ign, r.teamId, 'kills', e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-amber-200 px-1" placeholder="0"/>
                            </td>
                            {/* Damage */}
                            <td className="px-2 py-1.5">
                              <Input type="number" min={0} value={r.damage}
                                onChange={e => upd(r.ign, r.teamId, 'damage', e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-red-300 px-1" placeholder="0"/>
                            </td>
                            {/* Total */}
                            <td className={`px-3 py-2 text-center text-[12px] font-black ${rc(pi + 1)}`}>{tot || '—'}</td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {!selMatch && selTournament && (
        <Alert className="border-slate-800 bg-slate-900/70 text-slate-400 text-xs">
          <AlertDescription>Select a match above to enter results.</AlertDescription>
        </Alert>
      )}
      {!selTournament && (
        <Alert className="border-slate-800 bg-slate-900/70 text-slate-400 text-xs">
          <AlertDescription>Select a tournament to get started.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
