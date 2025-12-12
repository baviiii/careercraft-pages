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
    const { action, query, country, industry, category } = await req.json();
    const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (action === "fetch_news") {
      if (!NEWS_API_KEY) {
        throw new Error("NEWS_API_KEY is not configured");
      }

      // Build search queries for job-related news
      const searchTerms = [
        query || "jobs hiring",
        industry ? `${industry} jobs` : "",
        "employment trends",
        "layoffs",
        "tech hiring"
      ].filter(Boolean).join(" OR ");

      const newsUrl = new URL("https://newsapi.org/v2/everything");
      newsUrl.searchParams.set("q", searchTerms);
      newsUrl.searchParams.set("language", "en");
      newsUrl.searchParams.set("sortBy", "publishedAt");
      newsUrl.searchParams.set("pageSize", "20");
      
      if (country) {
        // NewsAPI uses country codes for top-headlines, but for everything endpoint we filter differently
        newsUrl.searchParams.set("q", `${searchTerms} ${country}`);
      }

      console.log(`Fetching news with query: ${searchTerms}`);

      const newsResponse = await fetch(newsUrl.toString(), {
        headers: {
          "X-Api-Key": NEWS_API_KEY,
        },
      });

      if (!newsResponse.ok) {
        const errorText = await newsResponse.text();
        console.error("NewsAPI error:", newsResponse.status, errorText);
        throw new Error(`NewsAPI error: ${newsResponse.status}`);
      }

      const newsData = await newsResponse.json();
      
      // Filter and enhance articles
      const articles = newsData.articles?.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage,
        category: categorizeArticle(article.title, article.description),
      })).filter((a: any) => a.title && !a.title.includes("[Removed]")) || [];

      return new Response(JSON.stringify({ articles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "analyze_trends") {
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const systemPrompt = `You are a job market analyst expert. Analyze the provided news articles and generate insights about job market trends.

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
            { role: "user", content: `Analyze these job market news for ${industry || "general"} industry:\n${query}` }
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

function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes("layoff") || text.includes("cut jobs") || text.includes("workforce reduction")) {
    return "layoffs";
  }
  if (text.includes("hiring") || text.includes("new jobs") || text.includes("recruitment")) {
    return "hiring";
  }
  if (text.includes("salary") || text.includes("pay") || text.includes("compensation")) {
    return "salary";
  }
  if (text.includes("remote") || text.includes("work from home") || text.includes("hybrid")) {
    return "remote_work";
  }
  if (text.includes("ai") || text.includes("artificial intelligence") || text.includes("automation")) {
    return "ai_impact";
  }
  if (text.includes("visa") || text.includes("immigration") || text.includes("h1b")) {
    return "immigration";
  }
  return "general";
}
