/**
 * Azure Functions Client
 * Wrapper for calling Azure Functions with authentication, retry logic, and error handling
 */

const AZURE_FUNCTIONS_URL = import.meta.env.VITE_AZURE_FUNCTIONS_URL || '';
const AZURE_FUNCTIONS_KEY = import.meta.env.VITE_AZURE_FUNCTIONS_KEY || '';

interface AzureFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface QueuedRequest {
  resolve: (value: AzureFunctionResponse<unknown>) => void;
  reject: (error: Error) => void;
  functionName: string;
  body: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

let requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const MIN_REQUEST_INTERVAL = 100;
let lastRequestTime = 0;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const request = requestQueue.shift();
    if (!request) break;
    
    activeRequests++;
    
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    executeRequest(request.functionName, request.body, request.retryCount, request.maxRetries)
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        activeRequests--;
        setTimeout(() => processQueue(), 50);
      });
  }
  
  isProcessingQueue = false;
}

async function executeRequest<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<AzureFunctionResponse<T>> {
  const url = `${AZURE_FUNCTIONS_URL}/api/${functionName}`;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (AZURE_FUNCTIONS_KEY) {
      headers['x-functions-key'] = AZURE_FUNCTIONS_KEY;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if ((response.status === 429 || response.status === 503 || response.status === 502) && retryCount < maxRetries) {
      const retryAfter = response.headers.get('Retry-After');
      const baseDelay = (response.status === 503) ? 5000 : (response.status === 502) ? 3000 : 1000;
      const delay = retryAfter 
        ? Math.max(parseInt(retryAfter) * 1000, baseDelay)
        : baseDelay * Math.pow(2, retryCount);
      
      console.warn(`Azure Function ${response.status === 503 ? 'throttled (Azure Search overloaded)' : response.status === 502 ? 'bad gateway' : 'rate limited'} (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeRequest<T>(functionName, body, retryCount + 1, maxRetries);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${errorText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        if (response.status === 500) {
          errorMessage = `Server error (500): The Azure Function encountered an error. ${errorText.substring(0, 200)}`;
        }
      }

      console.error(`Azure Function error (${response.status}):`, {
        url,
        status: response.status,
        errorText: errorText.substring(0, 500),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse Azure Function response:', parseError);
      return {
        success: false,
        error: 'Invalid response from Azure Function (not JSON)',
      };
    }
    
    // Check for error in response body
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    throw error;
  }
}

async function callAzureFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<AzureFunctionResponse<T>> {
  if (!AZURE_FUNCTIONS_URL) {
    return {
      success: false,
      error: 'Azure Functions URL not configured. Set VITE_AZURE_FUNCTIONS_URL environment variable.',
    };
  }

  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return new Promise<AzureFunctionResponse<T>>((resolve, reject) => {
      requestQueue.push({
        resolve: resolve as (value: AzureFunctionResponse<unknown>) => void,
        reject,
        functionName,
        body,
        retryCount,
        maxRetries,
      });
      processQueue();
    });
  }

  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    
    activeRequests++;
    const result = await executeRequest<T>(functionName, body, retryCount, maxRetries);
    activeRequests--;
    processQueue();
    return result;
  } catch (error) {
    activeRequests--;
    processQueue();
    
    if (retryCount < maxRetries && error instanceof Error && !error.message.includes('INSUFFICIENT_RESOURCES')) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`Azure Function request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAzureFunction<T>(functionName, body, retryCount + 1, maxRetries);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function callRAGMetadata<T = unknown>(
  type: 'stats' | 'documents' | 'categories' | 'search' | 'bulk' | 'semantic-search',
  options: {
    filters?: {
      category?: string;
      sector?: string;
      documentType?: 'pdf' | 'web' | 'all';
      tags?: string[];
    };
    query?: string;
    top?: number;
    operations?: string[];
    options?: {
      topK?: number;
      timeAwareRanking?: boolean;
      systemPrompt?: string; // Tab-specific HORUS intelligence prompt
    };
  } = {}
): Promise<AzureFunctionResponse<T>> {
  return callAzureFunction<T>('rag-metadata', {
    type,
    ...options,
  });
}

export async function callRAGMetadataBulk(operations: ('stats' | 'categories' | 'documents')[], filters?: {
  category?: string;
  sector?: string;
  documentType?: 'pdf' | 'web' | 'all';
  tags?: string[];
}): Promise<AzureFunctionResponse<{
  stats?: unknown;
  categories?: unknown;
  documents?: unknown;
}>> {
  return callRAGMetadata('bulk', {
    operations,
    filters,
  });
}

export function isAzureFunctionsConfigured(): boolean {
  return !!AZURE_FUNCTIONS_URL;
}

export default {
  callAzureFunction,
  callRAGMetadata,
  isAzureFunctionsConfigured,
};

