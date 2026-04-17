/**
 * React hook wrappers for Horus SDK
 * These provide the same interface as the original useEnterpriseRAG / useAgenticRAG hooks
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ChatMessage, ConversationContext, QueryAnalytics } from "@careercraft/shared";
import type { AgenticRAGOptions } from "./types";
import { HorusClient } from "./client";
import { ChatSession } from "./chat";
import { AgenticSession } from "./agentic";

export interface UseHorusChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  rateMessage: (messageId: string, rating: "helpful" | "not-helpful") => void;
  clearChat: () => void;
  context: ConversationContext;
  analytics: QueryAnalytics;
  isStreaming: boolean;
}

export function useHorusChat(
  client: HorusClient,
  focusArea: string = 'careers'
): UseHorusChatReturn {
  const sessionRef = useRef<ChatSession | null>(null);

  // Create session once (or when focusArea changes)
  if (!sessionRef.current || sessionRef.current !== sessionRef.current) {
    sessionRef.current = client.createChatSession(focusArea);
  }

  const session = sessionRef.current;

  const [state, setState] = useState(() => session.getState());

  useEffect(() => {
    const newSession = client.createChatSession(focusArea);
    sessionRef.current = newSession;
    setState(newSession.getState());

    const unsubscribe = newSession.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [client, focusArea]);

  const sendMessage = useCallback(async (content: string) => {
    await sessionRef.current?.sendMessage(content);
  }, []);

  const rateMessage = useCallback((messageId: string, rating: "helpful" | "not-helpful") => {
    sessionRef.current?.rateMessage(messageId, rating);
  }, []);

  const clearChat = useCallback(() => {
    sessionRef.current?.clearChat();
  }, []);

  return {
    messages: state.messages,
    sendMessage,
    rateMessage,
    clearChat,
    context: state.context,
    analytics: state.analytics,
    isStreaming: state.isStreaming,
  };
}

export interface UseHorusAgenticReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  rateMessage: (messageId: string, rating: "helpful" | "not-helpful") => void;
  clearChat: () => void;
  context: ConversationContext;
  analytics: QueryAnalytics;
  isStreaming: boolean;
}

export function useHorusAgentic(
  client: HorusClient,
  focusArea: string = 'careers',
  options?: AgenticRAGOptions
): UseHorusAgenticReturn {
  const sessionRef = useRef<AgenticSession | null>(null);
  const optionsKey = JSON.stringify(options || {});

  const [state, setState] = useState(() => {
    const newSession = client.createAgenticSession(focusArea, options);
    sessionRef.current = newSession;
    return newSession.getState();
  });

  useEffect(() => {
    const newSession = client.createAgenticSession(focusArea, options);
    sessionRef.current = newSession;
    setState(newSession.getState());

    const unsubscribe = newSession.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [client, focusArea, optionsKey]);

  const sendMessage = useCallback(async (content: string) => {
    await sessionRef.current?.sendMessage(content);
  }, []);

  const rateMessage = useCallback((messageId: string, rating: "helpful" | "not-helpful") => {
    sessionRef.current?.rateMessage(messageId, rating);
  }, []);

  const clearChat = useCallback(() => {
    sessionRef.current?.clearChat();
  }, []);

  return {
    messages: state.messages,
    sendMessage,
    rateMessage,
    clearChat,
    context: state.context,
    analytics: state.analytics,
    isStreaming: state.isStreaming,
  };
}
