// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError } from 'rxjs/operators';
// import { environment } from '../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class ChatbotService {
//   private readonly chatbotUrl = `${environment.chatbotApiUrl}/api/chatbot/analyze`;
//   private readonly historyUrl = `${environment.chatbotApiUrl}/api/chatbot/history`;

//   constructor(private http: HttpClient) {}

//   analyzeMessage(symptoms: string): Observable<any> {
//     return this.http.post(this.chatbotUrl, { symptoms }, { responseType: 'text' });
//   }

//   getChatHistory(): Observable<any> {
//     console.log('Fetching chat history from:', this.historyUrl);
//     return this.http.get(this.historyUrl).pipe(
//       catchError((error) => {
//         console.error('Chat history endpoint error:', error.status, error.message);
//         if (error.status === 404) {
//           console.warn('Chat history endpoint not found. Backend may not have implemented /api/chatbot/history yet.');
//         }
//         return throwError(() => error);
//       })
//     );
//   }
// }




import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date | string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: Date | string;
  userSymptom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private http = inject(HttpClient);

  private readonly chatbotUrl = `${environment.chatbotApiUrl}/api/chatbot/analyze`;
  private readonly historyUrl = `${environment.chatbotApiUrl}/api/chatbot/history`;

  analyzeMessage(symptoms: string): Observable<string> {
    return this.http.post<any>(this.chatbotUrl, { symptoms }).pipe(
      map(response => {
        if (typeof response === 'string') return response;
        return response?.response || response?.message || response?.answer || response?.analysis || JSON.stringify(response);
      }),
      catchError((error) => {
        console.error('Error in analyzeMessage endpoint:', error);
        return throwError(() => error);
      })
    );
  }

  getChatHistory(): Observable<ChatSession[]> {
    return this.http.get<any>(this.historyUrl).pipe(
      map(response => {
        let rawChats: any[] = [];
        
        if (Array.isArray(response)) {
          rawChats = response;
        } else if (response?.data && Array.isArray(response.data)) {
          rawChats = response.data;
        } else if (response?.chats && Array.isArray(response.chats)) {
          rawChats = response.chats;
        }

        return rawChats.map(chat => ({
          id: chat.id?.toString() || Date.now().toString(),
          title: chat.title || chat.keyword || this.extractTitleFromText(chat.text || chat.userSymptom || ''),
          messages: Array.isArray(chat.messages) ? chat.messages.map((m: any) => ({
            id: m.id || Date.now().toString(),
            text: m.text || m.content || '',
            sender: m.sender || (m.type === 'user' ? 'user' : 'bot'),
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          })) : [],
          timestamp: chat.timestamp ? new Date(chat.timestamp) : new Date(),
          userSymptom: chat.userSymptom || chat.text || ''
        }));
      }),
      catchError((error) => {
        console.error('Chat history endpoint error:', error);
        return throwError(() => error);
      })
    );
  }

  private extractTitleFromText(text: string): string {
    if (!text) return 'Chat';
    const symptoms = [
      'headache', 'fever', 'cough', 'cold', 'flu', 'pain', 'fatigue', 'nausea', 'vomit',
      'diarrhea', 'rash', 'itching', 'swelling', 'sore throat', 'chest pain', 'migraine'
    ];
    const textLower = text.toLowerCase();
    const found = symptoms.find(s => textLower.includes(s));
    if (found) return found.charAt(0).toUpperCase() + found.slice(1);
    
    return text.length > 25 ? text.substring(0, 25) + '...' : text;
  }
}