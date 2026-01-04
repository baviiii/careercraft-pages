/**
 * PDF EXPORT - Enterprise-grade conversation export with full source citations
 */

import type { ChatMessage } from "@/hooks/useEnterpriseRAG";

export async function exportConversationToPDF(
  messages: ChatMessage[],
  options: {
    includeSources?: boolean;
    includeMetadata?: boolean;
    includeAnalytics?: boolean;
  } = {}
) {
  const {
    includeSources = true,
    includeMetadata = true,
    includeAnalytics = false,
  } = options;

  // Generate HTML content
  const html = generatePDFHTML(messages, { includeSources, includeMetadata, includeAnalytics });

  // Create blob and download
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `career-coach-conversation-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function generatePDFHTML(
  messages: ChatMessage[],
  options: {
    includeSources: boolean;
    includeMetadata: boolean;
    includeAnalytics: boolean;
  }
): string {
  const conversationMessages = messages.filter(m => !m.isLoading && !m.isStreaming);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Horus Chat Conversation</title>
  <style>
    @media print {
      @page { margin: 2cm; }
      body { font-size: 11pt; }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 2rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .header {
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }

    .header .subtitle {
      color: #64748b;
      font-size: 0.95rem;
    }

    .header .metadata {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .message {
      margin-bottom: 2rem;
      page-break-inside: avoid;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .message-role {
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .message-role.user {
      color: #0ea5e9;
    }

    .message-role.assistant {
      color: #8b5cf6;
    }

    .message-timestamp {
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .message-content {
      background: #f8fafc;
      padding: 1.25rem;
      border-radius: 8px;
      border-left: 4px solid #e2e8f0;
    }

    .message.user .message-content {
      background: #dbeafe;
      border-left-color: #0ea5e9;
    }

    .message.assistant .message-content {
      background: #f3e8ff;
      border-left-color: #8b5cf6;
    }

    .message-content p {
      margin-bottom: 0.75rem;
    }

    .message-content p:last-child {
      margin-bottom: 0;
    }

    .message-content strong {
      font-weight: 600;
      color: #0f172a;
    }

    .confidence-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.5rem;
    }

    .confidence-high {
      background: #d1fae5;
      color: #065f46;
    }

    .confidence-medium {
      background: #dbeafe;
      color: #1e40af;
    }

    .confidence-low {
      background: #fef3c7;
      color: #92400e;
    }

    .sources {
      margin-top: 1.5rem;
      padding: 1.25rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .sources-header {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1e293b;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .source-item {
      padding: 0.75rem;
      margin-bottom: 0.75rem;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #8b5cf6;
    }

    .source-item:last-child {
      margin-bottom: 0;
    }

    .source-title {
      font-weight: 500;
      font-size: 0.85rem;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .source-meta {
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .source-snippet {
      font-size: 0.8rem;
      color: #475569;
      font-style: italic;
    }

    .relevance-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      margin-top: 0.5rem;
      overflow: hidden;
    }

    .relevance-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
      border-radius: 2px;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }

    .footer strong {
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Horus Chat Conversation</h1>
      <p class="subtitle">Azure-Powered RAG System • Enterprise-Grade Intelligence</p>
      ${options.includeMetadata ? `
        <div class="metadata">
          <span><strong>Date:</strong> ${new Date().toLocaleString('en-AU')}</span>
          <span><strong>Messages:</strong> ${conversationMessages.length}</span>
          <span><strong>Export Type:</strong> ${options.includeSources ? 'Full' : 'Summary'}</span>
        </div>
      ` : ''}
    </div>

    ${conversationMessages.map(message => `
      <div class="message ${message.role}">
        <div class="message-header">
          <span class="message-role ${message.role}">
            ${message.role === 'user' ? '👤 You' : '🤖 Horus Chat'}
          </span>
          <span class="message-timestamp">${message.timestamp.toLocaleString('en-AU')}</span>
          ${message.confidence ? `
            <span class="confidence-badge confidence-${message.confidence}">
              ${message.confidence === 'high' ? '✓' : message.confidence === 'medium' ? '○' : '⚠'}
              ${message.confidence.toUpperCase()} CONFIDENCE
            </span>
          ` : ''}
        </div>
        <div class="message-content">
          ${formatMessageContent(message.content)}
        </div>

        ${options.includeSources && message.sources && message.sources.length > 0 ? `
          <div class="sources">
            <div class="sources-header">
              📚 Sources (${message.sources.length})
            </div>
            ${message.sources.map((source, idx) => `
              <div class="source-item">
                <div class="source-title">
                  [${idx + 1}] ${source.title}
                </div>
                <div class="source-meta">
                  ${source.category ? `Category: ${source.category} • ` : ''}
                  ${source.pageNumber ? `Page ${source.pageNumber} • ` : ''}
                  ${source.relevance ? `${source.relevance}% match` : ''}
                </div>
                <div class="source-snippet">"${source.snippet.substring(0, 200)}..."</div>
                ${source.relevance ? `
                  <div class="relevance-bar">
                    <div class="relevance-fill" style="width: ${source.relevance}%"></div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}

    <div class="footer">
      <p>Generated by <strong>CareerCraft AI</strong> • Powered by Azure OpenAI & Azure AI Search</p>
      <p style="margin-top: 0.5rem;">All responses based on official SA Government documents</p>
      <p style="margin-top: 0.5rem; font-size: 0.75rem;">
        <strong>Disclaimer:</strong> This conversation is for guidance purposes.
        Always verify important information with official sources.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return htmlContent;
}

function formatMessageContent(content: string): string {
  // Convert markdown-style formatting to HTML
  let formatted = content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Source citations
    .replace(/\[Source (\d+)\]/g, '<strong style="color: #8b5cf6;">[Source $1]</strong>')
    // Line breaks
    .split('\n').map(line => {
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return `<p style="margin-left: 1.5rem;">• ${line.substring(2)}</p>`;
      }
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return `<p style="margin-left: 1.5rem;">${line}</p>`;
      }
      return `<p>${line}</p>`;
    }).join('');

  return formatted;
}
