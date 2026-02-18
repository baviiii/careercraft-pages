/**
 * ImpactForecastCards - Display impact forecasts with confidence intervals
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface ForecastData {
  timeframe: string;
  year: number;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ImpactForecast {
  entity: string;
  historical: any;
  forecasts: Record<string, {
    forecast: ForecastData[];
    confidence: number;
    slope: number;
    intercept: number;
  }>;
  confidence: number;
  forecastPeriods: number;
  generatedAt: string;
}

interface ImpactForecastCardsProps {
  forecast: ImpactForecast | null;
  loading?: boolean;
  compact?: boolean;
}

export function ImpactForecastCards({ forecast, loading = false, compact = false }: ImpactForecastCardsProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!forecast || !forecast.forecasts || Object.keys(forecast.forecasts).length === 0) {
    return null;
  }

  const impactTypes = Object.keys(forecast.forecasts);
  const overallConfidence = forecast.confidence;

  if (compact) {
    // Show single summary card
    const primaryType = impactTypes[0];
    const primaryForecast = forecast.forecasts[primaryType];
    const nextPeriod = primaryForecast.forecast[0];

    return (
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-400/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">Impact Forecast</span>
          </div>
          <Badge className={cn(
            "text-xs",
            overallConfidence > 0.7 ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" :
            overallConfidence > 0.5 ? "bg-amber-500/20 text-amber-200 border-amber-400/40" :
            "bg-red-500/20 text-red-200 border-red-400/40"
          )}>
            {(overallConfidence * 100).toFixed(0)}% confidence
          </Badge>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-slate-400 mb-1">Next Period ({nextPeriod.timeframe})</p>
            <p className="text-lg font-bold text-foreground">
              {nextPeriod.forecast} impacts
            </p>
            <p className="text-xs text-slate-400">
              Range: {nextPeriod.lowerBound} - {nextPeriod.upperBound}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Full forecast cards
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Impact Forecasts for {forecast.entity}
        </h3>
        <Badge className={cn(
          overallConfidence > 0.7 ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" :
          overallConfidence > 0.5 ? "bg-amber-500/20 text-amber-200 border-amber-400/40" :
          "bg-red-500/20 text-red-200 border-red-400/40"
        )}>
          {(overallConfidence * 100).toFixed(0)}% confidence
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {impactTypes.map((type, index) => {
          const typeForecast = forecast.forecasts[type];
          const nextPeriod = typeForecast.forecast[0];
          const trend = typeForecast.slope > 0 ? 'up' : typeForecast.slope < 0 ? 'down' : 'stable';

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-400/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-foreground capitalize">{type} Impacts</span>
                  <div className="flex items-center gap-2">
                    {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                    {trend === 'stable' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    <Badge className="text-xs bg-purple-500/20 text-purple-200 border-purple-400/40">
                      {(typeForecast.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Next Period ({nextPeriod.timeframe})</p>
                    <p className="text-2xl font-bold text-foreground">
                      {nextPeriod.forecast}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Range: {nextPeriod.lowerBound} - {nextPeriod.upperBound} (95% confidence)
                    </p>
                  </div>

                  {typeForecast.forecast.length > 1 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">12-Month Forecast</p>
                      <div className="space-y-1">
                        {typeForecast.forecast.slice(0, 4).map((period, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{period.timeframe}</span>
                            <span className="font-medium text-foreground">
                              {period.forecast} ({period.lowerBound}-{period.upperBound})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
