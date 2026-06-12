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
  ChatMessage
} from '../../../core/services/chatbot.service';

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
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chatMessages') chatContainer!: ElementRef;

  messages: ChatMessage[] = [];

  userInput = '';
  isTyping = false;
  isLoadingHistory = false;

  // ================= INIT =================
  ngOnInit(): void {
    this.loadChatHistory();
  }

  // ================= LOAD HISTORY =================
  private loadChatHistory(): void {
  this.isLoadingHistory = true;

  this.chatbotService.getChatHistory().subscribe({
    next: (history: ChatMessage[]) => {
      console.log('History loaded:', history);
      this.messages = history ?? [];
      this.isLoadingHistory = false;
      this.scrollToBottom();
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to load chat history:', err);
      this.messages = [];
      this.isLoadingHistory = false;
      this.cdr.detectChanges();
    }
  });
}

  // ================= SAFE DATE CHECK =================
  isInvalidDate(timestamp: any): boolean {
    if (!timestamp) return true;
    const date = new Date(timestamp);
    return isNaN(date.getTime());
  }

  // ================= SEND MESSAGE =================
  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMsg);
    this.userInput = '';

    this.isTyping = true;
    this.scrollToBottom();

    this.chatbotService.analyzeMessage(text).subscribe({
      next: (reply: string) => {
        this.addBotMessage(reply);
        setTimeout(() => {
          this.isTyping = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.addBotMessage('Sorry, something went wrong. Please try again.');
        setTimeout(() => {
          this.isTyping = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ================= BOT MESSAGE =================
  private addBotMessage(text: string): void {
    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'bot',
      timestamp: new Date()
    };

    this.messages.push(botMsg);
    this.scrollToBottom();
  }

  // ================= UI =================
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

  navigateToHome(): void {
    this.router.navigate(['/home-for-patient']);
  }

  trackByMessage(_: number, m: ChatMessage) {
    return m.id;
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}