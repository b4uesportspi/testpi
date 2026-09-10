import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Check, X, Clock, Wallet, ArrowUpRight } from 'lucide-react';

interface RedemptionRequest {
  id: string;
  userId: string;
  username: string;
  b4utAmount: number;
  piAmount: string;
  status: string;
  walletAddress: string;
  createdAt: string;
}

export default function PayoutApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: redemptions, isLoading } = useQuery<RedemptionRequest[]>({
    queryKey: ['/api/admin/redemptions'],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/redemptions/${id}/approve`, { notes: 'Approved via Admin Panel' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/redemptions'] });
      toast({ title: 'Payout Approved', description: 'Request approved successfully.', variant: 'success' });
    },
    onError: (error: any) => {
      toast({ title: 'Approval Failed', description: error.message || 'Could not approve request.', variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/redemptions/${id}/reject`, { notes: 'Rejected via Admin Panel' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/redemptions'] });
      toast({ title: 'Payout Rejected', description: 'Request rejected and B4UT refunded.', variant: 'warning' });
    },
    onError: (error: any) => {
      toast({ title: 'Rejection Failed', description: error.message || 'Could not reject request.', variant: 'destructive' });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"><Check className="w-3 h-3 mr-1"/> Approved</Badge>;
      case 'rejected': return <Badge className="border border-red-500/30 bg-red-500/15 text-red-300"><X className="w-3 h-3 mr-1"/> Rejected</Badge>;
      case 'pending': return <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      case 'completed': return <Badge className="border border-blue-500/30 bg-blue-500/15 text-blue-300">Completed</Badge>;
      default: return <Badge className="border border-slate-600 bg-slate-700 text-slate-300">{status}</Badge>;
    }
  };

  const pendingCount = redemptions?.filter((request) => request.status === 'pending').length ?? 0;
  const totalPi = (redemptions ?? []).reduce((sum, request) => sum + Number.parseFloat(request.piAmount || '0'), 0);

  return (
    <Card className="border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_30%),_linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(15,23,42,0.78))] shadow-[0_24px_90px_-42px_rgba(56,189,248,0.35)] text-white">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2 text-white">
              <Wallet className="w-5 h-5 text-cyan-300" />
              B4UT Payout Approvals
            </CardTitle>
            <p className="mt-1 text-sm text-slate-300">Review redemption requests and approve payouts from a futuristic payouts desk.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 max-[520px]:grid-cols-1 sm:w-64">
            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-white/5 p-3 shadow-[0_0_28px_rgba(56,189,248,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Pending</p>
              <p className="mt-2 text-2xl font-black text-white">{pendingCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-white/5 p-3 shadow-[0_0_28px_rgba(56,189,248,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Pi Value</p>
              <p className="mt-2 text-2xl font-black text-white">{totalPi.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Loading requests...</div>
        ) : !redemptions || redemptions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-slate-500">No redemption requests found.</div>
        ) : (
          <div className="rounded-xl border border-slate-800">
            <div className="hidden sm:block overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-500 text-xs">Date</TableHead>
                    <TableHead className="text-slate-500 text-xs">User</TableHead>
                    <TableHead className="text-slate-500 text-xs">B4UT Amount</TableHead>
                    <TableHead className="text-slate-500 text-xs">Pi Value</TableHead>
                    <TableHead className="text-slate-500 text-xs">Wallet Address</TableHead>
                    <TableHead className="text-slate-500 text-xs">Status</TableHead>
                    <TableHead className="text-right text-slate-500 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((req) => (
                    <TableRow key={req.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold text-white">{req.username}</TableCell>
                      <TableCell className="text-amber-300 font-bold">{req.b4utAmount}</TableCell>
                      <TableCell className="text-purple-300 font-bold">{parseFloat(req.piAmount).toFixed(2)} Pi</TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate text-slate-400" title={req.walletAddress}>
                        {req.walletAddress}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="rounded-lg"
                              onClick={() => rejectMutation.mutate(req.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 p-3 sm:hidden">
              {redemptions.map((req) => (
                <div key={req.id} className="rounded-3xl border border-slate-800 bg-slate-950/95 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{req.username}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-300">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">B4UT</span>
                      <span className="font-semibold text-amber-300">{req.b4utAmount}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Pi Value</span>
                      <span className="font-semibold text-purple-300">{parseFloat(req.piAmount).toFixed(2)} Pi</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Wallet</span>
                      <span className="font-mono text-xs text-slate-400 truncate max-w-[160px]" title={req.walletAddress}>{req.walletAddress}</span>
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div className="mt-4 flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="w-full rounded-lg"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
