import { useEffect, useState } from 'react';
import AnimatedPage from '@/components/animated-page';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Test basic fetch
        const response = await fetch('/api/pi-price');
        const data = await response.json();
        
        setDebugInfo({
          fetchSuccess: true,
          piPriceData: data,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        setError(`Fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Debug fetch error:', err);
      }
    };

    fetchDebugInfo();
  }, []);

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold mb-6">Debug Page</h1>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
          <p className="text-red-300">{error}</p>
        </div>
      )}
      
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        
        {Object.keys(debugInfo).length > 0 ? (
          <pre className="bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground">Loading debug information...</p>
        )}
      </div>
      
      <div className="mt-8 bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Window Object</h3>
            <p>{typeof window !== 'undefined' ? 'Available' : 'Not available'}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Document Object</h3>
            <p>{typeof document !== 'undefined' ? 'Available' : 'Not available'}</p>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
