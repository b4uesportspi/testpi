import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Plus, Trophy, Users, Key, Gamepad2, Trash2, X, Map,
  Pencil, Save, Swords, Shield, Clock, CheckCircle2, AlertCircle,
  Eye, EyeOff, Zap, Target, Crown, ChevronLeft, Activity,
  Flame, BarChart3,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tournament {
  id: string; title: string; description: string; game: string; mode: string;
  teamSize: number; registrationFeePi: string; prizePoolPi: string;
  paidEntries?: number; status: string; maxParticipants: number;
  startsAt: string; registrationClosesAt: string;
}
interface Match {
  id: string; matchNumber: number; status: string; mapName?: string;
  roomCode?: string; roomPassword?: string; scheduledAt: string; lobbyId?: string;
}
interface RegisteredTeam {
  id: string; name: string; teamLogo?: string | null; registration?: any;
}
// PT = placement points entered by admin directly. TOTAL = PT + ELIMS.
interface MatchResultsForm { pt: string; kills: string; wwcd: string; prize: string; }
interface LeaderboardEntry {
  teamId: string; rank: number; totalPoints: number; totalKills: number;
  matchesPlayed: number; wwcdCount: number;
}

const MAP_OPTIONS = ["Erangle","Rondo","Miramar","Livik","Shanhok"] as const;
const TDM_MAP_OPTIONS = ["Warehouse","Ruins","Hangar","Santorini"] as const;
const toLocal = (d: Date) => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);

// ─── Status helpers ────────────────────────────────────────────────────────────
function statusColor(status: string) {
  const m: Record<string,string> = {
    registration_open:'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    registration_closed:'text-red-400 bg-red-500/10 border-red-500/30',
    in_progress:'text-blue-400 bg-blue-500/10 border-blue-500/30',
    completed:'text-slate-400 bg-slate-600/20 border-slate-600/30',
    live:'text-amber-400 bg-amber-500/10 border-amber-500/30',
    scheduled:'text-violet-400 bg-violet-500/10 border-violet-500/30',
    cancelled:'text-red-500 bg-red-800/20 border-red-800/30',
    draft:'text-slate-500 bg-slate-700/30 border-slate-700/30',
  };
  return m[status] ?? 'text-slate-400 bg-slate-700/30 border-slate-700/30';
}
function matchStatusIcon(status: string) {
  if (status==='completed') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/>;
  if (status==='live') return <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse"/>;
  if (status==='cancelled') return <AlertCircle className="h-3.5 w-3.5 text-red-400"/>;
  return <Clock className="h-3.5 w-3.5 text-slate-500"/>;
}

// ─── Team Logo ─────────────────────────────────────────────────────────────────
function TLogo({ logo, name, cls="h-8 w-8" }: { logo?: string|null; name: string; cls?: string }) {
  if (typeof logo==='string' && /^https?:\/\//i.test(logo))
    return <img src={logo} alt="" className={`${cls} rounded-lg object-cover border border-amber-700/30`}/>;
  return (
    <div className={`${cls} rounded-lg bg-gradient-to-br from-amber-900/60 to-slate-900 border border-amber-700/30 flex items-center justify-center text-[9px] font-black text-amber-200`}>
      {name.slice(0,2).toUpperCase()}
    </div>
  );
}

// ─── Tournament Card ─────────────────────────────────────────────────────────
function TournamentCard({ t, onManage, onDelete, deleting }: { t: Tournament; onManage: ()=>void; onDelete: ()=>void; deleting: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.07)]">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-500/60 via-blue-500/40 to-transparent"/>
      <div className="absolute top-3 right-3 h-20 w-20 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"/>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Gamepad2 className="h-5 w-5 text-cyan-300"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-sm truncate">{t.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}>
                {t.status.replace(/_/g,' ')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t.mode} · {t.game}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            {label:'Entry', value:`${t.registrationFeePi} Pi`, icon:<Key className="h-3 w-3"/>},
            {label:'Prize', value:`${Number(t.prizePoolPi).toFixed(1)} Pi`, icon:<Trophy className="h-3 w-3"/>},
            {label:'Teams', value:String(t.paidEntries??0), icon:<Users className="h-3 w-3"/>},
          ].map(({label,value,icon})=>(
            <div key={label} className="rounded-xl bg-slate-800/50 border border-slate-700/40 px-2.5 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">{icon}<span className="text-[9px] uppercase tracking-wider">{label}</span></div>
              <p className="text-xs font-black text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 mb-3 flex items-center gap-1">
          <Clock className="h-3 w-3"/>{t.startsAt ? new Date(t.startsAt).toLocaleString() : 'TBA'}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border border-cyan-500/25 text-xs h-8 font-bold gap-1.5" onClick={onManage}>
            <Swords className="h-3 w-3"/>Manage
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400/60 hover:bg-red-500/10 hover:text-red-400" onClick={onDelete} disabled={deleting}>
            <Trash2 className="h-3.5 w-3.5"/>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TournamentManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<'list'|'detail'|'results'>('list');
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [editMatchId, setEditMatchId] = useState('');
  const [resultsMatchId, setResultsMatchId] = useState('');
  const [showRoomCode, setShowRoomCode] = useState<Record<string,boolean>>({});
  const [matchResultsForm, setMatchResultsForm] = useState<Record<string,MatchResultsForm>>({});
  const [activeMatchTab, setActiveMatchTab] = useState<'active'|'completed'>('active');

  const [tForm, setTForm] = useState({
    title:'', description:'', game:'PUBG', mode:'squad', maxParticipants:16,
    teamSize:4, registrationFeePi:5,
    startsAt: toLocal(new Date(Date.now()+7*24*60*60*1000)),
  });
  const [lForm, setLForm] = useState({ matchNumber:1, mapName:'Erangle', roomCode:'', roomPassword:'', scheduledAt:'' });
  const [mEditForm, setMEditForm] = useState({ mapName:'Erangle', roomCode:'', roomPassword:'', scheduledAt:'' });

  const { data: tournaments=[], isLoading: tLoading } = useQuery<Tournament[]>({
    queryKey:['/api/tournaments'],
    queryFn: async () => {
      const r = await apiRequest('GET','/api/tournaments');
      const d = await r.json();
      return Array.isArray(d) ? d : d?.tournaments || [];
    },
  });

  const { data: detail, isLoading: dLoading } = useQuery<any>({
    queryKey:[`/api/tournaments/${selectedId}`],
    enabled: !!selectedId,
  });

  const createT = useMutation({
    mutationFn: async () => { const r=await apiRequest('POST','/api/tournaments',tForm); return r.json(); },
    onSuccess: () => {
      toast({title:'Tournament Created', variant:'success'});
      setShowCreate(false);
      setTForm({title:'',description:'',game:'PUBG',mode:'squad',maxParticipants:16,teamSize:4,registrationFeePi:5,startsAt:toLocal(new Date(Date.now()+7*24*60*60*1000))});
      qc.invalidateQueries({queryKey:['/api/tournaments']});
    },
    onError:(e:Error)=>toast({title:'Creation Failed',description:e.message,variant:'destructive'}),
  });

  const deleteT = useMutation({
    mutationFn: async (id:string) => { const r=await apiRequest('DELETE',`/api/tournaments/${id}`); return r.json(); },
    onSuccess:(_,id) => {
      toast({title:'Tournament Deleted', variant:'info'});
      if(selectedId===id){setSelectedId('');setView('list');}
      qc.invalidateQueries({queryKey:['/api/tournaments']});
    },
    onError:(e:Error)=>toast({title:'Delete Failed',description:e.message,variant:'destructive'}),
  });

  const createLobby = useMutation({
    mutationFn: async () => { const r=await apiRequest('POST',`/api/tournaments/${selectedId}/lobby`,lForm); return r.json(); },
    onSuccess: () => {
      toast({title:`Match ${lForm.matchNumber} Lobby Created`, variant:'success'});
      setShowLobby(false);
      setLForm({matchNumber:1,mapName:'Erangle',roomCode:'',roomPassword:'',scheduledAt:''});
      qc.invalidateQueries({queryKey:[`/api/tournaments/${selectedId}`]});
    },
    onError:(e:Error)=>toast({title:'Lobby Creation Failed',description:e.message,variant:'destructive'}),
  });

  const updateMatch = useMutation({
    mutationFn: async (matchId:string) => { const r=await apiRequest('PATCH',`/api/tournaments/${selectedId}/matches/${matchId}`,mEditForm); return r.json(); },
    onSuccess: () => {
      toast({title:'Match Updated', variant:'success'});
      setEditMatchId('');
      qc.invalidateQueries({queryKey:[`/api/tournaments/${selectedId}`]});
    },
    onError:(e:Error)=>toast({title:'Update Failed',description:e.message,variant:'destructive'}),
  });

  const deleteMatch = useMutation({
    mutationFn: async (matchId:string) => { const r=await apiRequest('DELETE',`/api/tournaments/${selectedId}/matches/${matchId}`); return r.json(); },
    onSuccess: () => {
      toast({title:'Match Deleted', variant:'info'});
      qc.invalidateQueries({queryKey:[`/api/tournaments/${selectedId}`]});
    },
    onError:(e:Error)=>toast({title:'Delete Failed',description:e.message,variant:'destructive'}),
  });

  // PT is placement points entered directly by admin.
  // We send placementPoints = pt, placement = null (no position needed).
  // TOTAL = pt + kills, used for leaderboard ranking.
  const submitResults = useMutation({
    mutationFn: async (matchId:string) => {
      const results = Object.entries(matchResultsForm).map(([teamId,row])=>({
        teamId,
        placement: null,                          // no position — admin enters PT directly
        placementPoints: Number(row.pt||0),        // PT entered by admin
        kills: Number(row.kills||0),
        wwcd: row.wwcd!=='' ? Number(row.wwcd) : 0,
        prize: row.prize||'0',
      }));
      const r = await apiRequest('POST',`/api/tournaments/${selectedId}/matches/${matchId}/complete`,{results});
      const d = await r.json();
      if(!r.ok) throw new Error(d.error||'Save failed');
      return d;
    },
    onSuccess: () => {
      toast({title:'Results Saved',description:'Leaderboard updating in background.', variant:'success'});
      setResultsMatchId('');
      qc.invalidateQueries({queryKey:[`/api/tournaments/${selectedId}`]});
    },
    onError:(e:Error)=>toast({title:'Save Failed',description:e.message,variant:'destructive'}),
  });

  const openResults = async (matchId:string) => {
    const teams:RegisteredTeam[] = detail?.teams||[];
    const init:Record<string,MatchResultsForm> = {};
    teams.forEach(t=>{ init[t.id]={pt:'0',kills:'0',wwcd:'0',prize:'0'}; });
    setMatchResultsForm(init);
    setResultsMatchId(matchId);
    try {
      const r = await apiRequest('GET',`/api/tournaments/${selectedId}/matches/${matchId}/results`);
      const d = await r.json();
      const results:any[] = d?.results||[];
      const updated = {...init};
      results.forEach(res=>{
        if(updated[res.teamId]) updated[res.teamId]={
          pt: String(res.placementPoints??res.placement_points??0),
          kills: String(res.kills??0),
          wwcd: String(res.wwcd??0),
          prize: String(res.prizePi??'0'),
        };
      });
      setMatchResultsForm(updated);
    } catch{}
  };

  const setResult = (teamId:string, f:keyof MatchResultsForm, v:string) =>
    setMatchResultsForm(p=>({...p,[teamId]:{...p[teamId],[f]:v}}));

  const selectedTournament = tournaments.find(t=>t.id===selectedId);
  const matches:Match[] = detail?.matches||[];
  const teams:RegisteredTeam[] = detail?.teams||[];
  const leaderboard:LeaderboardEntry[] = detail?.leaderboard||[];
  const activeMatches = matches.filter(m=>m.status!=='completed');
  const completedMatches = matches.filter(m=>m.status==='completed');
  const displayMatches = activeMatchTab==='active' ? activeMatches : completedMatches;
  const resultsMatch = matches.find(m=>m.id===resultsMatchId);
  const teamNameMap = Object.fromEntries(teams.map(t=>[t.id, t.name]));
  const teamLogoMap = Object.fromEntries(teams.map(t=>[t.id, t.teamLogo]));

  return (
    <div className="space-y-5">

      {/* ══ PAGE HEADER ══ */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 px-5 py-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.07),transparent_60%)]"/>
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"/>
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {view!=='list' && (
              <button
                onClick={()=>{
                  if(view==='results'){setResultsMatchId('');setView('detail');}
                  else{setView('list');setSelectedId('');}
                }}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-3 py-1.5 rounded-lg transition-all">
                <ChevronLeft className="h-3.5 w-3.5"/>
                {view==='results' ? 'Back to Matches' : 'All Tournaments'}
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-cyan-400"/>
                </div>
                <h2 className="text-base font-black text-white">
                  {view==='list' ? 'Tournament Operations'
                   : view==='results' ? `Results — Match ${resultsMatch?.matchNumber}`
                   : selectedTournament?.title || 'Tournament'}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-10">
                {view==='list' ? 'Create and manage PUBG tournaments, matches, and lobbies.'
                 : view==='results' ? `${selectedTournament?.title} · Enter WIN · PT · ELIMS per team`
                 : `${matches.length} matches · ${teams.length} teams registered`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {view==='detail' && (
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-xs h-8 px-3 font-bold gap-1.5" onClick={()=>setShowLobby(true)}>
                <Plus className="h-3 w-3"/>Add Match
              </Button>
            )}
            {view==='list' && (
              <Button size="sm" className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-xs h-8 px-3 font-bold gap-1.5 shadow-lg shadow-red-500/20" onClick={()=>setShowCreate(true)}>
                <Plus className="h-3 w-3"/>New Tournament
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ══ TOURNAMENT LIST ══ */}
      {view==='list' && (
        <div>
          {tLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"/>
                <Trophy className="h-4 w-4 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
              </div>
              <p className="text-slate-500 text-sm">Loading tournaments...</p>
            </div>
          ) : tournaments.length===0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/60 py-20 text-center bg-slate-900/30">
              <div className="h-16 w-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-slate-600"/>
              </div>
              <p className="text-slate-300 font-bold text-base">No tournaments yet</p>
              <p className="text-slate-600 text-sm mt-1 mb-5">Create your first tournament to get started</p>
              <Button size="sm" className="bg-red-600 hover:bg-red-500 text-xs font-bold gap-1.5" onClick={()=>setShowCreate(true)}>
                <Plus className="h-3 w-3"/>Create Tournament
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active / current tournaments */}
              {(() => {
                const activeStatuses = ['registration_open', 'published', 'draft', 'live', 'in_progress', 'scheduled'];
                const pastStatuses   = ['completed', 'cancelled', 'registration_closed'];
                const activeTournaments = tournaments.filter(t => activeStatuses.includes(t.status))
                  .sort((a,b) => new Date(b.startsAt||0).getTime() - new Date(a.startsAt||0).getTime());
                const pastTournaments   = tournaments.filter(t => pastStatuses.includes(t.status))
                  .sort((a,b) => new Date(b.startsAt||0).getTime() - new Date(a.startsAt||0).getTime());
                return (
                  <>
                    {activeTournaments.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Zap className="h-3 w-3"/> Active Tournaments
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {activeTournaments.map(t => <TournamentCard key={t.id} t={t} onManage={()=>{setSelectedId(t.id);setView('detail');}} onDelete={()=>{ if(confirm(`Delete "${t.title}"?`)) deleteT.mutate(t.id); }} deleting={deleteT.isPending}/>)}
                        </div>
                      </div>
                    )}
                    {pastTournaments.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Clock className="h-3 w-3"/> Past Tournaments
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
                          {pastTournaments.map(t => <TournamentCard key={t.id} t={t} onManage={()=>{setSelectedId(t.id);setView('detail');}} onDelete={()=>{ if(confirm(`Delete "${t.title}"?`)) deleteT.mutate(t.id); }} deleting={deleteT.isPending}/>)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══ TOURNAMENT DETAIL ══ */}
      {view==='detail' && (
        <div className="space-y-5">
          {dLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"/>
              <p className="text-slate-500 text-sm">Loading tournament data...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {label:'Total Matches',value:matches.length,icon:<Activity className="h-4 w-4"/>,color:'text-cyan-300',bg:'bg-cyan-500/10 border-cyan-500/20'},
                  {label:'Teams',value:teams.length,icon:<Users className="h-4 w-4"/>,color:'text-emerald-300',bg:'bg-emerald-500/10 border-emerald-500/20'},
                  {label:'Completed',value:completedMatches.length,icon:<CheckCircle2 className="h-4 w-4"/>,color:'text-amber-300',bg:'bg-amber-500/10 border-amber-500/20'},
                  {label:'Active',value:activeMatches.length,icon:<Flame className="h-4 w-4"/>,color:'text-blue-300',bg:'bg-blue-500/10 border-blue-500/20'},
                ].map(({label,value,icon,color,bg})=>(
                  <div key={label} className={`rounded-xl border ${bg} px-3 py-3 flex items-center gap-3`}>
                    <div className={`${color} opacity-70`}>{icon}</div>
                    <div>
                      <p className={`text-xl font-black ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Matches scrollable table card ── */}
              <div className="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/80">
                {/* sticky header */}
                <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 px-4 py-3 border-b border-slate-700/40 flex items-center gap-2 sticky top-0 z-10">
                  <Swords className="h-4 w-4 text-cyan-400"/>
                  <h3 className="font-black text-white text-sm">Matches</h3>
                  <div className="flex gap-1.5 ml-3">
                    {(['active','completed'] as const).map(tab=>(
                      <button key={tab} onClick={()=>setActiveMatchTab(tab)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${activeMatchTab===tab ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800/60 text-slate-500 border-slate-700/40 hover:text-slate-300'}`}>
                        {tab==='active' ? `Active (${activeMatches.length})` : `Completed (${completedMatches.length})`}
                      </button>
                    ))}
                  </div>
                </div>
                {displayMatches.length===0 ? (
                  <div className="py-12 text-center">
                    <Shield className="h-8 w-8 text-slate-600 mx-auto mb-2"/>
                    <p className="text-slate-400 text-sm font-semibold">
                      {activeMatchTab==='active' ? 'No active matches. Click "Add Match" to create one.' : 'No completed matches yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" style={{WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
                    <table className="w-full" style={{minWidth:'700px'}}>
                      <thead>
                        <tr className="bg-slate-950 text-amber-400/60 text-[10px] uppercase tracking-wider">
                          <th className="px-3 py-2 text-left font-black">Match #</th>
                          <th className="px-3 py-2 text-left font-black">Map</th>
                          <th className="px-3 py-2 text-left font-black">Time</th>
                          <th className="px-3 py-2 text-left font-black">Room Code</th>
                          <th className="px-3 py-2 text-center font-black">Status</th>
                          <th className="px-3 py-2 text-center font-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayMatches.map(match=>(
                          <MatchTableRow key={match.id} match={match}
                            editMatchId={editMatchId} setEditMatchId={setEditMatchId}
                            mEditForm={mEditForm} setMEditForm={setMEditForm}
                            showRoomCode={showRoomCode} setShowRoomCode={setShowRoomCode}
                            updateMatch={updateMatch} deleteMatch={deleteMatch}
                            openResults={openResults} setView={setView}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {leaderboard.length > 0 && (
                <LeaderboardPanel leaderboard={leaderboard} teamNameMap={teamNameMap} teamLogoMap={teamLogoMap}/>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ RESULTS VIEW ══ */}
      {view==='results' && resultsMatchId && (
        <ResultsPanel
          matchId={resultsMatchId}
          match={resultsMatch}
          teams={teams}
          matchResultsForm={matchResultsForm}
          setResult={setResult}
          submitResults={submitResults}
          onClose={()=>{setResultsMatchId('');setView('detail');}}
          selectedTournament={selectedTournament}
        />
      )}

      {/* ══ CREATE TOURNAMENT DIALOG ══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="inset-0 left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full sm:inset-4 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-w-md sm:h-auto sm:max-h-[90dvh] bg-slate-950 border-0 sm:border sm:border-slate-800 text-white rounded-none sm:rounded-2xl p-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-cyan-900/30 to-slate-900 px-5 py-5 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-cyan-400"/>Create Tournament
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">Set up a new PUBG tournament</p>
          </div>
          <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Title</Label>
              <Input className="bg-slate-900 border-slate-700 h-12 text-base" value={tForm.title} onChange={e=>setTForm({...tForm,title:e.target.value})} placeholder="e.g. PUBG Mobile Championship 2025"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Description</Label>
              <Input className="bg-slate-900 border-slate-700 h-12 text-base" value={tForm.description} onChange={e=>setTForm({...tForm,description:e.target.value})} placeholder="Short description"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Mode</Label>
                <Select value={tForm.mode} onValueChange={v=>setTForm({...tForm,mode:v,teamSize:v==='solo'?1:v==='duo'?2:4})}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-12 text-base"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="solo">Solo</SelectItem><SelectItem value="duo">Duo</SelectItem><SelectItem value="squad">Squad</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Max Teams</Label>
                <Input type="number" className="bg-slate-900 border-slate-700 h-12 text-base" value={tForm.maxParticipants} onChange={e=>setTForm({...tForm,maxParticipants:parseInt(e.target.value)||16})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Entry Fee (Pi)</Label>
                <Input type="number" className="bg-slate-900 border-slate-700 h-12 text-base" value={tForm.registrationFeePi} onChange={e=>setTForm({...tForm,registrationFeePi:parseInt(e.target.value)||0})}/>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Prize Pool</Label>
                <div className="h-12 flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 text-base font-bold text-emerald-300">
                  {(tForm.maxParticipants*tForm.registrationFeePi*0.95).toFixed(1)} Pi
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Start Date & Time</Label>
              <Input type="datetime-local" className="bg-slate-900 border-slate-700 h-12 text-base" value={tForm.startsAt} onChange={e=>setTForm({...tForm,startsAt:e.target.value})}/>
            </div>
          </div>
          <div className="px-5 py-5 border-t border-slate-800 flex gap-3 shrink-0">
            <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 h-12 text-base" onClick={()=>setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-500 h-12 text-base font-bold" onClick={()=>createT.mutate()} disabled={createT.isPending||!tForm.title}>
              {createT.isPending?<Loader2 className="mr-1 h-5 w-5 animate-spin"/>:null}Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ CREATE LOBBY/MATCH DIALOG ══ */}
      <Dialog open={showLobby} onOpenChange={setShowLobby}>
        <DialogContent className="inset-0 left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full sm:inset-4 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-w-md sm:h-auto sm:max-h-[90dvh] bg-slate-950 border-0 sm:border sm:border-slate-800 text-white rounded-none sm:rounded-2xl p-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-900/30 to-slate-900 px-5 py-5 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400"/>Add Match Lobby
            </DialogTitle>
            <p className="text-xs text-slate-400 mt-1">Create a match with room code and map</p>
          </div>
          <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Match #</Label>
                <Select value={String(lForm.matchNumber)} onValueChange={v=>setLForm({...lForm,matchNumber:parseInt(v)})}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-12 text-base"><SelectValue/></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6].map(n=><SelectItem key={n} value={String(n)}>Match {n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider">Map</Label>
                <Select value={lForm.mapName} onValueChange={v=>setLForm({...lForm,mapName:v})}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-12 text-base"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {MAP_OPTIONS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}
                    {TDM_MAP_OPTIONS.map(m=><SelectItem key={m} value={m}>TDM — {m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Scheduled Time</Label>
              <Input type="datetime-local" className="bg-slate-900 border-slate-700 h-12 text-base" value={lForm.scheduledAt} onChange={e=>setLForm({...lForm,scheduledAt:e.target.value})}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Room Code</Label>
              <Input className="bg-slate-900 border-slate-700 h-12 text-base font-mono" value={lForm.roomCode} onChange={e=>setLForm({...lForm,roomCode:e.target.value})} placeholder="B4U123"/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Password</Label>
              <Input type="password" className="bg-slate-900 border-slate-700 h-12 text-base font-mono" value={lForm.roomPassword} onChange={e=>setLForm({...lForm,roomPassword:e.target.value})} placeholder="••••••"/>
            </div>
          </div>
          <div className="px-5 py-5 border-t border-slate-800 flex gap-3 shrink-0">
            <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 h-12 text-base" onClick={()=>setShowLobby(false)}>Cancel</Button>
            <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 h-12 text-base font-bold" onClick={()=>createLobby.mutate()} disabled={createLobby.isPending||!lForm.roomCode||!lForm.roomPassword}>
              {createLobby.isPending?<Loader2 className="mr-1 h-5 w-5 animate-spin"/>:null}Create Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match, editMatchId, setEditMatchId, mEditForm, setMEditForm,
  showRoomCode, setShowRoomCode, updateMatch, deleteMatch, openResults, setView }: any) {
  const isEditing = editMatchId===match.id;
  const isCompleted = match.status==='completed';
  const isLive = match.status==='live';
  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
      isCompleted?'border-emerald-500/20 bg-gradient-to-br from-slate-900 to-slate-950':
      isLive?'border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.08)]':
      'border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950'}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${isCompleted?'bg-gradient-to-r from-emerald-500/70 to-transparent':isLive?'bg-gradient-to-r from-amber-500 to-amber-400/50 animate-pulse':'bg-gradient-to-r from-blue-500/40 to-transparent'}`}/>
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border ${isCompleted?'bg-emerald-500/10 text-emerald-300 border-emerald-500/25':isLive?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
            {match.matchNumber}
          </div>
          <div>
            <p className="font-black text-white text-sm">Match {match.matchNumber}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {matchStatusIcon(match.status)}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isCompleted?'text-emerald-400 bg-emerald-500/10 border-emerald-500/25':isLive?'text-amber-400 bg-amber-500/10 border-amber-500/25':'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>{match.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={()=>{setEditMatchId(isEditing?'':match.id);setMEditForm({mapName:match.mapName||'Erangle',roomCode:match.roomCode||'',roomPassword:match.roomPassword||'',scheduledAt:match.scheduledAt?toLocal(new Date(match.scheduledAt)):''});}}
            className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            {isEditing?<X className="h-3.5 w-3.5"/>:<Pencil className="h-3.5 w-3.5"/>}
          </button>
          <button onClick={()=>{if(confirm(`Delete Match ${match.matchNumber}?`))deleteMatch.mutate(match.id);}}
            className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5"/>
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Map</Label>
                <Select value={mEditForm.mapName} onValueChange={(v:string)=>setMEditForm({...mEditForm,mapName:v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 h-8 text-xs mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {MAP_OPTIONS.map((m:string)=><SelectItem key={m} value={m}>{m}</SelectItem>)}
                    {TDM_MAP_OPTIONS.map((m:string)=><SelectItem key={m} value={m}>TDM — {m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Time</Label>
                <Input type="datetime-local" className="bg-slate-950 border-slate-700 h-8 text-xs mt-1" value={mEditForm.scheduledAt} onChange={(e:any)=>setMEditForm({...mEditForm,scheduledAt:e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Room Code</Label>
                <Input className="bg-slate-950 border-slate-700 h-8 text-xs mt-1 font-mono" value={mEditForm.roomCode} onChange={(e:any)=>setMEditForm({...mEditForm,roomCode:e.target.value})} placeholder="B4U123"/>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Password</Label>
                <Input type="password" className="bg-slate-950 border-slate-700 h-8 text-xs mt-1 font-mono" value={mEditForm.roomPassword} onChange={(e:any)=>setMEditForm({...mEditForm,roomPassword:e.target.value})} placeholder="••••••"/>
              </div>
            </div>
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 h-8 text-xs font-bold gap-1.5" onClick={()=>updateMatch.mutate(match.id)} disabled={updateMatch.isPending}>
              {updateMatch.isPending?<Loader2 className="h-3 w-3 animate-spin"/>:<Save className="h-3 w-3"/>}Save Changes
            </Button>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-3">
              {match.mapName&&<div className="flex items-center gap-1.5 text-slate-400"><Map className="h-3 w-3 text-slate-500"/><span className="text-white font-semibold">{match.mapName}</span></div>}
              {match.scheduledAt&&<div className="flex items-center gap-1.5 text-slate-400"><Clock className="h-3 w-3 text-slate-500"/><span>{new Date(match.scheduledAt).toLocaleString()}</span></div>}
            </div>
            {match.roomCode&&(
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-slate-700/40 px-3 py-2">
                <Key className="h-3 w-3 text-amber-400 shrink-0"/>
                <span className="font-mono text-amber-300 font-bold">{match.roomCode}</span>
                <span className="text-slate-600 mx-1">·</span>
                <span className="font-mono text-slate-400 flex-1">{showRoomCode[match.id]?match.roomPassword:'••••••'}</span>
                <button onClick={()=>setShowRoomCode((p:any)=>({...p,[match.id]:!p[match.id]}))} className="text-slate-500 hover:text-slate-300 ml-auto">
                  {showRoomCode[match.id]?<EyeOff className="h-3 w-3"/>:<Eye className="h-3 w-3"/>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {!isEditing&&(
        <div className="px-4 pb-4">
          <Button size="sm" className={`w-full text-xs h-8 font-bold gap-1.5 border ${isCompleted?'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border-emerald-500/25':'bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border-amber-500/25'}`}
            onClick={()=>{openResults(match.id);setView('results');}}>
            <Trophy className="h-3 w-3"/>
            {isCompleted?'Edit Results':'Enter Results'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Match Table Row ──────────────────────────────────────────────────────────
function MatchTableRow({ match, editMatchId, setEditMatchId, mEditForm, setMEditForm,
  showRoomCode, setShowRoomCode, updateMatch, deleteMatch, openResults, setView }: any) {
  const isEditing = editMatchId===match.id;
  const isCompleted = match.status==='completed';
  const isLive = match.status==='live';
  return (
    <>
      <tr className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors ${isLive?'bg-amber-950/10':''}`}>
        {/* Match # */}
        <td className="px-3 py-2">
          <div className={`inline-flex h-8 w-8 rounded-lg items-center justify-center font-black text-sm border ${isCompleted?'bg-emerald-500/10 text-emerald-300 border-emerald-500/25':isLive?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
            {match.matchNumber}
          </div>
        </td>
        {/* Map */}
        <td className="px-3 py-2 text-xs text-white font-semibold">{match.mapName||<span className="text-slate-600">—</span>}</td>
        {/* Time */}
        <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{match.scheduledAt?new Date(match.scheduledAt).toLocaleString():<span className="text-slate-600">—</span>}</td>
        {/* Room Code */}
        <td className="px-3 py-2">
          {match.roomCode?(
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 px-2 py-1 w-fit">
              <Key className="h-3 w-3 text-amber-400 shrink-0"/>
              <span className="font-mono text-amber-300 font-bold text-xs">{match.roomCode}</span>
              <span className="text-slate-600 mx-0.5">·</span>
              <span className="font-mono text-slate-400 text-xs">{showRoomCode[match.id]?match.roomPassword:'••••••'}</span>
              <button onClick={()=>setShowRoomCode((p:any)=>({...p,[match.id]:!p[match.id]}))} className="text-slate-500 hover:text-slate-300 ml-1">
                {showRoomCode[match.id]?<EyeOff className="h-3 w-3"/>:<Eye className="h-3 w-3"/>}
              </button>
            </div>
          ):<span className="text-slate-600 text-xs">—</span>}
        </td>
        {/* Status */}
        <td className="px-3 py-2 text-center">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCompleted?'text-emerald-400 bg-emerald-500/10 border-emerald-500/25':isLive?'text-amber-400 bg-amber-500/10 border-amber-500/25':'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
            {matchStatusIcon(match.status)}{match.status}
          </span>
        </td>
        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1 justify-center">
            <button onClick={()=>{setEditMatchId(isEditing?'':match.id);setMEditForm({mapName:match.mapName||'Erangle',roomCode:match.roomCode||'',roomPassword:match.roomPassword||'',scheduledAt:match.scheduledAt?toLocal(new Date(match.scheduledAt)):''});}}
              className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              {isEditing?<X className="h-3.5 w-3.5"/>:<Pencil className="h-3.5 w-3.5"/>}
            </button>
            <button onClick={()=>{if(confirm(`Delete Match ${match.matchNumber}?`))deleteMatch.mutate(match.id);}}
              className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
            <Button size="sm" className={`text-[11px] h-7 px-2 font-bold gap-1 border ${isCompleted?'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border-emerald-500/25':'bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border-amber-500/25'}`}
              onClick={()=>{openResults(match.id);setView('results');}}>
              <Trophy className="h-3 w-3"/>
              {isCompleted?'Edit':'Results'}
            </Button>
          </div>
        </td>
      </tr>
      {/* Inline edit row */}
      {isEditing&&(
        <tr className="border-b border-slate-700/60 bg-slate-950/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Map</Label>
                <Select value={mEditForm.mapName} onValueChange={(v:string)=>setMEditForm({...mEditForm,mapName:v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 h-8 text-xs mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {MAP_OPTIONS.map((m:string)=><SelectItem key={m} value={m}>{m}</SelectItem>)}
                    {TDM_MAP_OPTIONS.map((m:string)=><SelectItem key={m} value={m}>TDM — {m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Time</Label>
                <Input type="datetime-local" className="bg-slate-950 border-slate-700 h-8 text-xs mt-1" value={mEditForm.scheduledAt} onChange={(e:any)=>setMEditForm({...mEditForm,scheduledAt:e.target.value})}/>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Room Code</Label>
                <Input className="bg-slate-950 border-slate-700 h-8 text-xs mt-1 font-mono" value={mEditForm.roomCode} onChange={(e:any)=>setMEditForm({...mEditForm,roomCode:e.target.value})} placeholder="B4U123"/>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Password</Label>
                <Input type="password" className="bg-slate-950 border-slate-700 h-8 text-xs mt-1 font-mono" value={mEditForm.roomPassword} onChange={(e:any)=>setMEditForm({...mEditForm,roomPassword:e.target.value})} placeholder="••••••"/>
              </div>
            </div>
            <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-500 h-8 text-xs font-bold gap-1.5" onClick={()=>updateMatch.mutate(match.id)} disabled={updateMatch.isPending}>
              {updateMatch.isPending?<Loader2 className="h-3 w-3 animate-spin"/>:<Save className="h-3 w-3"/>}Save Changes
            </Button>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({ leaderboard, teamNameMap, teamLogoMap }: {
  leaderboard: LeaderboardEntry[];
  teamNameMap: Record<string,string>;
  teamLogoMap: Record<string,string|null|undefined>;
}) {
  const rs = (rank:number) => {
    if(rank===1) return {bg:'bg-gradient-to-r from-amber-700/40 to-transparent',tc:'text-amber-300'};
    if(rank===2) return {bg:'bg-gradient-to-r from-slate-500/25 to-transparent',tc:'text-slate-300'};
    if(rank===3) return {bg:'bg-gradient-to-r from-orange-800/30 to-transparent',tc:'text-orange-400'};
    return {bg:'',tc:'text-amber-200/55'};
  };
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/80">
      {/* sticky header */}
      <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 px-4 py-3 border-b border-amber-800/25 flex items-center gap-2 sticky top-0 z-10">
        <BarChart3 className="h-4 w-4 text-amber-400"/>
        <h3 className="font-black text-white text-sm">Live Rankings</h3>
        <span className="ml-auto text-[10px] text-amber-400/60 uppercase tracking-wider">{leaderboard.length} teams · TOTAL = PT + ELIMS</span>
      </div>
      {/* scroll wrapper */}
      <div className="overflow-x-auto bg-gradient-to-b from-[#1e1008] to-[#120a04]" style={{WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
        <table className="w-full" style={{minWidth:'600px'}}>
          <thead>
            <tr className="bg-slate-950 text-amber-400/60 text-[10px] uppercase tracking-wider border-b border-amber-900/25">
              <th className="px-3 py-2 text-center font-black w-[44px]">Rank</th>
              <th className="px-3 py-2 text-left font-black w-[32px]"></th>
              <th className="px-3 py-2 text-left font-black">Team</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">Total</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">PT</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">Elims</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">WWCDs</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">Matches</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((e,idx)=>{
              const {bg,tc}=rs(e.rank);
              const name=teamNameMap[e.teamId]||'Unknown';
              const logo=teamLogoMap[e.teamId];
              return (
                <tr key={e.teamId} className={`border-b border-amber-900/15 last:border-b-0 hover:bg-slate-800/30 transition-colors ${bg} ${idx%2===0?'bg-[#1a0e06]/50':'bg-[#150b04]/50'}`}>
                  <td className={`px-3 py-2 text-center text-sm font-black ${tc}`}>{String(e.rank).padStart(2,'0')}</td>
                  <td className="px-1 py-2"><div className="flex justify-center"><TLogo logo={logo} name={name} cls="h-7 w-7"/></div></td>
                  <td className={`px-3 py-2 text-[12px] font-bold truncate max-w-[160px] ${e.rank<=3?'text-white':'text-amber-100/75'}`}>{name.toUpperCase()}</td>
                  <td className={`px-3 py-2 text-center text-[13px] font-black ${tc}`}>{e.totalPoints}</td>
                  <td className="px-3 py-2 text-center text-[12px] font-bold text-cyan-300">{e.totalPoints - e.totalKills}</td>
                  <td className="px-3 py-2 text-center text-[12px] font-bold text-amber-200/70">{e.totalKills}</td>
                  <td className="px-3 py-2 text-center text-[12px] font-bold text-amber-300">{e.wwcdCount}</td>
                  <td className="px-3 py-2 text-center text-[12px] font-bold text-slate-400">{e.matchesPlayed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
// Columns: # | Team | WIN | PT (editable) | ELIMS (editable) | TOTAL (auto)
function ResultsPanel({ matchId, match, teams, matchResultsForm, setResult, submitResults, onClose, selectedTournament }: any) {
  // Sort by TOTAL desc (PT + kills), then PT desc as tiebreak
  const ranked = [...teams].sort((a:any,b:any)=>{
    const ra=matchResultsForm[a.id]||{pt:'0',kills:'0'};
    const rb=matchResultsForm[b.id]||{pt:'0',kills:'0'};
    const ta=(Number(ra.pt)||0)+(Number(ra.kills)||0);
    const tb=(Number(rb.pt)||0)+(Number(rb.kills)||0);
    if(tb!==ta) return tb-ta;
    return (Number(rb.pt)||0)-(Number(ra.pt)||0);
  });

  const rc=(idx:number)=>{
    if(idx===0) return 'text-amber-300';
    if(idx===1) return 'text-slate-300';
    if(idx===2) return 'text-orange-400';
    return 'text-amber-200/55';
  };
  const rowBg=(idx:number)=>{
    if(idx===0) return 'bg-gradient-to-r from-amber-700/40 to-transparent';
    if(idx===1) return 'bg-gradient-to-r from-slate-500/20 to-transparent';
    if(idx===2) return 'bg-gradient-to-r from-orange-800/30 to-transparent';
    return idx%2===0?'bg-[#1a0e06]/60':'bg-[#150b04]/60';
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/40 bg-slate-900/80 shadow-2xl">
      {/* sticky header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2a1a0e] via-[#3b1f0a] to-[#1a0e05] px-4 py-4 sticky top-0 z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,100,20,0.12),transparent_60%)]"/>
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400/60">{selectedTournament?.title}</p>
            <h3 className="text-base font-black text-white mt-0.5">Match {match?.matchNumber} · Individual Standings</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-300/40 mt-1.5">
              WIN = chicken dinners · PT = placement pts (enter manually) · ELIMS = kills · TOTAL = PT + ELIMS
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-white shrink-0 mt-0.5">
            <X className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* scroll wrapper */}
      <div className="overflow-x-auto bg-gradient-to-b from-[#1e1008] to-[#120a04]" style={{WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
        <table className="w-full" style={{minWidth:'650px'}}>
          <thead>
            <tr className="bg-slate-950 text-amber-400/55 text-[9px] uppercase tracking-[0.2em] border-b border-amber-900/25">
              <th className="px-3 py-2 text-center font-black w-[44px]">#</th>
              <th className="px-2 py-2 w-[32px]"></th>
              <th className="px-3 py-2 text-left font-black">Team</th>
              <th className="px-3 py-2 text-center font-black w-[60px]">Win</th>
              <th className="px-3 py-2 text-center font-black w-[64px]">PT</th>
              <th className="px-3 py-2 text-center font-black w-[64px]">Elims</th>
              <th className="px-3 py-2 text-center font-black w-[64px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((team:any,idx:number)=>{
              const row=matchResultsForm[team.id]||{pt:'0',kills:'0',wwcd:'0',prize:'0'};
              const total=(Number(row.pt)||0)+(Number(row.kills)||0);
              return (
                <tr key={team.id} className={`border-b border-amber-900/15 last:border-b-0 hover:bg-slate-800/30 transition-colors ${rowBg(idx)}`}>
                  <td className={`px-3 py-2 text-center text-sm font-black ${rc(idx)}`}>{String(idx+1).padStart(2,'0')}</td>
                  <td className="px-1 py-2"><div className="flex justify-center"><TLogo logo={team.teamLogo} name={team.name} cls="h-7 w-7"/></div></td>
                  <td className={`px-3 py-2 text-[12px] font-bold truncate max-w-[160px] ${idx<3?'text-white':'text-amber-100/75'}`}>{team.name.toUpperCase()}</td>
                  {/* WIN */}
                  <td className="px-2 py-1.5">
                    <Input type="number" min={0} value={row.wwcd} onChange={(e:any)=>setResult(team.id,'wwcd',e.target.value)}
                      className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-amber-200 px-1" placeholder="0"/>
                  </td>
                  {/* PT — editable by admin */}
                  <td className="px-2 py-1.5">
                    <Input type="number" min={0} value={row.pt} onChange={(e:any)=>setResult(team.id,'pt',e.target.value)}
                      className="h-8 text-center text-xs bg-slate-950/80 border-cyan-700/50 font-bold text-cyan-300 px-1" placeholder="0"/>
                  </td>
                  {/* ELIMS */}
                  <td className="px-2 py-1.5">
                    <Input type="number" min={0} value={row.kills} onChange={(e:any)=>setResult(team.id,'kills',e.target.value)}
                      className="h-8 text-center text-xs bg-slate-950/80 border-slate-700/50 font-bold text-amber-200 px-1" placeholder="0"/>
                  </td>
                  {/* TOTAL — auto */}
                  <td className={`px-3 py-2 text-center text-[13px] font-black ${rc(idx)}`}>{total||'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-amber-900/25 bg-[#120a04] flex gap-2">
        <Button variant="outline" className="border-slate-700 text-slate-300 h-9 text-sm" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-9 text-sm font-bold gap-1.5"
          onClick={()=>submitResults.mutate(matchId)} disabled={submitResults.isPending||teams.length===0}>
          {submitResults.isPending?<Loader2 className="h-4 w-4 animate-spin"/>:<Target className="h-4 w-4"/>}
          Save Results & Update Rankings
        </Button>
      </div>
    </div>
  );
}
