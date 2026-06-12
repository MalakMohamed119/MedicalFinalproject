// chatbot.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {

  private http = inject(HttpClient);

  private readonly chatbotUrl =
    `${environment.chatbotApiUrl}/api/chatbot/analyze`;

  private readonly historyUrl =
    `${environment.chatbotApiUrl}/api/chatbot/history`;

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
        return throwError(() => new Error('Failed to analyze message'));
      })
    );
  }

  // ================= CHAT HISTORY (single chat) =================
  getChatHistory(): Observable<ChatMessage[]> {
    return this.http.get<any[]>(this.historyUrl).pipe(
      map(response => {
        const rawMessages = Array.isArray(response) ? response : [];
        return rawMessages.flatMap((entry: any) => this.normalizeEntry(entry));
      }),
      catchError(err => {
        console.error('History fetch error:', err);
        return throwError(() => new Error('Failed to load chat history'));
      })
    );
  }

  // ================= NORMALIZER =================
  // Each backend entry (ChatMessageDto) becomes two messages: user + bot
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