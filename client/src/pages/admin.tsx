import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Activity,
  DollarSign,
  Minimize2,
  Package,
  Search,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react';

import AnimatedPage from '@/components/animated-page';
import { apiRequest } from '@/lib/queryClient';
import TournamentManagement from '@/components/admin/tournament-management';
import TournamentResults from '@/components/admin/tournament-results';
import PayoutApprovals from '@/components/admin/payout-approvals';
import { usePiNetwork } from '@/hooks/use-pi-network';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  totalSpent: number;
  transactionCount: number;
  isActive: boolean;
}

interface AdminTransaction {
  id: string;
  user: { username: string; email: string };
  package: { name: string; game: string };
  piAmount: string;
  usdAmount: string;
  status: string;
  createdAt: string;
  paymentId: string;
  txid?: string;
}

interface AdminPackage {
  id: string;
  game: string;
  name: string;
  inGameAmount: number;
  usdtValue: string;
  isActive: boolean;
}

const adminTabs = [
  { value: 'transactions', label: 'Transactions', icon: Activity },
  { value: 'packages', label: 'Packages', icon: Package },
  { value: 'tournaments', label: 'Tournaments', icon: TrendingUp },
  { value: 'payouts', label: 'Payouts', icon: DollarSign },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'results', label: 'Results', icon: Trophy },
];

export default function AdminPanel() {
  const { user, isLoading } = usePiNetwork();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const { data: users } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user?.isAdmin && activeTab === 'users',
  });

  const { data: transactions } = useQuery<AdminTransaction[]>({
    queryKey: ['/api/admin/transactions'],
    enabled: !!user?.isAdmin && activeTab === 'transactions',
  });

  const { data: packages } = useQuery<AdminPackage[]>({
    queryKey: ['/api/admin/packages'],
    enabled: !!user?.isAdmin && activeTab === 'packages',
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdminPackage> }) => {
      const response = await apiRequest('PUT', `/api/admin/packages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      toast({ title: 'Package updated' });
    },
    onError: () => {
      toast({ title: 'Update failed', variant: 'destructive' });
    },
  });

  const togglePackageStatus = (pkg: AdminPackage) => {
    updatePackageMutation.mutate({ id: pkg.id, data: { isActive: !pkg.isActive } });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return map[status] ?? 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const filteredUsers = (users ?? []).filter((u) => {
    const term = searchTerm.toLowerCase();
    return u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });



  const transactionCounts = (transactions ?? []).reduce<Record<string, number>>((acc, tx) => {
    acc[tx.status] = (acc[tx.status] ?? 0) + 1;
    return acc;
  }, {});
  const activePackageCount = (packages ?? []).filter((pkg) => pkg.isActive).length;
  const inactivePackageCount = (packages ?? []).length - activePackageCount;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-red-500/50 border-t-red-400 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-red-500/40 mx-auto" />
          <p className="text-slate-400 font-semibold">Access Denied</p>
          <p className="text-slate-600 text-sm">This area is restricted to the owner.</p>
          <Button className="mt-2 bg-slate-800 hover:bg-slate-700" onClick={() => setLocation('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const adminTabDescriptions: Record<string, string> = {
    transactions: 'Review and manage completed and pending transaction flows.',
    packages: 'Configure packages, pricing and availability.',
    tournaments: 'Schedule matches, lobbies, and tournament details.',
    payouts: 'Approve payout requests and monitor disbursements.',
    users: 'Search, filter, and manage user accounts quickly.',
    results: 'Submit match results and auto-generate arena rankings.',
  };

  return (
    <AnimatedPage className="min-h-screen bg-slate-950 text-white" data-testid="admin-panel">
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Admin Dashboard</h1>
                <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">B4U Esports owner operations</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 gap-2 rounded-xl border-slate-700 bg-slate-900/70 px-3 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setLocation('/dashboard')}
                data-testid="admin-minimize-button"
              >
                <Minimize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Minimize</span>
              </Button>
              <Button
                className="h-9 gap-2 rounded-xl bg-red-600 px-3 text-white hover:bg-red-500"
                onClick={() => setLocation('/dashboard')}
                data-testid="admin-close-button"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </div>
          </div>
        </motion.div>



        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}> 
          <div className="grid grid-cols-2 gap-3.5 sm:gap-6 mx-auto w-full max-w-7xl lg:grid-cols-3">
            {adminTabs.map(({ value, label, icon: Icon }) => (
              <motion.button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                whileHover={{
                  y: -6,
                  scale: 1.025,
                  transition: { type: 'spring', stiffness: 300, damping: 15 }
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className={`group relative flex w-full min-h-[145px] sm:min-h-[180px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl sm:rounded-[2rem] border p-3.5 sm:p-5 text-left text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  activeTab === value
                    ? 'border-cyan-400 bg-slate-900/90 shadow-[0_0_30px_rgba(34,211,238,0.25),inset_0_0_15px_rgba(34,211,238,0.1)]'
                    : 'border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                }`}
                data-testid={`admin-button-${value}`}
              >
                {/* Futuristic Ambient Glowing Elements */}
                <div className="absolute right-0 top-0 h-24 w-24 sm:h-36 sm:w-36 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none transition-all duration-500 group-hover:bg-cyan-500/15 group-hover:scale-110" />
                <div className="absolute left-0 bottom-0 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none transition-all duration-500 group-hover:bg-blue-500/15 group-hover:scale-110" />

                {/* Micro diagonal line decoration for esports dashboard vibe */}
                <div className="absolute top-0 right-0 w-8 h-[1px] bg-cyan-500/20 transform rotate-45 translate-x-2 translate-y-2 group-hover:bg-cyan-400/40 transition-colors" />
                <div className="absolute bottom-0 left-0 w-8 h-[1px] bg-blue-500/20 transform rotate-45 -translate-x-2 -translate-y-2 group-hover:bg-blue-400/40 transition-colors" />

                <div className="relative flex flex-col sm:flex-row items-start gap-3 sm:gap-4 h-full w-full">
                  <span className="relative flex h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-md transition-all duration-300 group-hover:border-cyan-400/30 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                    <span className="absolute inset-0 rounded-full bg-cyan-400/5 blur-md group-hover:bg-cyan-400/15 group-hover:blur-lg animate-pulse" />
                    <Icon className="relative h-5 w-5 sm:h-7 sm:w-7 text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.7)] group-hover:scale-110 group-hover:text-cyan-200 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.9)] transition-all duration-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-lg font-bold sm:font-black tracking-tight text-white group-hover:text-cyan-200 transition-colors duration-300">{label}</p>
                    <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs leading-normal sm:leading-relaxed text-slate-400 line-clamp-2 sm:line-clamp-none max-w-xs">{adminTabDescriptions[value]}</p>
                  </div>
                </div>

                <div className="relative w-full mt-4 sm:mt-5 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-2.5 sm:pt-3">
                  <span className="hidden sm:inline-block rounded-full border border-cyan-400/10 bg-slate-950/75 px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-medium text-slate-400 group-hover:border-cyan-400/20 group-hover:text-cyan-300 transition-all duration-300">
                    Futuristic View
                  </span>

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activeTab === value
                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse'
                        : 'bg-slate-500'
                    } transition-all duration-300`} />
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.25em] ${
                      activeTab === value ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-300'
                    } transition-colors duration-300`}>
                      {activeTab === value ? 'Active' : 'Tap to View'}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden" />

            <TabsContent value="transactions">
              <div className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_40%),_linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,23,42,0.78))] shadow-[0_24px_90px_-42px_rgba(56,189,248,0.35)] backdrop-blur-xl overflow-hidden" data-testid="transactions-management">
                <div className="flex flex-col gap-3 p-5 border-b border-cyan-400/20 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" /> Transaction Management</h2>
                  <div className="flex flex-wrap gap-2">
                    {['completed', 'pending', 'failed', 'cancelled'].map((status) => (
                      <span key={status} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge(status)}`}>
                        {status}: {transactionCounts[status] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs">User</TableHead>
                        <TableHead className="text-slate-500 text-xs">Package</TableHead>
                        <TableHead className="text-slate-500 text-xs">Amount</TableHead>
                        <TableHead className="text-slate-500 text-xs">Status</TableHead>
                        <TableHead className="text-slate-500 text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 text-xs">Payment ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transactions ?? []).map((tx) => (
                        <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/40" data-testid={`transaction-row-${tx.id}`}>
                          <TableCell>
                            <p className="font-semibold text-white text-sm">{tx.user.username}</p>
                            <p className="text-xs text-slate-500">{tx.user.email}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-white text-sm">{tx.package.name}</p>
                            <p className="text-xs text-slate-500">{tx.package.game}</p>
                          </TableCell>
                          <TableCell className="font-mono text-emerald-400 text-sm">{tx.piAmount} Pi</TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusBadge(tx.status)}`}>{tx.status}</span>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{tx.paymentId.slice(0, 8)}...</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="packages">
              <div className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_40%),_linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,23,42,0.78))] shadow-[0_24px_90px_-42px_rgba(56,189,248,0.35)] backdrop-blur-xl overflow-hidden" data-testid="packages-management">
                <div className="flex flex-col gap-3 p-5 border-b border-cyan-400/20 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-bold text-white flex items-center gap-2"><Package className="w-4 h-4 text-cyan-300" /> Package Management</h2>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active: {activePackageCount}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-red-500/15 text-red-400 border-red-500/30">Inactive: {inactivePackageCount}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs">Game</TableHead>
                        <TableHead className="text-slate-500 text-xs">Package</TableHead>
                        <TableHead className="text-slate-500 text-xs">Amount</TableHead>
                        <TableHead className="text-slate-500 text-xs">USDT</TableHead>
                        <TableHead className="text-slate-500 text-xs">Status</TableHead>
                        <TableHead className="text-slate-500 text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(packages ?? []).map((pkg) => (
                        <TableRow key={pkg.id} className="border-slate-800 hover:bg-slate-800/40" data-testid={`package-row-${pkg.id}`}>
                          <TableCell>
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600">{pkg.game}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-white text-sm">{pkg.name}</TableCell>
                          <TableCell className="text-slate-300 text-sm">{pkg.inGameAmount}</TableCell>
                          <TableCell className="text-slate-300 text-sm">${pkg.usdtValue}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${pkg.isActive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                              {pkg.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => togglePackageStatus(pkg)}
                              disabled={updatePackageMutation.isPending}
                              className={`text-xs rounded-lg ${pkg.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'}`}
                              data-testid={`toggle-package-${pkg.id}`}
                            >
                              {pkg.isActive ? 'Disable' : 'Enable'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tournaments">
              <TournamentManagement />
            </TabsContent>

            <TabsContent value="results">
              <TournamentResults />
            </TabsContent>

            <TabsContent value="payouts">
              <PayoutApprovals />
            </TabsContent>

            <TabsContent value="users">
              <div className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_40%),_linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(15,23,42,0.78))] shadow-[0_24px_90px_-42px_rgba(56,189,248,0.35)] backdrop-blur-xl overflow-hidden" data-testid="users-management">
                <div className="flex flex-col gap-4 p-5 border-b border-cyan-400/20 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-cyan-300" /> User Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-52 bg-slate-800 border-slate-700 text-sm text-white placeholder:text-slate-500 rounded-lg"
                      data-testid="search-users"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs">Username</TableHead>
                        <TableHead className="text-slate-500 text-xs">Email</TableHead>
                        <TableHead className="text-slate-500 text-xs">Country</TableHead>
                        <TableHead className="text-slate-500 text-xs">Spent</TableHead>
                        <TableHead className="text-slate-500 text-xs">Txns</TableHead>
                        <TableHead className="text-slate-500 text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/40" data-testid={`user-row-${u.id}`}>
                          <TableCell className="font-semibold text-white">{u.username}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{u.email}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{u.country}</TableCell>
                          <TableCell className="font-mono text-emerald-400 text-sm">{u.totalSpent.toFixed(1)} Pi</TableCell>
                          <TableCell className="text-slate-300 text-sm">{u.transactionCount}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${u.isActive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
