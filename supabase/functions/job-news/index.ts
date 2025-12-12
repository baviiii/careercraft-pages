import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, country, industry, category, page } = await req.json();
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (action === "fetch_jobs" || action === "fetch_news") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        throw new Error("Adzuna credentials not configured");
      }

      // Map country names to Adzuna country codes
      const countryCodeMap: Record<string, string> = {
        "United States": "us",
        "United Kingdom": "gb",
        "Australia": "au",
        "Canada": "ca",
        "Germany": "de",
        "India": "in",
        "Singapore": "sg",
        "Netherlands": "nl",
        "France": "fr",
        "Brazil": "br",
        "": "us", // Default
      };

      const countryCode = countryCodeMap[country || ""] || "us";
      const pageNum = page || 1;

      // Build Adzuna API URL
      const adzunaUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${pageNum}`);
      adzunaUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      adzunaUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
      adzunaUrl.searchParams.set("results_per_page", "20");
      
      if (query) {
        adzunaUrl.searchParams.set("what", query);
      }
      if (industry) {
        adzunaUrl.searchParams.set("what", `${query || ""} ${industry}`.trim());
      }
      if (category) {
        adzunaUrl.searchParams.set("category", category);
      }

      console.log(`Fetching jobs from Adzuna: ${countryCode}, query: ${query || industry || "all"}`);

      const jobsResponse = await fetch(adzunaUrl.toString());

      if (!jobsResponse.ok) {
        const errorText = await jobsResponse.text();
        console.error("Adzuna API error:", jobsResponse.status, errorText);
        throw new Error(`Adzuna API error: ${jobsResponse.status}`);
      }

      const jobsData = await jobsResponse.json();
      
      // Transform Adzuna response to our format
      const articles = jobsData.results?.map((job: any) => ({
        title: job.title,
        description: job.description?.substring(0, 200) + "...",
        url: job.redirect_url,
        source: job.company?.display_name || "Unknown Company",
        publishedAt: job.created,
        location: job.location?.display_name,
        salary: job.salary_min && job.salary_max 
          ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
          : job.salary_min 
            ? `From ${job.salary_min.toLocaleString()}`
            : null,
        category: categorizeJob(job.category?.label, job.title),
        contract: job.contract_time,
      })) || [];

      // Also get histogram data for trends
      let trendData = null;
      try {
        const histogramUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/history`);
        histogramUrl.searchParams.set("app_id", ADZUNA_APP_ID);
        histogramUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
        histogramUrl.searchParams.set("months", "6");
        
        const histResponse = await fetch(histogramUrl.toString());
        if (histResponse.ok) {
          trendData = await histResponse.json();
        }
      } catch (e) {
        console.log("Could not fetch trend data:", e);
      }

      return new Response(JSON.stringify({ 
        articles, 
        count: jobsData.count || articles.length,
        trendData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "get_categories") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        throw new Error("Adzuna credentials not configured");
      }

      const countryCode = country || "us";
      const categoriesUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/categories`);
      categoriesUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      categoriesUrl.searchParams.set("app_key", ADZUNA_APP_KEY);

      const catResponse = await fetch(categoriesUrl.toString());
      if (!catResponse.ok) {
        throw new Error(`Categories fetch failed: ${catResponse.status}`);
      }

      const categories = await catResponse.json();
      return new Response(JSON.stringify({ categories: categories.results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "get_salary_data") {
      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        throw new Error("Adzuna credentials not configured");
      }

      const countryCode = country || "us";
      const salaryUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/history`);
      salaryUrl.searchParams.set("app_id", ADZUNA_APP_ID);
      salaryUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
      salaryUrl.searchParams.set("months", "12");
      if (query) {
        salaryUrl.searchParams.set("what", query);
      }

      const salaryResponse = await fetch(salaryUrl.toString());
      if (!salaryResponse.ok) {
        throw new Error(`Salary data fetch failed: ${salaryResponse.status}`);
      }

      const salaryData = await salaryResponse.json();
      return new Response(JSON.stringify({ salaryData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "analyze_trends") {
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const systemPrompt = `You are a job market analyst expert. Analyze the provided job listings and market data to generate insights about job market trends.

Return a JSON object with this structure:
{
  "trends": [
    {"trend": "Trend description", "direction": "up|down|stable", "confidence": 85}
  ],
  "insights": [
    {"title": "Insight title", "description": "Detailed insight", "impact": "high|medium|low"}
  ],
  "predictions": [
    {"prediction": "What might happen", "timeframe": "1-3 months", "likelihood": 75}
  ],
  "salaryTrends": {
    "direction": "up|down|stable",
    "averageChange": "+5%",
    "topPayingRoles": ["role1", "role2"]
  },
  "hotSkills": ["skill1", "skill2", "skill3"],
  "whatThisMeansForYou": "Personalized advice paragraph based on the industry/field"
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze these job market listings for ${industry || "general"} industry in ${country || "US"}:\n${query}` }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      let result;
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Job news error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function categorizeJob(adzunaCategory: string | undefined, title: string): string {
  const titleLower = title?.toLowerCase() || "";
  const catLower = adzunaCategory?.toLowerCase() || "";
  
  if (catLower.includes("it") || titleLower.includes("software") || titleLower.includes("developer") || titleLower.includes("engineer")) {
    return "technology";
  }
  if (catLower.includes("healthcare") || titleLower.includes("nurse") || titleLower.includes("medical")) {
    return "healthcare";
  }
  if (catLower.includes("finance") || titleLower.includes("accountant") || titleLower.includes("financial")) {
    return "finance";
  }
  if (catLower.includes("sales") || titleLower.includes("sales")) {
    return "sales";
  }
  if (catLower.includes("marketing") || titleLower.includes("marketing")) {
    return "marketing";
  }
  if (titleLower.includes("remote") || titleLower.includes("work from home")) {
    return "remote";
  }
  return adzunaCategory || "general";
}
