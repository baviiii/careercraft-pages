/**
 * Test utility to verify PDF tables are indexed in Azure AI Search
 * Tests whether table data is available for Horus Chat queries
 * 
 * Usage: testHorusChatTables() in browser console
 */

import { callRAGMetadata, isAzureFunctionsConfigured } from '@/lib/azureFunctions';
import { supabase } from '@/integrations/supabase/client';

export async function testHorusChatTables() {
  console.log('🧪 Testing PDF Table Indexing in Azure AI Search...\n');
  console.log('='.repeat(70));

  const results = {
    azureConfig: false,
    dataAvailable: false,
    tableDataFound: false,
    sampleQueries: [] as Array<{ query: string; hasTables: boolean; sources: number }>,
  };

  // ============================================================
  // TEST 1: Azure Configuration
  // ============================================================
  console.log('\n📊 TEST 1: Azure Configuration\n');

  const azureConfigured = isAzureFunctionsConfigured();
  results.azureConfig = azureConfigured;

  if (azureConfigured) {
    console.log('✅ Azure Functions: Configured');
    console.log('   Using Azure AI Search for document retrieval');
  } else {
    console.log('⚠️  Azure Functions: Not configured');
    console.log('   Using Supabase Edge Functions (fallback)');
    console.log('   Note: Table data testing requires Azure AI Search');
  }

  // ============================================================
  // TEST 2: Check if Data Exists in Index
  // ============================================================
  console.log('\n📚 TEST 2: Checking Data Availability\n');

  try {
    // Test query to see if any data exists
    const testResult = await callRAGMetadata('semantic-search', {
      query: 'South Australia government',
      options: {
        topK: 5,
      },
    });

    if (testResult.success && testResult.data) {
      const data = testResult.data as any;
      const sourceCount = data.sources?.length || 0;
      
      console.log(`✅ Data Available: Found ${sourceCount} sources`);
      results.dataAvailable = true;

      if (sourceCount > 0) {
        console.log('   Sample documents:');
        data.sources.slice(0, 3).forEach((source: any, i: number) => {
          console.log(`     ${i + 1}. ${source.title || source.documentId}`);
          console.log(`        Page: ${source.pageNumber || 'N/A'}`);
          console.log(`        Category: ${source.category || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ Data Not Available');
      console.log('   Error:', testResult.error);
      console.log('   ⚠️  Azure AI Search index may be empty');
      console.log('   💡 Run PDF processing script to index documents');
      return results;
    }
  } catch (error: any) {
    console.error('❌ Failed to check data availability:', error.message);
    return results;
  }

  // ============================================================
  // TEST 3: Test Queries That Should Return Table Data
  // ============================================================
  console.log('\n📊 TEST 3: Testing Table Data Queries\n');

  // Queries that typically come from tables
  const tableQueries = [
    'What is the budget allocation for healthcare in 2025?',
    'How many jobs are available in the technology sector?',
    'What are the salary ranges for government positions?',
    'Show me the funding breakdown by sector',
    'What is the employment growth percentage for electricians?',
  ];

  let tablesFoundCount = 0;

  for (const query of tableQueries) {
    try {
      console.log(`\n   Query: "${query}"`);
      const startTime = Date.now();

      const result = await callRAGMetadata('semantic-search', {
        query,
        options: {
          topK: 10, // Get more results to find table data
          timeAwareRanking: true,
        },
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const data = result.data as any;
        const sources = data.sources || [];
        
        // Check if any source has table metadata
        const hasTableData = sources.some((source: any) => {
          // Check for table indicators in metadata or content
          const metadata = source.metadata || {};
          const content = source.content || '';
          
          return (
            metadata.tableIndex !== undefined ||
            metadata.tableRow !== undefined ||
            metadata.type === 'table_row' ||
            content.includes('TABLE') ||
            content.includes('|') && content.split('|').length > 3 // Likely table row
          );
        });

        const tableSources = sources.filter((source: any) => {
          const metadata = source.metadata || {};
          const content = source.content || '';
          return (
            metadata.tableIndex !== undefined ||
            metadata.tableRow !== undefined ||
            metadata.type === 'table_row' ||
            (content.includes('|') && content.split('|').length > 3)
          );
        });

        if (hasTableData) {
          console.log(`   ✅ Found table data (${duration}ms)`);
          console.log(`      Sources with tables: ${tableSources.length}/${sources.length}`);
          tablesFoundCount++;

          // Show sample table data
          if (tableSources.length > 0) {
            const sample = tableSources[0];
            console.log(`      Sample table from: ${sample.title || sample.documentId}`);
            if (sample.metadata) {
              console.log(`      Table metadata:`, {
                tableIndex: sample.metadata.tableIndex,
                rowIndex: sample.metadata.rowIndex,
                headers: sample.metadata.headers,
              });
            }
            if (sample.content) {
              const preview = sample.content.substring(0, 150);
              console.log(`      Content preview: ${preview}...`);
            }
          }
        } else {
          console.log(`   ⚠️  No table data found (${duration}ms)`);
          console.log(`      Found ${sources.length} text sources`);
        }

        results.sampleQueries.push({
          query,
          hasTables: hasTableData,
          sources: sources.length,
        });
      } else {
        console.log(`   ❌ Query failed: ${result.error}`);
        results.sampleQueries.push({
          query,
          hasTables: false,
          sources: 0,
        });
      }

      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ❌ Query exception: ${error.message}`);
      results.sampleQueries.push({
        query,
        hasTables: false,
        sources: 0,
      });
    }
  }

  results.tableDataFound = tablesFoundCount > 0;

  // ============================================================
  // TEST 4: Check Metadata Structure
  // ============================================================
  console.log('\n🔍 TEST 4: Checking Metadata Structure\n');

  try {
    // Query for something that should have structured data
    const result = await callRAGMetadata('semantic-search', {
      query: 'budget allocation funding',
      options: {
        topK: 20,
      },
    });

    if (result.success && result.data) {
      const data = result.data as any;
      const sources = data.sources || [];
      
      // Analyze metadata structure
      const metadataTypes = new Set<string>();
      const hasMetadata = sources.filter((s: any) => s.metadata).length;
      
      sources.forEach((source: any) => {
        if (source.metadata) {
          Object.keys(source.metadata).forEach(key => {
            metadataTypes.add(key);
          });
        }
      });

      console.log(`✅ Metadata Analysis:`);
      console.log(`   Sources with metadata: ${hasMetadata}/${sources.length}`);
      console.log(`   Metadata fields found: ${Array.from(metadataTypes).join(', ') || 'None'}`);

      if (metadataTypes.has('tableIndex') || metadataTypes.has('tableRow') || metadataTypes.has('type')) {
        console.log('   ✅ Table metadata structure detected!');
        results.tableDataFound = true;
      } else {
        console.log('   ⚠️  No table-specific metadata found');
        console.log('   💡 Tables may be indexed as text only');
      }
    }
  } catch (error: any) {
    console.error('❌ Metadata check failed:', error.message);
  }

  // ============================================================
  // TEST 5: Test Specific Table Queries
  // ============================================================
  console.log('\n📋 TEST 5: Specific Table Data Queries\n');

  const specificQueries = [
    {
      query: 'Table 2.1 budget healthcare',
      description: 'Looking for specific table reference',
    },
    {
      query: 'employment growth percentage by occupation',
      description: 'Query that should match table rows',
    },
    {
      query: 'salary range government positions',
      description: 'Query for tabular salary data',
    },
  ];

  for (const { query, description } of specificQueries) {
    try {
      console.log(`\n   "${query}"`);
      console.log(`   (${description})`);

      const result = await callRAGMetadata('semantic-search', {
        query,
        options: {
          topK: 15,
        },
      });

      if (result.success && result.data) {
        const data = result.data as any;
        const sources = data.sources || [];
        
        // Look for table-like content
        const tableLikeSources = sources.filter((source: any) => {
          const content = source.content || '';
          // Check for table patterns: multiple columns separated by | or tabs
          const hasMultipleColumns = content.split('|').length > 3 || content.split('\t').length > 3;
          const hasNumbers = /\d+/.test(content);
          return hasMultipleColumns && hasNumbers;
        });

        if (tableLikeSources.length > 0) {
          console.log(`   ✅ Found ${tableLikeSources.length} table-like sources`);
          const sample = tableLikeSources[0];
          console.log(`      From: ${sample.title || sample.documentId}`);
          console.log(`      Preview: ${(sample.content || '').substring(0, 200)}...`);
        } else {
          console.log(`   ⚠️  No table-like data found`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY\n');

  console.log(`Azure Configuration: ${results.azureConfig ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`Data Available: ${results.dataAvailable ? '✅ Yes' : '❌ No'}`);
  console.log(`Table Data Found: ${results.tableDataFound ? '✅ Yes' : '❌ No'}`);
  console.log(`\nQuery Results:`);
  results.sampleQueries.forEach((q, i) => {
    const status = q.hasTables ? '✅' : '⚠️';
    console.log(`   ${status} "${q.query.substring(0, 50)}..." - ${q.sources} sources`);
  });

  if (results.tableDataFound) {
    console.log('\n✅ SUCCESS: Table data is indexed and retrievable!');
    console.log('   Horus Chat can access PDF table data.');
  } else if (results.dataAvailable) {
    console.log('\n⚠️  WARNING: Data exists but table structure not detected');
    console.log('   Tables may be indexed as text only.');
    console.log('   Horus Chat can still use the data, but may not recognize table structure.');
  } else {
    console.log('\n❌ ISSUE: No data found in Azure AI Search');
    console.log('   💡 Action needed:');
    console.log('   1. Run PDF processing script to index documents');
    console.log('   2. Verify Azure AI Search index has data');
    console.log('   3. Check Azure Functions are deployed');
  }

  return results;
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).testHorusChatTables = testHorusChatTables;
}


