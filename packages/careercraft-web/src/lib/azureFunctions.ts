/**
 * Azure Functions Client
 * Secure proxy wrapper for calling Azure Functions via Supabase Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

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
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      console.error(`Azure Function proxy error:`, error);
      return {
        success: false,
        error: error.message || 'Proxy request failed',
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
      console.warn(`Azure Function proxy request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
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
  type: 'stats' | 'documents' | 'categories' | 'search' | 'bulk' | 'semantic-search' | 'fetch-tables',
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
      systemPrompt?: string;
    };
  } = {}
): Promise<AzureFunctionResponse<T>> {
  return callAzureFunction<T>('azure-rag-proxy', {
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
  return true; // Always configured via Supabase proxy
}

export default {
  callAzureFunction,
  callRAGMetadata,
  isAzureFunctionsConfigured,
};
