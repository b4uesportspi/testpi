import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { adSessionManager } from '@/lib/ad-frequency-manager';
import { usePiAds } from '@/hooks/use-pi-ads';

export default function AdStatsPanel() {
  const { adNetworkSupported } = usePiAds();
  const [stats, setStats] = useState(adSessionManager.getSessionStats());
  const [nextInterstitialMinutes, setNextInterstitialMinutes] = useState(0);
  const [nextRewardedMinutes, setNextRewardedMinutes] = useState(0);

  useEffect(() => {
    // Update stats periodically
    const updateStats = () => {
      setStats(adSessionManager.getSessionStats());
      setNextInterstitialMinutes(
        Math.ceil(adSessionManager.getTimeUntilNextInterstitial() / 60000)
      );
      setNextRewardedMinutes(
        Math.ceil(
          (adSessionManager['config'].minRewardedInterval - 
           (Date.now() - adSessionManager['lastRewardedShow'])) / 60000
        )
      );
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your ad session? This will clear all ad counters.')) {
      adSessionManager.resetSession();
      setStats(adSessionManager.getSessionStats());
      setNextInterstitialMinutes(0);
      setNextRewardedMinutes(0);
    }
  };

  const interstitialProgress = (parseInt(stats.interstitialAds.split('/')[0]) / parseInt(stats.interstitialAds.split('/')[1])) * 100;
  const rewardedProgress = (parseInt(stats.rewardedAds.split('/')[0]) / parseInt(stats.rewardedAds.split('/')[1])) * 100;

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-xl text-purple-300 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Ad Frequency & Limits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ad Network Support Status */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            {adNetworkSupported ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="text-sm font-medium text-gray-300">
              {adNetworkSupported ? 'Ad Network Supported' : 'Update Required'}
            </span>
          </div>
          <Badge variant={adNetworkSupported ? 'default' : 'destructive'}>
            {adNetworkSupported ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Interstitial Ads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Interstitial Ads (Auto)
            </span>
            <span className="text-purple-300 font-medium">{stats.interstitialAds}</span>
          </div>
          <Progress value={interstitialProgress} className="h-2" />
          {nextInterstitialMinutes > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Next ad available in ~{nextInterstitialMinutes} minutes
            </p>
          )}
        </div>

        {/* Rewarded Ads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Rewarded Ads (Optional)
            </span>
            <span className="text-indigo-300 font-medium">{stats.rewardedAds}</span>
          </div>
          <Progress value={rewardedProgress} className="h-2" />
          {nextRewardedMinutes > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Next reward ad available in ~{Math.max(0, nextRewardedMinutes)} minutes
            </p>
          )}
        </div>

        {/* Purchase Milestone Info */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-1">Purchase Milestones</p>
              <p className="text-blue-200/80">
                Interstitial ads show every {adSessionManager['config'].purchaseMilestoneInterval} purchases at natural breaks.
                Next milestone at purchase #{stats.nextMilestoneAt}.
              </p>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-start gap-2">
            <RefreshCw className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-400">
              <p className="font-semibold mb-1">Session Duration</p>
              <p>{stats.sessionDuration}</p>
              <p className="text-xs text-gray-500 mt-1">
                Counters reset after 24 hours
              </p>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="w-full border-gray-600 text-gray-400 hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Ad Session
        </Button>

        {/* User-Friendly Tips */}
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-sm text-green-300">
            <p className="font-semibold mb-1">💡 Ad Tips</p>
            <ul className="text-green-200/80 text-xs space-y-1">
              <li>• Interstitial ads appear at purchase milestones</li>
              <li>• Rewarded ads are optional and earn you tokens</li>
              <li>• Limits protect you from seeing too many ads</li>
              <li>• All counters reset after 24 hours</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
