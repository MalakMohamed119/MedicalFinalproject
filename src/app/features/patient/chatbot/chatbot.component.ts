// chatbot.component.ts
import {
  Component,
  OnInit,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ChatbotService,
  ChatMessage,
  ChatSession
} from '../../../core/services/chatbot.service';
import { AuthService } from '../../../core/services/auth.service';
import { formatAppError } from '../../../shared/utils/error-message.util';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit {

  private router = inject(Router);
  private chatbotService = inject(ChatbotService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chatMessages') chatContainer!: ElementRef;

  sessions: ChatSession[] = [];
  activeSessionId = '';
  messages: ChatMessage[] = [];

  userInput = '';
  isTyping = false;
  isLoadingHistory = false;
  historyNotice = '';
  sendError = '';
  sidebarOpen = false;

  private userId = '';

  ngOnInit(): void {
    this.userId = this.authService.getCurrentUserId();
    this.loadChatHistory();
  }

  get activeSession(): ChatSession | undefined {
    return this.sessions.find((s) => s.id === this.activeSessionId);
  }

  private loadChatHistory(): void {
    this.isLoadingHistory = true;
    this.historyNotice = '';
    this.sendError = '';

    let sessions = this.chatbotService.loadSessions(this.userId);

    if (!sessions.length) {
      const starter = this.chatbotService.createEmptySession();
      sessions = [starter];
      this.chatbotService.saveSessions(sessions, this.userId);
      this.chatbotService.setActiveSessionId(starter.id, this.userId);
    }

    this.sessions = sessions;
    this.activeSessionId =
      this.chatbotService.getActiveSessionId(this.userId) ?? sessions[0].id;

    this.loadActiveSessionMessages();
    this.isLoadingHistory = false;
    this.scrollToBottom();
    this.cdr.detectChanges();

    this.chatbotService.getApiSessions().subscribe({
      next: (apiSessions) => {
        if (!apiSessions.length) return;

        const merged = this.chatbotService.mergeSessionLists(this.sessions, apiSessions);
        if (merged.length > this.sessions.length) {
          this.sessions = merged;
          this.chatbotService.saveSessions(this.sessions, this.userId);
          this.historyNotice = 'Synced additional chats from your account.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  startNewChat(): void {
    this.persistActiveSession();
    const session = this.chatbotService.createEmptySession();
    this.sessions = [session, ...this.sessions];
    this.activeSessionId = session.id;
    this.messages = [];
    this.userInput = '';
    this.sendError = '';
    this.historyNotice = '';
    this.chatbotService.setActiveSessionId(session.id, this.userId);
    this.chatbotService.saveSessions(this.sessions, this.userId);
    this.sidebarOpen = false;
    this.cdr.detectChanges();
  }

  selectSession(sessionId: string): void {
    if (sessionId === this.activeSessionId || this.isTyping) return;

    this.persistActiveSession();
    this.activeSessionId = sessionId;
    this.chatbotService.setActiveSessionId(sessionId, this.userId);
    this.loadActiveSessionMessages();
    this.sendError = '';
    this.sidebarOpen = false;
    this.scrollToBottom();
    this.cdr.detectChanges();
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    if (this.isTyping) return;

    const remaining = this.sessions.filter((s) => s.id !== sessionId);
    if (!remaining.length) {
      const fresh = this.chatbotService.createEmptySession();
      this.sessions = [fresh];
      this.activeSessionId = fresh.id;
      this.messages = [];
    } else {
      this.sessions = remaining;
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = remaining[0].id;
        this.loadActiveSessionMessages();
      }
    }

    this.chatbotService.setActiveSessionId(this.activeSessionId, this.userId);
    this.chatbotService.saveSessions(this.sessions, this.userId);
    this.cdr.detectChanges();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  dismissHistoryNotice(): void {
    this.historyNotice = '';
  }

  dismissSendError(): void {
    this.sendError = '';
  }

  isInvalidDate(timestamp: any): boolean {
    if (!timestamp) return true;
    const date = new Date(timestamp);
    return isNaN(date.getTime());
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.sendError = '';

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMsg);
    this.persistActiveSession();
    this.userInput = '';

    this.isTyping = true;
    this.scrollToBottom();

    this.chatbotService.analyzeMessage(text).subscribe({
      next: (reply: string) => {
        this.addBotMessage(reply);
        this.isTyping = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.sendError = formatAppError(
          err,
          'Sorry, we could not get a response right now. Please try again.'
        );
        this.addBotMessage('I was not able to respond just now. Please try again in a moment.');
        this.isTyping = false;
        this.cdr.detectChanges();
      }
    });
  }

  private addBotMessage(text: string): void {
    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'bot',
      timestamp: new Date()
    };

    this.messages.push(botMsg);
    this.persistActiveSession();
    this.scrollToBottom();
  }

  private loadActiveSessionMessages(): void {
    const session = this.sessions.find((s) => s.id === this.activeSessionId);
    this.messages = session ? [...session.messages] : [];
  }

  private persistActiveSession(): void {
    const index = this.sessions.findIndex((s) => s.id === this.activeSessionId);
    if (index === -1) return;

    const now = new Date();
    const title = this.messages.length
      ? this.chatbotService.buildSessionTitle(this.messages)
      : 'New chat';

    this.sessions[index] = {
      ...this.sessions[index],
      messages: [...this.messages],
      title: this.sessions[index].title === 'New chat' ? title : this.sessions[index].title,
      updatedAt: now
    };

    this.sessions = [...this.sessions].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    this.chatbotService.saveSessions(this.sessions, this.userId);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  useSuggestion(text: string): void {
    if (this.isTyping) return;
    this.userInput = text;
    this.sendMessage();
  }

  navigateToHome(): void {
    this.router.navigate(['/home-for-patient']);
  }

  trackByMessage(_: number, m: ChatMessage) {
    return m.id;
  }

  trackBySession(_: number, s: ChatSession) {
    return s.id;
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatSessionDate(timestamp: Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (sameDay) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
