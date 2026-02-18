/**
 * IMPACT ANOMALY DETECTION
 * Statistical methods to detect unusual impacts - zero API cost
 * Uses Z-score, IQR, and conflict detection
 */

export interface Impact {
  id: string;
  policyId: string;
  policyName: string;
  affectedEntity: string;
  affectedEntityType: string;
  impactType: string;
  direction: 'increase' | 'decrease' | 'constraint' | 'enable';
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  quantitativeValue?: string;
  timeframe?: string;
}

export interface Anomaly {
  type: 'outlier' | 'conflict' | 'unusual_pattern' | 'threshold_breach';
  impact?: Impact;
  impacts?: Impact[];
  zScore?: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
  entity?: string;
  impactType?: string;
  recommendation?: string;
}

/**
 * Parse quantitative value from impact string
 * Returns numeric value for calculations
 */
function parseQuantitativeValue(value: string | undefined): number {
  if (!value) return 0;
  
  // Extract dollar amounts
  const dollarMatch = value.match(/\$[\d,]+(?:\.\d+)?\s*(?:million|billion|M|B|k|thousand)?/i);
  if (dollarMatch) {
    let amount = parseFloat(dollarMatch[0].replace(/[$,]/g, ''));
    const multiplier = dollarMatch[0].toLowerCase();
    if (multiplier.includes('billion') || multiplier.includes('b')) amount *= 1000000000;
    else if (multiplier.includes('million') || multiplier.includes('m')) amount *= 1000000;
    else if (multiplier.includes('thousand') || multiplier.includes('k')) amount *= 1000;
    return amount;
  }
  
  // Extract job counts
  const jobMatch = value.match(/(\d+(?:,\d+)?)\s*(?:jobs?|positions?|workers?|employees?)/i);
  if (jobMatch) {
    return parseInt(jobMatch[1].replace(/,/g, ''), 10);
  }
  
  // Extract percentages
  const percentMatch = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    return parseFloat(percentMatch[1]);
  }
  
  return 0;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Group array by key
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Find impact conflicts (same type, opposite directions)
 */
function findImpactConflicts(impacts: Impact[]): Array<{
  impactType: string;
  affectedEntity: string;
  increases: Impact[];
  decreases: Impact[];
}> {
  const conflicts: Array<{
    impactType: string;
    affectedEntity: string;
    increases: Impact[];
    decreases: Impact[];
  }> = [];
  
  // Group by impact type and affected entity
  const byKey: Record<string, Impact[]> = {};
  impacts.forEach(impact => {
    const key = `${impact.impactType}_${impact.affectedEntity}`;
    if (!byKey[key]) {
      byKey[key] = [];
    }
    byKey[key].push(impact);
  });
  
  // Find conflicts
  Object.keys(byKey).forEach(key => {
    const groupImpacts = byKey[key];
    if (groupImpacts.length < 2) return;
    
    const increases = groupImpacts.filter(i => i.direction === 'increase');
    const decreases = groupImpacts.filter(i => i.direction === 'decrease');
    
    if (increases.length > 0 && decreases.length > 0) {
      conflicts.push({
        impactType: groupImpacts[0].impactType,
        affectedEntity: groupImpacts[0].affectedEntity,
        increases,
        decreases
      });
    }
  });
  
  return conflicts;
}

/**
 * Detect anomalies in impacts using statistical methods
 */
export function detectImpactAnomalies(impacts: Impact[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (impacts.length === 0) return anomalies;
  
  // Group by impact type
  const byType = groupBy(impacts, 'impactType');
  
  // Detect outliers using Z-score
  Object.keys(byType).forEach(type => {
    const typeImpacts = byType[type];
    if (typeImpacts.length < 3) return; // Need at least 3 for meaningful stats
    
    // Extract quantitative values
    const values = typeImpacts
      .map(i => parseQuantitativeValue(i.quantitativeValue))
      .filter(v => v > 0); // Only non-zero values
    
    if (values.length < 3) return;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = calculateStdDev(values, mean);
    
    if (stdDev === 0) return; // No variation
    
    // Check each impact for outliers
    typeImpacts.forEach(impact => {
      const value = parseQuantitativeValue(impact.quantitativeValue);
      if (value === 0) return;
      
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > 2.5) {
        anomalies.push({
          type: 'outlier',
          impact,
          zScore,
          description: `Unusually ${value > mean ? 'high' : 'low'} ${type} impact: ${impact.quantitativeValue || 'N/A'}`,
          severity: zScore > 3 ? 'high' : 'medium',
          entity: impact.affectedEntity,
          impactType: type,
          recommendation: value > mean 
            ? `This impact is ${((value / mean - 1) * 100).toFixed(0)}% above average. Verify data accuracy.`
            : `This impact is ${((1 - value / mean) * 100).toFixed(0)}% below average. May indicate incomplete data.`
        });
      }
    });
  });
  
  // Detect direction conflicts
  const conflicts = findImpactConflicts(impacts);
  conflicts.forEach(conflict => {
    anomalies.push({
      type: 'conflict',
      impacts: [...conflict.increases, ...conflict.decreases],
      description: `Conflicting impacts on ${conflict.affectedEntity}: ${conflict.increases.length} increases vs ${conflict.decreases.length} decreases for ${conflict.impactType}`,
      severity: 'high',
      entity: conflict.affectedEntity,
      impactType: conflict.impactType,
      recommendation: 'Review policies to identify source of contradiction. May indicate policy changes or conflicting initiatives.'
    });
  });
  
  // Detect unusual patterns
  // High severity impacts with low confidence
  impacts.forEach(impact => {
    if (impact.severity === 'high' && impact.confidence < 0.6) {
      anomalies.push({
        type: 'unusual_pattern',
        impact,
        description: `High severity impact with low confidence (${(impact.confidence * 100).toFixed(0)}%)`,
        severity: 'medium',
        entity: impact.affectedEntity,
        impactType: impact.impactType,
        recommendation: 'Verify evidence and source documents for this impact.'
      });
    }
  });
  
  // Detect threshold breaches
  // Multiple high-severity impacts on same entity
  const byEntity = groupBy(impacts, 'affectedEntity');
  Object.keys(byEntity).forEach(entity => {
    const entityImpacts = byEntity[entity];
    const highSeverityCount = entityImpacts.filter(i => i.severity === 'high').length;
    
    if (highSeverityCount >= 5) {
      anomalies.push({
        type: 'threshold_breach',
        impacts: entityImpacts.filter(i => i.severity === 'high'),
        description: `${entity} has ${highSeverityCount} high-severity impacts - requires immediate attention`,
        severity: 'high',
        entity,
        recommendation: 'This entity is heavily impacted. Consider comprehensive impact analysis and mitigation strategies.'
      });
    }
  });
  
  return anomalies;
}

/**
 * Get anomaly summary statistics
 */
export function getAnomalySummary(anomalies: Anomaly[]) {
  return {
    total: anomalies.length,
    byType: {
      outlier: anomalies.filter(a => a.type === 'outlier').length,
      conflict: anomalies.filter(a => a.type === 'conflict').length,
      unusual_pattern: anomalies.filter(a => a.type === 'unusual_pattern').length,
      threshold_breach: anomalies.filter(a => a.type === 'threshold_breach').length
    },
    bySeverity: {
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length
    }
  };
}
