import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export type RewardReason =
  | 'tournament_prize'
  | 'referral_bonus'
  | 'daily_reward'
  | 'achievement_reward'
  | 'promo_reward';

export interface PayoutRequest {
  user_id?: string;
  amount: number;
  reward_reason: RewardReason;
  tournament_id?: string;
  rank?: number;
  description?: string;
}

export interface Transaction {
  transaction_id: string;
  amount: number;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface PaymentHistory {
  transactions: Transaction[];
  payouts?: any[];
  refunds?: any[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPayout = useCallback(async (request: PayoutRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/payouts', request);
      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (
    userId: string,
    limit: number = 50,
    offset: number = 0,
    type?: string,
    status?: string
  ): Promise<PaymentHistory> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(type && { type }),
        ...(status && { status }),
        ...(userId && { userId }),
      });

      const response = await apiRequest('GET', `/api/transactions?${params.toString()}`);
      const data = await response.json();
      return { transactions: data } as PaymentHistory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyTransaction = useCallback(async (transactionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/verify', { transaction_id: transactionId });
      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestRefund = useCallback(async (
    transactionId: string,
    reason: string,
    amount?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/refunds', {
        transactionId,
        reason,
        ...(amount ? { amount } : {}),
      });
      const data = await response.json();
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    loading,
    error,
    requestPayout,
    getHistory,
    verifyTransaction,
    requestRefund,
    checkHealth,
  };
}

export function RewardPayoutButton({ userId, amount, tournamentId }: { userId: string; amount: number; tournamentId?: string }) {
  const { requestPayout, loading, error } = usePayments();
  const { toast } = useToast();

  const handlePayout = async () => {
    try {
      const result = await requestPayout({
        amount,
        reward_reason: 'tournament_prize',
        tournament_id: tournamentId,
        description: `Tournament Reward - ${tournamentId || 'N/A'}`,
      });

      console.log('Payout initiated:', result);
      toast({
        title: "Payout Initiated",
        description: `Payout ID: ${result.payout_id}`,
      });
    } catch (err) {
      console.error('Payout failed:', err);
      toast({
        variant: "destructive",
        title: "Payout Failed",
        description: `${error || (err instanceof Error ? err.message : 'Unknown error')}`,
      });
    }
  };

  return (
    <button className="btn btn-primary" onClick={handlePayout} disabled={loading}>
      {loading ? 'Processing...' : `Claim ${amount} π`}
    </button>
  );
}
