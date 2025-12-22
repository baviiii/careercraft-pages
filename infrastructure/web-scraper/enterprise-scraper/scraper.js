/**
 * Enterprise Web Scraper for SA Government Websites
 * Uses Playwright for browser automation - handles JavaScript, anti-bot, dynamic content
 * 
 * Usage:
 *   node --max-old-space-size=4096 scraper.js --resourceGroup "rg-careercraft-dev" [--jobsOnly] [--skillsOnly] [--newsOnly]
 */

const playwright = require('playwright');
const chromium = playwright.chromium;
const fs = require('fs');
const path = require('path');

// Configuration
const TARGETS = {
  jobs: [
    { name: 'SA Jobs Portal', url: 'https://jobs.sa.gov.au', strategy: 'jobs' },
    { name: 'I Work for SA', url: 'https://iworkfor.sa.gov.au', strategy: 'jobs' },
    { name: 'Public Sector Jobs', url: 'https://www.publicsector.sa.gov.au/working-in-the-public-sector/job-opportunities', strategy: 'jobs' },
    { name: 'SA Gov - Looking for Work', url: 'https://www.sa.gov.au/topics/employment-and-work/looking-for-work', strategy: 'jobs' },
    { name: 'SA Gov - Finding a Job', url: 'https://www.sa.gov.au/topics/employment-and-work/finding-a-job', strategy: 'jobs' },
  ],
  skills: [
    { name: 'Migration SA', url: 'https://www.migration.sa.gov.au', strategy: 'skills' },
    { name: 'Skills SA', url: 'https://www.skills.sa.gov.au', strategy: 'skills' },
    { name: 'Skilled Workers SA', url: 'https://skilledworkers.business.sa.gov.au', strategy: 'skills' },
    { name: 'Business SA', url: 'https://www.business.sa.gov.au', strategy: 'skills' },
  ],
  news: [
    { name: 'Premier SA Media Releases', url: 'https://www.premier.sa.gov.au/media-releases', strategy: 'news' },
    { name: 'Skills SA News', url: 'https://www.skills.sa.gov.au/news', strategy: 'news' },
  ],
  general: [
    { name: 'SA Gov Career Info', url: 'https://www.sa.gov.au/topics/employment-and-work/career-information', strategy: 'general' },
    { name: 'Public Sector Careers', url: 'https://www.publicsector.sa.gov.au', strategy: 'general' },
    { name: 'SA Health Careers', url: 'https://www.sahealth.sa.gov.au/careers', strategy: 'general' },
    { name: 'Education SA', url: 'https://www.education.sa.gov.au', strategy: 'general' },
  ]
};

// Extract content based on strategy
function extractContent(page, strategy) {
  switch (strategy) {
    case 'jobs':
      return page.evaluate(() => {
        // Try to find job listings
        const jobs = [];
        // Look for common job posting containers
        const selectors = [
          'article',
          '[class*="job"]',
          '[class*="vacancy"]',
          '[class*="position"]',
          '[class*="listing"]'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const text = el.innerText?.trim();
            if (text && text.length > 50) {
              jobs.push(text);
            }
          });
        });
        
        // If no jobs found, get main content
        if (jobs.length === 0) {
          const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
          return main?.innerText?.trim() || '';
        }
        
        return jobs.join('\n\n');
      });
      
    case 'skills':
    case 'general':
      return page.evaluate(() => {
        // Get main content area
        const selectors = [
          'main',
          '[role="main"]',
          'article',
          '.content',
          '#content',
          '.main-content'
        ];
        
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el && el.innerText?.trim().length > 200) {
            return el.innerText.trim();
          }
        }
        
        // Fallback to body
        return document.body?.innerText?.trim() || '';
      });
      
    case 'news':
      return page.evaluate(() => {
        const news = [];
        const selectors = [
          'article',
          '[class*="news"]',
          '[class*="media-release"]',
          '[class*="update"]'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const text = el.innerText?.trim();
            if (text && text.length > 100) {
              news.push(text);
            }
          });
        });
        
        return news.length > 0 ? news.join('\n\n') : (document.body?.innerText?.trim() || '');
      });
      
    default:
      return page.evaluate(() => document.body?.innerText?.trim() || '');
  }
}

// Main scraping function with pagination and scrolling
async function scrapeWebsite(browser, target, options = {}) {
  const { waitForSelector, waitForTimeout = 2000, maxPages = 10 } = options;
  
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    console.log(`  → Scraping: ${target.name}`);
    console.log(`    URL: ${target.url}`);
    
    let allContent = [];
    let currentUrl = target.url;
    let pageNum = 1;
    let pageTitle = null;
    const visitedUrls = new Set(); // Track visited URLs to prevent loops
    
    // Navigate through multiple pages
    while (pageNum <= maxPages && currentUrl) {
      try {
        // Normalize URL to check for duplicates
        const normalizedUrl = currentUrl.split('#')[0].split('?')[0];
        if (visitedUrls.has(normalizedUrl)) {
          console.log(`    [Page ${pageNum}] Already visited, stopping pagination`);
          break;
        }
        visitedUrls.add(normalizedUrl);
        
        console.log(`    [Page ${pageNum}] Loading: ${currentUrl}`);
        
        // Navigate to page with timeout
        await Promise.race([
          page.goto(currentUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), 35000))
        ]);
        
        console.log(`    [Page ${pageNum}] Page loaded, waiting for content...`);
        
        // Wait for content to load (for dynamic sites)
        if (waitForSelector) {
          try {
            await page.waitForSelector(waitForSelector, { timeout: 8000 });
          } catch (e) {
            // Selector not found, continue anyway
          }
        }
        
        // Additional wait for JavaScript to render
        await page.waitForTimeout(waitForTimeout);
        
        console.log(`    [Page ${pageNum}] Scrolling to load all content...`);
        
        // Scroll down incrementally to trigger lazy loading (with timeout)
        await Promise.race([
          page.evaluate(async () => {
            const scrollStep = 500;
            const scrollDelay = 200; // Faster scrolling
            const maxScrolls = 15; // Reduced scrolls
            
            for (let i = 0; i < maxScrolls; i++) {
              window.scrollBy(0, scrollStep);
              await new Promise(resolve => setTimeout(resolve, scrollDelay));
              
              if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
                break;
              }
            }
            
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 300));
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Scroll timeout')), 5000))
        ]).catch(err => {
          console.log(`    [Page ${pageNum}] Scroll warning: ${err.message}`);
        });
        
        console.log(`    [Page ${pageNum}] Extracting content...`);
        
        // Get title (only on first page)
        if (pageNum === 1) {
          pageTitle = await page.title().catch(() => target.name);
        }
        
        // Extract content from this page
        const pageContent = await extractContent(page, target.strategy);
        
        if (pageContent && pageContent.length > 100) {
          allContent.push({
            page: pageNum,
            content: pageContent,
            url: currentUrl
          });
          console.log(`    [Page ${pageNum}] Extracted: ${pageContent.length} chars`);
        } else {
          console.log(`    [Page ${pageNum}] Content too short (${pageContent?.length || 0} chars), may be last page`);
        }
        
        // Try to find next page link (only if we haven't reached max pages)
        if (pageNum >= maxPages) {
          console.log(`    [Page ${pageNum}] Reached max pages limit (${maxPages})`);
          break;
        }
        
        console.log(`    [Page ${pageNum}] Looking for next page...`);
        const nextUrl = await page.evaluate(() => {
          // First, try to find explicit "next" buttons/links
          const nextSelectors = [
            'a[aria-label*="next" i]',
            'a[aria-label*="Next" i]',
            '.pagination .next:not(.disabled)',
            '.pagination-next:not(.disabled)',
            'a.next:not(.disabled)',
            'a[class*="next"]:not([class*="disabled"])'
          ];
          
          for (const selector of nextSelectors) {
            try {
              const link = document.querySelector(selector);
              if (link && !link.classList.contains('disabled') && link.getAttribute('aria-disabled') !== 'true') {
                const href = link.getAttribute('href');
                if (href) {
                  try {
                    const fullUrl = new URL(href, window.location.href).href;
                    if (fullUrl !== window.location.href) {
                      return fullUrl;
                    }
                  } catch (e) {
                    continue;
                  }
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          // If no explicit next button, don't auto-increment - let it stop
          return null;
        });
        
        // Only use nextUrl if we found an actual next button
        if (!nextUrl) {
          console.log(`    [Page ${pageNum}] No next page link found, stopping pagination`);
          break;
        }
        
        // Check if nextUrl is different from current
        const currentFullUrl = page.url();
        if (nextUrl === currentFullUrl || nextUrl === currentUrl) {
          console.log(`    [Page ${pageNum}] Next URL same as current, stopping`);
          break;
        }
        
        currentUrl = nextUrl;
        pageNum++;
        
        // Small delay before next page
        await page.waitForTimeout(1000);
        
      } catch (pageError) {
        console.log(`    [Page ${pageNum}] Error: ${pageError.message}`);
        break;
      }
    }
    
    await page.close();
    
    // Combine all page content
    if (allContent.length > 0) {
      const combinedContent = allContent.map(p => 
        `[Page ${p.page} - ${p.url}]\n${p.content}`
      ).join('\n\n---\n\n');
      
      return {
        success: true,
        title: pageTitle || target.name,
        content: combinedContent,
        url: target.url,
        pagesScraped: pageNum - 1,
        strategy: target.strategy
      };
    } else {
      return {
        success: false,
        error: 'No content extracted from any page',
        url: target.url
      };
    }
    
  } catch (error) {
    await page.close().catch(() => {});
    return {
      success: false,
      error: error.message,
      url: target.url
    };
  }
}

// Chunk content for embeddings
function chunkContent(content, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let position = 0;
  let previousPosition = -1;
  let iterations = 0;
  const maxIterations = Math.ceil(content.length / (chunkSize - overlap)) + 10; // Safety limit
  
  while (position < content.length && iterations < maxIterations) {
    iterations++;
    
    const end = Math.min(position + chunkSize, content.length);
    const chunk = content.substring(position, end).trim();
    
    // Always add chunk if it exists, even if small (we'll filter later if needed)
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    
    // Calculate next position
    const nextPosition = end - overlap;
    
    // Safety check: ensure we're making progress
    if (nextPosition <= position) {
      // Not advancing, force advance
      position = end;
      if (position >= content.length) {
        break;
      }
    } else {
      position = nextPosition;
    }
    
    // Additional safety: if position didn't change, break
    if (position === previousPosition) {
      break;
    }
    previousPosition = position;
  }
  
  // Filter out very small chunks (except if it's the only chunk)
  if (chunks.length > 1) {
    return chunks.filter(chunk => chunk.length > 100);
  }
  
  return chunks;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const resourceGroup = args.find(arg => arg.startsWith('--resourceGroup'))?.split('=')[1] || 'rg-careercraft-dev';
  const jobsOnly = args.includes('--jobsOnly');
  const skillsOnly = args.includes('--skillsOnly');
  const newsOnly = args.includes('--newsOnly');
  
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('  Enterprise Web Scraper (Playwright)');
  console.log('════════════════════════════════════════');
  console.log('');
  console.log(`Resource Group: ${resourceGroup}`);
  console.log('');
  
  // Determine which targets to scrape
  let targets = [];
  if (jobsOnly) {
    targets = TARGETS.jobs;
  } else if (skillsOnly) {
    targets = TARGETS.skills;
  } else if (newsOnly) {
    targets = TARGETS.news;
  } else {
    targets = [...TARGETS.jobs, ...TARGETS.skills, ...TARGETS.news, ...TARGETS.general];
  }
  
  console.log(`Scraping ${targets.length} websites...`);
  console.log('');
  
  const results = [];
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `scraped-content-${Date.now()}.json`);
  const allDocuments = [];
  
  // Process in batches to manage memory - restart browser every 3 sites
  const batchSize = 3;
  let browser = null;
  
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    
    // Restart browser every batchSize sites to free memory
    if (i % batchSize === 0) {
      if (browser) {
        await browser.close();
        browser = null;
      }
      
      // Small delay before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-images',  // Don't load images to save memory
          '--disable-javascript-harmony-shipping',
          '--disable-background-networking'
        ]
      });
    }
    
    // Delay between requests (be respectful)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n[${i + 1}/${targets.length}] Scraping: ${target.name}`);
    try {
      const result = await scrapeWebsite(browser, target, {
        waitForTimeout: 1500,  // Reduced wait time
        maxPages: 10  // Scrape up to 10 pages per site
      });
      
      results.push(result);
      
      if (result.success) {
        const pagesInfo = result.pagesScraped ? ` (${result.pagesScraped} pages)` : '';
        console.log(`  ✓ Success: ${result.title}${pagesInfo} (${result.content.length} chars)`);
        console.log(`  → Starting to chunk content...`);
        
        // Chunk the content (limit chunk size to reduce memory)
        const chunks = chunkContent(result.content, 800, 100);  // Even smaller chunks
        console.log(`  → Created ${chunks.length} chunk(s)`);
        
        console.log(`  → Processing chunks into documents...`);
        chunks.forEach((chunk, idx) => {
          try {
            const docId = Buffer.from(`${result.url}-chunk-${idx}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
            
            allDocuments.push({
              id: docId,
              title: result.title,
              content: chunk,
              url: result.url,
              documentType: 'web',
              source: result.url,
              chunkIndex: idx,
              category: result.strategy === 'jobs' ? 'jobs' : result.strategy === 'skills' ? 'skills' : 'general',
              sector: 'government',
              tags: [result.strategy, 'web-scraped', 'government'],
              indexedAt: new Date().toISOString()
            });
          } catch (chunkError) {
            console.log(`  ✗ Error processing chunk ${idx}: ${chunkError.message}`);
          }
        });
        console.log(`  → Processed ${chunks.length} chunk(s), total documents: ${allDocuments.length}`);
        
        // Save incrementally every 2 sites to reduce memory pressure
        if ((i + 1) % 2 === 0 && allDocuments.length > 0) {
          console.log(`  → Saving progress to file...`);
          try {
            // Append to existing file or create new
            let existingData = [];
            if (fs.existsSync(outputFile)) {
              try {
                existingData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
              } catch (e) {
                console.log(`  → Warning: Could not read existing file, starting fresh`);
                existingData = [];
              }
            }
            const combined = [...existingData, ...allDocuments];
            fs.writeFileSync(outputFile, JSON.stringify(combined, null, 2));
            console.log(`  ✓ Saved progress: ${combined.length} total documents`);
            // Clear array after saving to free memory
            allDocuments.length = 0;
          } catch (saveError) {
            console.log(`  ✗ Error saving file: ${saveError.message}`);
          }
        } else {
          console.log(`  → Not saving yet (will save after ${2 - ((i + 1) % 2)} more site(s))`);
        }
      } else {
        console.log(`  ✗ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      results.push({ success: false, error: error.message, url: target.url });
    }
    
    console.log(`  [Completed site ${i + 1}/${targets.length}]`);
    console.log('');
  }
  
  if (browser) {
    await browser.close();
  }
  
  // Final save - append any remaining documents
  if (allDocuments.length > 0) {
    let existingData = [];
    if (fs.existsSync(outputFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      } catch (e) {
        existingData = [];
      }
    }
    const combined = [...existingData, ...allDocuments];
    fs.writeFileSync(outputFile, JSON.stringify(combined, null, 2));
  }
  
  // Reload final count from file for summary
  let finalDocuments = [];
  if (fs.existsSync(outputFile)) {
    try {
      finalDocuments = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    } catch (e) {
      finalDocuments = [];
    }
  }
  
  // Summary
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('  Scraping Complete');
  console.log('════════════════════════════════════════');
  console.log('');
  console.log(`Successful: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`Total Documents: ${finalDocuments.length}`);
  console.log(`Output File: ${outputFile}`);
  console.log('');
  console.log('Next step: Run PowerShell script to upload to Azure AI Search');
  console.log('');
}

// Run
main().catch(console.error);

