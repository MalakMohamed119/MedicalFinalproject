// chatbot.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { formatAppError } from '../../shared/utils/error-message.util';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface StoredChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface StoredChatSession {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly chatbotUrl =
    `${environment.chatbotApiUrl}/api/chatbot/analyze`;

  private readonly historyUrl =
    `${environment.chatbotApiUrl}/api/chatbot/history`;

  private readonly legacyStorageKeyPrefix = 'medguid-chat-history';
  private readonly sessionsStorageKeyPrefix = 'medguid-chat-sessions';
  private readonly activeSessionKeyPrefix = 'medguid-chat-active';

  // ================= SESSIONS (localStorage) =================
  loadSessions(userId?: string): ChatSession[] {
    if (typeof window === 'undefined') return [];

    try {
      const raw = localStorage.getItem(this.getSessionsKey(userId));
      let sessions: ChatSession[] = [];

      if (raw) {
        const parsed = JSON.parse(raw) as StoredChatSession[];
        if (Array.isArray(parsed)) {
          sessions = parsed
            .map((item) => this.reviveSession(item))
            .filter((item): item is ChatSession => !!item);
        }
      }

      const legacy = this.loadLegacyHistory(userId);
      if (legacy.length && !sessions.some((s) => s.messages.length > 0)) {
        sessions.unshift(this.createSessionFromMessages(legacy, 'Previous conversation'));
      }

      return this.sortSessions(sessions);
    } catch (err) {
      console.error('Failed to read chat sessions from localStorage:', err);
      return [];
    }
  }

  saveSessions(sessions: ChatSession[], userId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const payload: StoredChatSession[] = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: session.messages.map((message) => ({
          id: message.id,
          text: message.text,
          sender: message.sender,
          timestamp: message.timestamp.toISOString()
        }))
      }));

      localStorage.setItem(this.getSessionsKey(userId), JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save chat sessions to localStorage:', err);
    }
  }

  getActiveSessionId(userId?: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.getActiveSessionKey(userId));
  }

  setActiveSessionId(sessionId: string, userId?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getActiveSessionKey(userId), sessionId);
  }

  createEmptySession(title = 'New chat'): ChatSession {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      title,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  }

  createSessionFromMessages(messages: ChatMessage[], title?: string): ChatSession {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      title: title || this.buildSessionTitle(messages),
      messages,
      createdAt: messages[0]?.timestamp ?? now,
      updatedAt: messages[messages.length - 1]?.timestamp ?? now
    };
  }

  buildSessionTitle(messages: ChatMessage[]): string {
    const firstUser = messages.find((m) => m.sender === 'user');
    if (!firstUser?.text) return 'New chat';

    const trimmed = firstUser.text.trim().replace(/\s+/g, ' ');
    return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
  }

  sessionsFromApiEntries(entries: any[]): ChatSession[] {
    return entries
      .map((entry) => {
        const messages = this.normalizeEntry(entry);
        if (!messages.length) return null;
        return this.createSessionFromMessages(messages);
      })
      .filter((session): session is ChatSession => !!session);
  }

  mergeSessionLists(local: ChatSession[], remote: ChatSession[]): ChatSession[] {
    const bySignature = new Map<string, ChatSession>();

    [...local, ...remote].forEach((session) => {
      const signature = this.sessionSignature(session);
      const existing = bySignature.get(signature);
      if (!existing || session.updatedAt.getTime() > existing.updatedAt.getTime()) {
        bySignature.set(signature, session);
      }
    });

    return this.sortSessions(Array.from(bySignature.values()));
  }

  // Legacy single-thread API (kept for compatibility)
  loadLocalHistory(userId?: string): ChatMessage[] {
    const activeId = this.getActiveSessionId(userId);
    const sessions = this.loadSessions(userId);
    const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
    return active?.messages ?? [];
  }

  saveLocalHistory(messages: ChatMessage[], userId?: string): void {
    const sessions = this.loadSessions(userId);
    const activeId = this.getActiveSessionId(userId) ?? sessions[0]?.id;
    if (!activeId) return;

    const index = sessions.findIndex((s) => s.id === activeId);
    if (index === -1) return;

    const now = new Date();
    sessions[index] = {
      ...sessions[index],
      messages,
      title: sessions[index].title === 'New chat'
        ? this.buildSessionTitle(messages)
        : sessions[index].title,
      updatedAt: now
    };

    this.saveSessions(sessions, userId);
  }

  mergeHistories(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
    const byId = new Map<string, ChatMessage>();
    [...local, ...remote].forEach((message) => byId.set(message.id, message));
    return Array.from(byId.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  private loadLegacyHistory(userId?: string): ChatMessage[] {
    if (typeof window === 'undefined') return [];

    try {
      const raw = localStorage.getItem(this.getLegacyKey(userId));
      if (!raw) return [];

      const parsed = JSON.parse(raw) as StoredChatMessage[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => this.reviveMessage(item))
        .filter((item): item is ChatMessage => !!item);
    } catch {
      return [];
    }
  }

  private sessionSignature(session: ChatSession): string {
    const first = session.messages[0];
    const last = session.messages[session.messages.length - 1];
    return `${first?.text ?? ''}|${last?.text ?? ''}|${session.messages.length}`;
  }

  private sortSessions(sessions: ChatSession[]): ChatSession[] {
    return [...sessions].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  private getLegacyKey(userId?: string): string {
    const resolvedUserId = userId || this.authService.getCurrentUserId() || 'guest';
    return `${this.legacyStorageKeyPrefix}:${resolvedUserId}`;
  }

  private getSessionsKey(userId?: string): string {
    const resolvedUserId = userId || this.authService.getCurrentUserId() || 'guest';
    return `${this.sessionsStorageKeyPrefix}:${resolvedUserId}`;
  }

  private getActiveSessionKey(userId?: string): string {
    const resolvedUserId = userId || this.authService.getCurrentUserId() || 'guest';
    return `${this.activeSessionKeyPrefix}:${resolvedUserId}`;
  }

  private reviveMessage(item: StoredChatMessage): ChatMessage | null {
    if (!item?.id || !item?.text || !item?.sender) return null;

    const timestamp = new Date(item.timestamp);
    return {
      id: item.id,
      text: item.text,
      sender: item.sender,
      timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp
    };
  }

  private reviveSession(item: StoredChatSession): ChatSession | null {
    if (!item?.id) return null;

    const createdAt = new Date(item.createdAt);
    const updatedAt = new Date(item.updatedAt);
    const messages = (item.messages ?? [])
      .map((message) => this.reviveMessage(message))
      .filter((message): message is ChatMessage => !!message);

    return {
      id: item.id,
      title: item.title || 'New chat',
      messages,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt
    };
  }

  // ================= CHAT RESPONSE =================
  analyzeMessage(symptoms: string): Observable<string> {
    return this.http.post(
      this.chatbotUrl,
      { symptoms },
      { responseType: 'text' }
    ).pipe(
      map(res => res as string),
      catchError(err => {
        console.error('Analyze message error:', err);
        return throwError(() => new Error(
          formatAppError(err, 'We could not analyze your message right now. Please try again.')
        ));
      })
    );
  }

  // ================= CHAT HISTORY (API) =================
  getChatHistory(): Observable<ChatMessage[]> {
    return this.http.get<any[]>(this.historyUrl).pipe(
      map(response => {
        const rawMessages = Array.isArray(response) ? response : [];
        return rawMessages.flatMap((entry: any) => this.normalizeEntry(entry));
      }),
      catchError(err => {
        console.error('History fetch error:', err);
        const local = this.loadLocalHistory();
        if (local.length) {
          return of(local);
        }
        return throwError(() => new Error(
          formatAppError(err, 'Could not load your chat history. Please try again.')
        ));
      })
    );
  }

  getApiSessions(): Observable<ChatSession[]> {
    return this.http.get<any[]>(this.historyUrl).pipe(
      map(response => {
        const entries = Array.isArray(response) ? response : [];
        return this.sessionsFromApiEntries(entries);
      }),
      catchError(() => of([]))
    );
  }

  private normalizeEntry(entry: any): ChatMessage[] {
    if (!entry) return [];

    const safeDate = (value: any): Date => {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const createdAt = safeDate(entry.createdAt ?? entry.CreatedAt);
    const result: ChatMessage[] = [];

    if (entry.symptoms ?? entry.Symptoms) {
      result.push({
        id: `${entry.id ?? entry.Id ?? crypto.randomUUID()}-user`,
        text: entry.symptoms ?? entry.Symptoms,
        sender: 'user',
        timestamp: createdAt
      });
    }

    if (entry.aiResponse ?? entry.AIResponse) {
      result.push({
        id: `${entry.id ?? entry.Id ?? crypto.randomUUID()}-bot`,
        text: entry.aiResponse ?? entry.AIResponse,
        sender: 'bot',
        timestamp: createdAt
      });
    }

    return result;
  }
}
