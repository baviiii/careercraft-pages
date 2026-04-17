/**
 * ProactiveImpactAlerts - Display automated impact alerts and critical findings
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Bell, X, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const GRAPH_QUERY_URL = import.meta.env.VITE_AZURE_GRAPH_QUERY_URL || '';
const AZURE_FUNCTION_KEY = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';

interface ImpactAlert {
  type: 'high_severity' | 'outlier' | 'conflict' | 'threshold_breach' | 'new_impacts';
  entity: string;
  entityType?: string;
  count?: number;
  priority: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  description: string;
  impacts?: any[];
  zScore?: number;
}

interface AlertSummary {
  summary: string;
  criticalCount: number;
  totalCount: number;
  recommendations?: string[];
}

interface ProactiveImpactAlertsProps {
  compact?: boolean;
  maxAlerts?: number;
  autoRefresh?: boolean;
}

export function ProactiveImpactAlerts({ 
  compact = false, 
  maxAlerts = 10,
  autoRefresh = true 
}: ProactiveImpactAlertsProps) {
  const [alerts, setAlerts] = useState<ImpactAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const cacheKey = 'proactive-alerts';

  const fetchAlerts = async (forceRefresh = false) => {
    if (!GRAPH_QUERY_URL) {
      console.warn('GRAPH_QUERY_URL not configured');
      setAlerts([]);
      setSummary({
        summary: 'Alert service not configured',
        criticalCount: 0,
        totalCount: 0
      });
      setLoading(false);
      setError(null);
      return;
    }
    
    // Check cache first (5-minute TTL)
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - cachedData.timestamp;
          const cacheTTL = 5 * 60 * 1000; // 5 minutes
          
          if (cacheAge < cacheTTL) {
            setAlerts(cachedData.alerts || []);
            setSummary(cachedData.summary || {
              summary: 'No alerts available',
              criticalCount: 0,
              totalCount: 0
            });
            setLoading(false);
            setError(null);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
    }
    
    setLoading(true);
    setError(null);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(GRAPH_QUERY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(AZURE_FUNCTION_KEY && { 'x-functions-key': AZURE_FUNCTION_KEY })
          },
          body: JSON.stringify({
            action: 'get_alerts'
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          if (response.status === 429 && retryCount < maxRetries - 1) {
            // Rate limited, wait and retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            retryCount++;
            continue;
          }
          throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Set alerts and summary from API response
        const alertsData = data.alerts || [];
        const summaryData = data.summary || {
          summary: 'No alerts available',
          criticalCount: 0,
          totalCount: 0
        };
        
        setAlerts(alertsData);
        setSummary(summaryData);
        setError(null);
        
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify({
          alerts: alertsData,
          summary: summaryData,
          timestamp: Date.now()
        }));
        
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Failed to fetch alerts after retries:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(errorMessage);
          // Set empty state on error
          setAlerts([]);
          setSummary({
            summary: 'Failed to load alerts. Please try again later.',
            criticalCount: 0,
            totalCount: 0
          });
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts(false);
    
    if (autoRefresh) {
      const interval = setInterval(() => fetchAlerts(false), 5 * 60 * 1000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts
    .filter(a => !dismissedAlerts.has(`${a.type}_${a.entity}`))
    .slice(0, maxAlerts);

  const criticalAlerts = visibleAlerts.filter(a => a.severity === 'high');
  const hasCritical = criticalAlerts.length > 0;

  if (loading) {
    return (
      <Card className={cn("p-4", compact && "p-3")}>
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-foreground">Impact Alerts</span>
          </div>
          {hasCritical && (
            <Badge className="bg-red-500/20 text-red-200 border-red-400/40 text-xs">
              {criticalAlerts.length} Critical
            </Badge>
          )}
        </div>
        {summary && (
          <p className="text-xs text-slate-400">{summary.summary}</p>
        )}
        {visibleAlerts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => {/* Expand view */}}
          >
            View {visibleAlerts.length} Alert{visibleAlerts.length > 1 ? 's' : ''}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/30">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Proactive Impact Alerts</h3>
              <p className="text-xs text-slate-400">Daily automated impact monitoring</p>
            </div>
          </div>
          {hasCritical && (
            <Badge className="bg-red-500/20 text-red-200 border-red-400/40">
              {criticalAlerts.length} Critical
            </Badge>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-400/30">
            <p className="text-sm text-red-200 mb-2">Error loading alerts: {error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAlerts(true)}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {summary && !error && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-foreground mb-2">{summary.summary}</p>
            {summary.recommendations && summary.recommendations.length > 0 && (
              <div className="mt-2 space-y-1">
                {summary.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-xs text-slate-400">• {rec}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">All Clear</p>
            <p className="text-xs text-slate-400">No critical impact alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {visibleAlerts.map((alert, index) => (
                <motion.div
                  key={`${alert.type}_${alert.entity}_${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "p-4 border-l-4",
                    alert.severity === 'high' 
                      ? "bg-red-500/10 border-red-500" 
                      : "bg-amber-500/10 border-amber-500"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className={cn(
                            "w-4 h-4",
                            alert.severity === 'high' ? "text-red-400" : "text-amber-400"
                          )} />
                          <Badge className={cn(
                            "text-xs",
                            alert.severity === 'high' 
                              ? "bg-red-500/20 text-red-200 border-red-400/40"
                              : "bg-amber-500/20 text-amber-200 border-amber-400/40"
                          )}>
                            {alert.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">{alert.entity}</span>
                        </div>
                        <p className="text-sm text-slate-200 mb-2">{alert.description}</p>
                        {alert.count && (
                          <p className="text-xs text-slate-400">
                            {alert.count} impact{alert.count > 1 ? 's' : ''} affected
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => dismissAlert(`${alert.type}_${alert.entity}`)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
