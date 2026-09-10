import { useQuery } from '@tanstack/react-query';
import type { PiPrice } from '@/types/pi-network';
import { piStorage } from '@/lib/pi-storage';

export function usePiPrice() {
  return useQuery<PiPrice>({
    queryKey: ['/api/pi-price'],
    initialData: () => {
      // Stale-While-Revalidate: load immediately from Pi device local storage
      return piStorage.getCachedData<PiPrice>('pi_price', 60000) || undefined;
    },
    queryFn: async () => {
      console.log('Fetching Pi price from /api/pi-price');
      const response = await fetch('/api/pi-price');
      if (!response.ok) {
        console.error('Failed to fetch Pi price:', response.status, response.statusText);
        throw new Error('Failed to fetch Pi price');
      }
      const data = await response.json();
      console.log('Received Pi price data:', data);
      // Persist in non-critical local device storage
      piStorage.setCachedData('pi_price', data, 60000);
      return data;
    },
    refetchInterval: 60000,
    staleTime: 50000,
  });
}