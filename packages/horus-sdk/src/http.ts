/**
 * HTTP Transport Layer for Horus SDK
 * Extracted from azureFunctions.ts — handles request queue, retry logic, rate limiting
 */

import type { AzureFunctionResponse, HorusConfig } from "./types";

interface QueuedRequest {
  resolve: (value: AzureFunctionResponse<unknown>) => void;
  reject: (error: Error) => void;
  functionName: string;
  body: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

export class HttpTransport {
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private activeRequests = 0;
  private lastRequestTime = 0;
  private readonly maxConcurrentRequests: number;
  private readonly minRequestInterval: number;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: HorusConfig) {
    this.baseUrl = config.azureFunctionsUrl;
    this.apiKey = config.azureFunctionsKey || '';
    this.maxConcurrentRequests = config.maxConcurrentRequests || 3;
    this.minRequestInterval = config.minRequestInterval || 100;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (!request) break;

      this.activeRequests++;

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();
      this.executeRequest(request.functionName, request.body, request.retryCount, request.maxRetries)
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.activeRequests--;
          setTimeout(() => this.processQueue(), 50);
        });
    }

    this.isProcessingQueue = false;
  }

  private async executeRequest<T = unknown>(
    functionName: string,
    body: Record<string, unknown>,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<AzureFunctionResponse<T>> {
    const url = `${this.baseUrl}/api/${functionName}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-functions-key'] = this.apiKey;
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

        console.warn(`Horus SDK: ${response.status} retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest<T>(functionName, body, retryCount + 1, maxRetries);
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${errorText}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          if (response.status === 500) {
            errorMessage = `Server error (500): ${errorText.substring(0, 200)}`;
          }
        }

        return { success: false, error: errorMessage };
      }

      let data;
      try {
        data = await response.json();
      } catch {
        return { success: false, error: 'Invalid response from Azure Function (not JSON)' };
      }

      if (data && typeof data === 'object' && 'error' in data && data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data as T };
    } catch (error) {
      throw error;
    }
  }

  async callFunction<T = unknown>(
    functionName: string,
    body: Record<string, unknown>,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<AzureFunctionResponse<T>> {
    if (!this.baseUrl) {
      return {
        success: false,
        error: 'Azure Functions URL not configured.',
      };
    }

    if (this.activeRequests >= this.maxConcurrentRequests) {
      return new Promise<AzureFunctionResponse<T>>((resolve, reject) => {
        this.requestQueue.push({
          resolve: resolve as (value: AzureFunctionResponse<unknown>) => void,
          reject,
          functionName,
          body,
          retryCount,
          maxRetries,
        });
        this.processQueue();
      });
    }

    try {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();

      this.activeRequests++;
      const result = await this.executeRequest<T>(functionName, body, retryCount, maxRetries);
      this.activeRequests--;
      this.processQueue();
      return result;
    } catch (error) {
      this.activeRequests--;
      this.processQueue();

      if (retryCount < maxRetries && error instanceof Error && !error.message.includes('INSUFFICIENT_RESOURCES')) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Horus SDK: request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callFunction<T>(functionName, body, retryCount + 1, maxRetries);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchRaw(url: string, body: Record<string, unknown>): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-functions-key'] = this.apiKey;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }
}
