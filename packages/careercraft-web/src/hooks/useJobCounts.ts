import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface JobCountsBySector {
  [sector: string]: {
    count: number;
    url: string;
    lastUpdated: Date;
  };
}

// Map IntelligenceContext sectors to AustralianJobs industries
const SECTOR_TO_INDUSTRY_MAP: Record<string, string> = {
  "Health": "Healthcare",
  "Healthcare": "Healthcare",
  "Technology": "Technology",
  "Construction": "Engineering",
  "Energy": "Engineering",
  "Education": "Education",
  "Defence": "Engineering",
  "Agriculture": "Manufacturing",
  "Manufacturing": "Manufacturing",
  "Finance": "Finance",
  "Government": "Legal", // Government jobs may be in Legal category
  "Public": "Legal",
  "Retail": "Retail",
  "Hospitality": "Retail",
  "Tourism": "Retail",
};

/**
 * Hook to fetch and cache job counts by sector from AustralianJobs API
 * Provides live job availability data for Career Explorer and Market Trends
 */
export function useJobCounts(sectors: string[] = []) {
  const [jobCounts, setJobCounts] = useState<JobCountsBySector>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert sectors to industries for API calls
  const industries = useMemo(() => {
    const uniqueIndustries = new Set<string>();
    sectors.forEach(sector => {
      const industry = SECTOR_TO_INDUSTRY_MAP[sector] || "Technology";
      uniqueIndustries.add(industry);
    });
    return Array.from(uniqueIndustries);
  }, [sectors]);

  useEffect(() => {
    if (industries.length === 0) return;

    let mounted = true;
    const cacheKey = `jobCounts_${industries.sort().join("_")}`;
    const cache = localStorage.getItem(cacheKey);
    const cacheData = cache ? JSON.parse(cache) : null;
    const cacheAge = cacheData?.timestamp ? Date.now() - cacheData.timestamp : Infinity;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Use cache if fresh
    if (cacheData && cacheAge < CACHE_DURATION) {
      if (mounted) {
        setJobCounts(cacheData.counts);
        setLoading(false);
      }
      return;
    }

    // Fetch fresh data
    setLoading(true);
    setError(null);

    const fetchJobCounts = async () => {
      try {
        const counts: JobCountsBySector = {};
        
        // Fetch counts for each industry in parallel (but limited to avoid rate limits)
        const fetchPromises = industries.slice(0, 5).map(async (industry) => {
          try {
            const { data, error } = await supabase.functions.invoke("job-news", {
              body: {
                action: "fetch_au_jobs",
                query: industry.toLowerCase(),
                location: "adelaide", // Focus on SA jobs
                page: 1,
              },
            });

            if (error) throw error;
            
            const jobs = data?.jobs || [];
            const totalJobs = jobs.length;
            
            // Find matching sectors for this industry
            const matchingSectors = sectors.filter(
              sector => SECTOR_TO_INDUSTRY_MAP[sector] === industry
            );

            matchingSectors.forEach(sector => {
              const url = `/au-jobs?query=${encodeURIComponent(sector.toLowerCase())}&location=adelaide&industry=${encodeURIComponent(industry)}`;
              counts[sector] = {
                count: totalJobs,
                url,
                lastUpdated: new Date(),
              };
            });
          } catch (err) {
            console.warn(`[useJobCounts] Failed to fetch jobs for ${industry}:`, err);
          }
        });

        await Promise.all(fetchPromises);

        if (mounted) {
          setJobCounts(counts);
          
          // Cache the results
          localStorage.setItem(cacheKey, JSON.stringify({
            counts,
            timestamp: Date.now(),
          }));
        }
      } catch (err: any) {
        console.error("[useJobCounts] Error fetching job counts:", err);
        if (mounted) {
          setError(err.message || "Failed to fetch job counts");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchJobCounts();

    return () => {
      mounted = false;
    };
  }, [industries.join(",")]); // Re-fetch when industries change

  const getJobCount = (sector: string): number => {
    return jobCounts[sector]?.count || 0;
  };

  const getJobUrl = (sector: string): string => {
    return jobCounts[sector]?.url || `/au-jobs?query=${encodeURIComponent(sector.toLowerCase())}&location=adelaide`;
  };

  return {
    jobCounts,
    loading,
    error,
    getJobCount,
    getJobUrl,
  };
}

