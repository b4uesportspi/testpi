import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Users, Trophy, Smartphone, Shield, ScrollText, ClipboardCheck, Mail, Image as ImageIcon, Zap, Gamepad2, Eye, EyeOff } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  email: string;
  phone: string;
  pubgIgn: string;
  pubgUid: string;
  isCaptain?: boolean;
  userId?: string;
}

interface Tournament {
  id: string;
  title: string;
  description: string;
  mode: string;
  teamSize: number;
  registrationFeePi: string;
  prizePoolPi: string;
  status: string;
  registrationClosesAt?: string;
  startsAt?: string;
  endsAt?: string;
}

interface Team {
  id: string;
  name: string;
  status: string;
  players: Player[];
  teamLogo?: string | null;
  teamLeaderEmail?: string | null;
  registration?: {
    status: string;
    paymentStatus: string;
  };
}

export default function TournamentRegistration() {
  const [, params] = useRoute("/tournament/:tournamentId");
  const tournamentId = params?.tournamentId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"solo" | "duo" | "squad">("squad");
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [teamLeaderEmail, setTeamLeaderEmail] = useState("");
  const [lobbyAccessEmail, setLobbyAccessEmail] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrationSaved, setRegistrationSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"dashboard" | "rules" | "register" | "teams">("dashboard");
  const [leaderLobbyData, setLeaderLobbyData] = useState<{ team: { id: string; name: string; logo?: string | null }; lobbies: any[] } | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});

  const { data: tournamentResponse, isLoading: tournamentLoading } = useQuery<{
    success: boolean;
    tournament: Tournament;
    lobbies: any[];
  }>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
  });
  const tournament = tournamentResponse?.tournament;
  const entryFeePi = tournament?.registrationFeePi || "0";
  const tournamentMode = (["solo", "duo", "squad"].includes(String(tournament?.mode || "").toLowerCase())
    ? String(tournament?.mode).toLowerCase()
    : mode) as "solo" | "duo" | "squad";
  const modeLabel = tournamentMode.charAt(0).toUpperCase() + tournamentMode.slice(1);
  const modePlayers = tournamentMode === "solo" ? 1 : tournamentMode === "duo" ? 2 : 4;
  const tournamentStatusLabel = useMemo(() => {
    if (!tournament) return 'Loading...';
    const now = Date.now();
    const startsAt = tournament.startsAt ? new Date(tournament.startsAt).getTime() : null;
    const endsAt = tournament.endsAt ? new Date(tournament.endsAt).getTime() : null;
    const registrationClosesAt = tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt).getTime() : null;

    if (endsAt && endsAt <= now) {
      return 'Tournament Ended';
    }
    if ((registrationClosesAt && registrationClosesAt <= now) || (startsAt && startsAt <= now)) {
      return 'Tournament in Process';
    }

    const normalizedStatus = String(tournament.status || '').toLowerCase();
    if (normalizedStatus === 'registration_closed') {
      return 'Registration Closed';
    }
    if (normalizedStatus === 'published' || normalizedStatus === 'registration_open') {
      return 'Registration Open';
    }
    return String(tournament.status || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [tournament]);

  const isRegistrationClosed = useMemo(() => {
    if (!tournament) return true;
    const now = Date.now();
    const startsAt = tournament.startsAt ? new Date(tournament.startsAt).getTime() : null;
    const registrationClosesAt = tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt).getTime() : null;

    const normalizedStatus = String(tournament.status || '').toLowerCase();
    if (['registration_closed', 'in_progress', 'completed', 'ended', 'cancelled'].includes(normalizedStatus)) {
      return true;
    }
    if (registrationClosesAt && registrationClosesAt <= now) {
      return true;
    }
    if (startsAt && startsAt <= now) {
      return true;
    }

    return false;
  }, [tournament]);
  const { data: teamsData, isLoading: teamsLoading } = useQuery<{ teams: Team[] }>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
    enabled: !!tournamentId,
  });

  const registerTeamMutation = useMutation({
    mutationFn: async (data: {
      teamName: string;
      teamLogo: string;
      teamLeaderEmail: string;
      players: Player[];
      mode: string;
    }) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Team Registered', description: data.message || 'Registration completed successfully.', variant: 'success' });
      setRegistrationSaved(true);
      setActiveSection("teams");
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
    },
    onError: (error: Error) => {
      toast({ title: 'Registration Failed', description: error.message || 'Could not complete registration.', variant: 'destructive' });
    },
  });

  const lobbyAccessMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/lobby-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamLeaderEmail: email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Lobby access denied");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setLeaderLobbyData({ team: data.team, lobbies: data.lobbies || [] });
      toast({ title: 'Access Granted', description: 'Team leader email verified.', variant: 'success' });
    },
    onError: (error: Error) => {
      setLeaderLobbyData(null);
      toast({ title: 'Access Denied', description: error.message || 'Could not verify leader email.', variant: 'destructive' });
    },
  });

  useEffect(() => {
    const requiredPlayers = mode === "solo" ? 1 : mode === "duo" ? 2 : 4;
    setPlayers(
      Array.from({ length: requiredPlayers }, (_, i) => ({
        id: `player-${i}`,
        email: "",
        phone: "",
        pubgIgn: "",
        pubgUid: "",
        isCaptain: i === 0,
      }))
    );
  }, [mode]);

  useEffect(() => {
    if (tournamentMode && tournamentMode !== mode) {
      setMode(tournamentMode);
    }
  }, [tournamentMode, mode]);

  const pointsTable = useMemo(
    () => [
      { placement: "1st", points: 10 },
      { placement: "2nd", points: 6 },
      { placement: "3rd", points: 5 },
      { placement: "4th", points: 4 },
      { placement: "5th", points: 3 },
      { placement: "6th", points: 2 },
      { placement: "7th-8th", points: 1 },
      { placement: "9th-16th", points: 0 },
    ],
    []
  );

  const updatePlayer = (index: number, field: keyof Player, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setPlayers(updatedPlayers);
  };

  const handleRegister = () => {
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.email || !player.phone || !player.pubgIgn || !player.pubgUid) {
        toast({
          title: 'Incomplete Details',
          description: `Player ${i + 1} is missing required fields. Please fill in all details.`,
          variant: 'warning',
        });
        return;
      }
    }

    if (registrationSaved) {
      toast({
        title: 'Already Registered',
        description: 'Your registration is already saved. Proceed to Teams or complete payment.',
        variant: 'info',
      });
      setActiveSection("teams");
      return;
    }

    if (!teamName.trim() || !teamLogo.trim() || !teamLeaderEmail.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Team name, logo, and leader email are required.',
        variant: 'warning',
      });
      return;
    }

    const normalizedLeaderEmail = teamLeaderEmail.trim().toLowerCase();
    const leaderIsRegisteredPlayer = players.some((player) =>
      String(player.email || '').trim().toLowerCase() === normalizedLeaderEmail
    );

    if (!leaderIsRegisteredPlayer) {
      toast({
        title: 'Email Mismatch',
        description: 'Team leader email must match a registered player.',
        variant: 'warning',
      });
      return;
    }

    registerTeamMutation.mutate({ teamName, teamLogo, teamLeaderEmail, players, mode });
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Tournament not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl font-bold text-white">{tournament.title}</CardTitle>
                  <CardDescription className="text-white/80 mt-2">
                    Professional PUBG tournament dashboard with rules, ranking, registration, and team-leader-only lobby access.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-500 text-white">{tournamentStatusLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div className="flex items-center space-x-2"><Trophy className="h-5 w-5 text-yellow-400" /><span>Prize Pool: {tournament.prizePoolPi} PI</span></div>
                <div className="flex items-center space-x-2"><Users className="h-5 w-5 text-blue-400" /><span>{modeLabel} ({modePlayers})</span></div>
                <div className="flex items-center space-x-2"><Smartphone className="h-5 w-5 text-green-400" /><span>Mobile Only</span></div>
              </div>
              {!isRegistrationClosed ? (
                <Button onClick={() => setActiveSection("register")} className="mt-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Participate Now
                </Button>
              ) : (
                <div className="mt-5 inline-block p-2 text-xs bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 rounded-lg font-semibold">
                  <i className="fas fa-exclamation-triangle mr-1.5 text-yellow-400"></i>
                  Registration Closed / In Progress
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Button variant={activeSection === "rules" ? "default" : "secondary"} onClick={() => setActiveSection("rules")}><ScrollText className="mr-2 h-4 w-4" /> Rules</Button>
          <Button variant={activeSection === "register" ? "default" : "secondary"} onClick={() => setActiveSection("register")}><ClipboardCheck className="mr-2 h-4 w-4" /> Register</Button>
          <Button variant={activeSection === "teams" ? "default" : "secondary"} onClick={() => setActiveSection("teams")}><Users className="mr-2 h-4 w-4" /> Teams</Button>
          <Button variant={activeSection === "dashboard" ? "default" : "secondary"} onClick={() => setActiveSection("dashboard")}><Trophy className="mr-2 h-4 w-4" /> Overview</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-cyan-500/10 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 text-cyan-300">
              <Smartphone className="h-5 w-5" />
              <span className="text-sm text-white/80">PUBG Mobile Arena</span>
            </div>
            <p className="mt-4 text-white font-semibold">Mobile-only competitive play</p>
            <p className="mt-2 text-sm text-white/60">Arena-ready duos and squads with fast matchmaking.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-violet-500/10 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 text-violet-300">
              <Zap className="h-5 w-5" />
              <span className="text-sm text-white/80">Ranked Speed</span>
            </div>
            <p className="mt-4 text-white font-semibold">Leaderboard-style ranking</p>
            <p className="mt-2 text-sm text-white/60">Every match counts toward team placement and rewards.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-emerald-500/10 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 text-emerald-300">
              <Shield className="h-5 w-5" />
              <span className="text-sm text-white/80">Fair Play</span>
            </div>
            <p className="mt-4 text-white font-semibold">Secure lobby access</p>
            <p className="mt-2 text-sm text-white/60">Team leader email unlocks private match room credentials.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-yellow-500/10 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 text-yellow-300">
              <Trophy className="h-5 w-5" />
              <span className="text-sm text-white/80">Prize Focus</span>
            </div>
            <p className="mt-4 text-white font-semibold">Competitive rewards</p>
            <p className="mt-2 text-sm text-white/60">Play for a shared prize pool and tournament honors.</p>
          </div>
        </div>

        {activeSection === "dashboard" && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Tournament Overview</CardTitle>
              <CardDescription className="text-white/80">
                Registration fee is {entryFeePi} PI. Team leader email acts as secure key for lobby access.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-white/90 space-y-2">
              <p>- Mandatory fields for every player: email, phone, in-game name, UID</p>
              <p>- Team info required: team name and logo</p>
              <p>- Registered teams are shown publicly</p>
              <p>- Lobby credentials are revealed only to verified team leaders</p>
            </CardContent>
          </Card>
        )}

        {activeSection === "rules" && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Rules & Ranking</CardTitle>
              <CardDescription className="text-white/80">PUBG Mobile Arena rulebook with ranking structure and match integrity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-800/40 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <Shield className="h-5 w-5" />
                    <span className="font-semibold text-white">Fair Play</span>
                  </div>
                  <p className="mt-4 text-sm text-white/70">Only official PUBG Mobile clients are allowed. Any use of emulators or hacks results in immediate disqualification.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-violet-800/40 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-violet-300">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold text-white">Ranked Scoring</span>
                  </div>
                  <p className="mt-4 text-sm text-white/70">Teams earn points by placement and kills. Consistency and survival drive your leaderboard position.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-emerald-800/40 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-emerald-300">
                    <Gamepad2 className="h-5 w-5" />
                    <span className="font-semibold text-white">Arena Format</span>
                  </div>
                  <p className="mt-4 text-sm text-white/70">TPP classic battle royale. Matches are fast, competitive, and optimized for squad strategy.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">Ranking Points</p>
                    <p className="text-white/70 text-sm">Points distribution per placement and performance.</p>
                  </div>
                  <Badge className="bg-yellow-500 text-slate-950">Leaderboard</Badge>
                </div>
                <div className="mt-5 grid gap-2 text-white/90">
                  {pointsTable.map((row) => (
                    <div key={row.placement} className="grid grid-cols-[1fr_0.75fr_0.75fr] gap-3 rounded-2xl bg-slate-950/30 p-3 transition hover:bg-slate-950/50">
                      <span>{row.placement}</span>
                      <span className="font-semibold">{row.points} pts</span>
                      <span>+1/kill</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "register" && isRegistrationClosed && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Registration Closed</CardTitle>
              <CardDescription className="text-white/80">This tournament is currently in progress or registration has closed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-yellow-900/30 border-yellow-500/50 text-yellow-200">
                <AlertDescription>
                  Registration is no longer open for this tournament. It is now in progress or ended.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {activeSection === "register" && !isRegistrationClosed && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Team Registration</CardTitle>
              <CardDescription className="text-white/80">Entry Fee: {entryFeePi} PI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-900/30 transition hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-blue-300"><ClipboardCheck className="h-5 w-5" /><span className="font-semibold text-white">Quick Setup</span></div>
                  <p className="mt-3 text-sm text-white/70">Choose squad mode, add your roster, and confirm your entry fee quickly.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-indigo-900/30 transition hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-emerald-300"><Mail className="h-5 w-5" /><span className="font-semibold text-white">Secure Lobby</span></div>
                  <p className="mt-3 text-sm text-white/70">Team leader email becomes the secure key for lobby credentials and match access. It must match one of the registered player emails.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-purple-900/30 transition hover:-translate-y-1">
                  <div className="flex items-center gap-3 text-yellow-300"><Gamepad2 className="h-5 w-5" /><span className="font-semibold text-white">Ranked Arena</span></div>
                  <p className="mt-3 text-sm text-white/70">Register now to compete in the ranked PUBG Mobile Arena leaderboards.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-medium">Team Mode</Label>
                  <div className="grid gap-3 mt-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300">
                      <div className="flex items-center gap-2"><Badge className="bg-cyan-500 text-white">{modeLabel}</Badge><span className="text-white/80">{modePlayers} {modePlayers === 1 ? "Player" : "Players"}</span></div>
                      <p className="text-sm text-white/60 mt-2">Admin-selected mode for this PUBG Arena tournament.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-300"><Trophy className="h-5 w-5" /><span className="font-semibold text-white">Your Arena Advantage</span></div>
                  <p className="mt-3 text-sm text-white/70">Every registered team is eligible for official ranking points and prize pool placement.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName" className="text-white font-medium">Team Name</Label>
                  <Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Enter your team name" className="bg-white/10 border-white/20 text-white placeholder-white/50" />
                </div>
                <div>
                  <Label htmlFor="teamLogo" className="text-white font-medium">Team Logo URL</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                    <Input id="teamLogo" value={teamLogo} onChange={(e) => setTeamLogo(e.target.value)} placeholder="https://example.com/logo.png" className="pl-9 bg-white/10 border-white/20 text-white placeholder-white/50" />
                  </div>
                </div>
              </div>

              {registrationSaved && (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-emerald-200">Registration saved — payment pending</p>
                      <p className="mt-2 text-sm text-emerald-100">Your team details are preserved. Complete payment now to lock in your tournament entry and enable lobby access.</p>
                    </div>
                    <Button onClick={() => setActiveSection('teams')} className="bg-emerald-600 text-white hover:bg-emerald-500">
                      View pending teams
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="leaderEmail" className="text-white font-medium">Team Leader Email (Lobby Key)</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input id="leaderEmail" value={teamLeaderEmail} onChange={(e) => setTeamLeaderEmail(e.target.value)} placeholder="leader@team.com" className="pl-9 bg-white/10 border-white/20 text-white placeholder-white/50" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-white font-medium">Player Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((player, index) => (
                    <Card key={player.id} className="bg-white/5 border-white/10 shadow-inner shadow-slate-950/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white flex items-center justify-between gap-3">
                          <span>Player {index + 1}</span>
                          {player.isCaptain && <Badge className="bg-yellow-500 text-white">Captain</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div><Label className="text-white/80 text-sm">Email</Label><Input value={player.email} onChange={(e) => updatePlayer(index, "email", e.target.value)} className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm" /></div>
                        <div><Label className="text-white/80 text-sm">Phone</Label><Input value={player.phone} onChange={(e) => updatePlayer(index, "phone", e.target.value)} className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm" /></div>
                        <div><Label className="text-white/80 text-sm">PUBG IGN</Label><Input value={player.pubgIgn} onChange={(e) => updatePlayer(index, "pubgIgn", e.target.value)} className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm" /></div>
                        <div><Label className="text-white/80 text-sm">PUBG UID</Label><Input value={player.pubgUid} onChange={(e) => updatePlayer(index, "pubgUid", e.target.value)} className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm" /></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button onClick={handleRegister} disabled={registerTeamMutation.isPending} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                {registerTeamMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</>
                ) : registrationSaved ? (
                  `Details Saved · Proceed to Teams`
                ) : (
                  `Register Team (${entryFeePi} PI)`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeSection === "teams" && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Teams & Lobby Access</CardTitle>
              <CardDescription className="text-white/80">Verify team leader email to unlock lobby credentials and view the team leaderboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-cyan-500/10 transition hover:-translate-y-1">
                  <Label className="text-white font-semibold">Team Leader Email</Label>
                  <div className="relative mt-3">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                    <Input value={lobbyAccessEmail} onChange={(e) => setLobbyAccessEmail(e.target.value)} placeholder="leader@team.com" className="pl-9 bg-white/10 border-white/20 text-white placeholder-white/50" />
                  </div>
                  <Button onClick={() => lobbyAccessMutation.mutate(lobbyAccessEmail.trim())} disabled={lobbyAccessMutation.isPending} className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    {lobbyAccessMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock Lobby"}
                  </Button>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-violet-500/10 transition hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-3 text-cyan-300">
                    <Gamepad2 className="h-5 w-5" />
                    <p className="text-white font-semibold">Arena Lobby</p>
                  </div>
                  <p className="text-white/70 text-sm">Registered team leaders with the correct email can access match room codes and private lobby details.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/20">
                  <div className="flex items-center gap-3 text-yellow-300"><Trophy className="h-5 w-5" /><span className="font-semibold text-white">Team Scoreboard</span></div>
                  <p className="mt-3 text-sm text-white/70">Teams are ranked by registration, lobby verification, and live performance.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/20">
                  <div className="flex items-center gap-3 text-emerald-300"><Users className="h-5 w-5" /><span className="font-semibold text-white">Live Match Ready</span></div>
                  <p className="mt-3 text-sm text-white/70">Once verified, your team will receive lobby credentials for the official PUBG Arena match.</p>
                </div>
              </div>

              {leaderLobbyData && (
                <div className="space-y-4">
                  {leaderLobbyData.lobbies.length === 0 ? (
                    <p className="text-white/70">No lobbies published yet.</p>
                  ) : (
                    leaderLobbyData.lobbies.map((lobby) => (
                      <div key={lobby.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-white font-semibold">{lobby.name}</p>
                            <p className="text-white/60 text-sm">Status: {lobby.status}</p>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">Verified</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                            <p className="text-white/60 text-xs">Room ID</p>
                            <p className="text-white font-bold">{lobby.roomCode || "TBA"}</p>
                          </div>
                          <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-white/60 text-xs">Password</p>
                                <p className="text-white font-bold">{showPassword[lobby.id] ? lobby.roomPassword || "TBA" : "••••••"}</p>
                              </div>
                              <button onClick={() => setShowPassword({ ...showPassword, [lobby.id]: !showPassword[lobby.id] })} className="text-white/70 hover:text-white">
                                {showPassword[lobby.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Registered Teams</CardTitle>
            <CardDescription className="text-white/80">Public registration list</CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
            ) : teamsData?.teams?.length === 0 ? (
              <p className="text-center text-white/60 py-8">No teams registered yet. Be the first to register!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamsData?.teams?.map((team) => (
                  <Card key={team.id} className="bg-white/5 border-white/10">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">{team.name}</CardTitle>
                        <Badge variant={team.registration?.paymentStatus === "paid" ? "default" : "secondary"} className={team.registration?.paymentStatus === "paid" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}>
                          {team.registration?.paymentStatus || "Pending"}
                        </Badge>
                      </div>
                      {team.teamLogo && <img src={team.teamLogo} alt={`${team.name} logo`} className="h-12 w-12 rounded-md object-cover border border-white/20" />}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-white/80 text-sm"><strong>Players:</strong></div>
                        {team.players?.map((player, idx) => (
                          <div key={idx} className="text-white/60 text-sm pl-4">• {player.pubgIgn || `Player ${idx + 1}`}{player.pubgUid ? ` (${player.pubgUid})` : ''}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
