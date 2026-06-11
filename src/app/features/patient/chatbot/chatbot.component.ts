// import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ChatbotService } from '../../../core/services/chatbot.service';

// interface Message {
//   id: string;
//   text: string;
//   sender: 'user' | 'bot';
//   timestamp: Date;
// }

// @Component({
//   selector: 'app-chatbot',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './chatbot.component.html',
//   styleUrls: ['./chatbot.component.scss']
// })
// export class ChatbotComponent implements OnInit {
//   private router = inject(Router);
//   private chatbotService = inject(ChatbotService);
//   private cdr = inject(ChangeDetectorRef);
//   messages: Message[] = [];
//   recentChats: any[] = [];
//   userInput: string = '';
//   isTyping: boolean = false;
//   showHistory: boolean = false;
//   isLoadingHistory: boolean = false;

//   ngOnInit(): void {
//     // Load chat history from API
//     this.loadChatHistory();
//     // Add welcome message
//     this.addBotMessage('Hello! I\'m your medical assistant. Please tell me about your symptoms so I can help you find the right solution.');
//   }

//   private loadChatHistory(): void {
//     this.isLoadingHistory = true;
//     this.chatbotService.getChatHistory().subscribe({
//       next: (response) => {
//         console.log('Chat history loaded successfully:', response);
//         this.isLoadingHistory = false;
//         // Handle both array and object responses
//         if (Array.isArray(response)) {
//           this.recentChats = response;
//         } else if (response?.data && Array.isArray(response.data)) {
//           this.recentChats = response.data;
//         } else if (response?.chats && Array.isArray(response.chats)) {
//           this.recentChats = response.chats;
//         } else {
//           this.recentChats = [];
//         }
//         this.cdr.detectChanges();
//       },
//       error: (error) => {
//         console.error('Error loading chat history:', error.status, error.message);
//         if (error.status === 404) {
//           console.warn('Chat history endpoint not available. Showing empty history.');
//           console.info('Backend endpoint: GET http://localhost:8082/api/chatbot/history');
//           console.info('Expected response format: Array of chat objects or {data: [...]} or {chats: [...]}');
//         }
//         this.isLoadingHistory = false;
//         this.recentChats = [];
//         this.cdr.detectChanges();
//       }
//     });
//   }

//   sendMessage(): void {
//     if (!this.userInput.trim()) return;

//     const userMessage: Message = {
//       id: Date.now().toString(),
//       text: this.userInput.trim(),
//       sender: 'user',
//       timestamp: new Date()
//     };

//     this.messages.push(userMessage);
//     const inputText = this.userInput.trim();
//     this.userInput = '';
    
//     // Trigger change detection immediately to show user message
//     this.cdr.detectChanges();
//     this.scrollToBottom();

//     // Show typing indicator
//     this.isTyping = true;

//     // Call AI API
//     console.log('Sending to chatbot API:', inputText);
//     this.chatbotService.analyzeMessage(inputText).subscribe({
//       next: (response) => {
//         console.log('Chatbot API response:', response);
//         this.isTyping = false;
//         // Handle both plain text and JSON responses
//         let botResponse: string;
//         if (typeof response === 'string') {
//           botResponse = response;
//         } else {
//           botResponse = response?.response || response?.message || response?.answer || response?.analysis || JSON.stringify(response);
//         }
//         this.addBotMessage(botResponse);
//       },
//       error: (error) => {
//         console.error('Error calling chatbot API:', error);
//         this.isTyping = false;
//         const errorMessage = error?.error?.message || error?.message || 'I apologize, but I\'m experiencing technical difficulties. Please try again later.';
//         this.addBotMessage(errorMessage);
//       }
//     });
//   }

//   private addBotMessage(text: string): void {
//     const botMessage: Message = {
//       id: Date.now().toString(),
//       text: text,
//       sender: 'bot',
//       timestamp: new Date()
//     };
//     this.messages.push(botMessage);
//     this.cdr.detectChanges();
//     this.scrollToBottom();
    
//     // After bot responds, add current chat to recents
//     this.addCurrentChatToRecents();
//   }

//   private addCurrentChatToRecents(): void {
//     if (this.messages.length === 0) return;

//     // Find the first user message for the title
//     const firstUserMsg = this.messages.find(m => m.sender === 'user');
//     if (!firstUserMsg) return;

//     const chatTitle = this.extractSymptoms(firstUserMsg.text);
//     const chatId = Date.now().toString();

//     const newChat = {
//       id: chatId,
//       title: chatTitle,
//       text: firstUserMsg.text,
//       messages: [...this.messages],
//       timestamp: new Date(),
//       userSymptom: firstUserMsg.text
//     };

//     // Add to the beginning of recent chats if not already there
//     const chatExists = this.recentChats.some(c => c.id === chatId);
//     if (!chatExists) {
//       this.recentChats.unshift(newChat);
//       // Keep only the last 10 chats
//       if (this.recentChats.length > 10) {
//         this.recentChats.pop();
//       }
//       this.cdr.detectChanges();
//     }
//   }

//   formatTime(timestamp: Date): string {
//     return timestamp.toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   }

//   scrollToBottom(): void {
//     setTimeout(() => {
//       const chatContainer = document.querySelector('.chat-messages');
//       if (chatContainer) {
//         chatContainer.scrollTop = chatContainer.scrollHeight;
//       }
//     }, 100);
//   }

//   onEnterKey(event: KeyboardEvent): void {
//     if (event.key === 'Enter' && !event.shiftKey) {
//       event.preventDefault();
//       this.sendMessage();
//     }
//   }

//   trackByMessage(index: number, message: Message): string {
//     return message.id;
//   }

//   trackByChat(index: number, chat: any): string {
//     return chat.id || index.toString();
//   }

//   navigateToHome(): void {
//     this.router.navigate(['/home-for-patient']);
//   }

//   toggleHistory(): void {
//     this.showHistory = !this.showHistory;
//   }

//   startNewChat(): void {
//     this.messages = [];
//     this.userInput = '';
//     this.showHistory = false;
//     // Reload history to show any newly added chats
//     this.loadChatHistory();
//     // Add welcome message
//     this.addBotMessage('Hello! I\'m your medical assistant. Please tell me about your symptoms so I can help you find the right solution.');
//   }

  
//   loadChat(chatItem: any): void {
//     console.log('Loading chat:', chatItem);
    
//     // Load full chat history item if it has messages
//     if (chatItem.messages && Array.isArray(chatItem.messages) && chatItem.messages.length > 0) {
//       this.messages = chatItem.messages.map((msg: any) => ({
//         id: msg.id || Date.now().toString(),
//         text: msg.text || msg.content || '',
//         sender: msg.sender || (msg.type === 'user' ? 'user' : 'bot'),
//         timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
//       }));
//     } else if (chatItem.text || chatItem.content) {
//       // Single message chat - display as user message
//       const displayText = chatItem.text || chatItem.content;
//       this.messages = [{
//         id: chatItem.id || Date.now().toString(),
//         text: displayText,
//         sender: 'user',
//         timestamp: chatItem.timestamp ? new Date(chatItem.timestamp) : new Date()
//       }];
//     } else {
//       console.warn('Chat item has no messages or text:', chatItem);
//       this.messages = [];
//     }
    
//     this.cdr.detectChanges();
//     this.scrollToBottom();
//   }

//   searchChats(): void {
//     this.addBotMessage('Search functionality is coming soon! You\'ll be able to search through your chat history.');
//   }

//   getChatTitle(chat: any): string {
//     // If chat has a title field (created by us), use it
//     if (chat.title) {
//       return chat.title;
//     }

//     // If chat has userSymptom field, use it
//     if (chat.userSymptom) {
//       const symptoms = this.extractSymptoms(chat.userSymptom);
//       if (symptoms !== 'Chat') {
//         return symptoms;
//       }
//     }

//     // If chat has keyword field, use it
//     if (chat.keyword) {
//       return chat.keyword;
//     }

//     // Look for first user message in messages array
//     if (chat.messages && Array.isArray(chat.messages)) {
//       const userMessage = chat.messages.find((msg: any) => msg.sender === 'user');
//       if (userMessage) {
//         const symptoms = this.extractSymptoms(userMessage.text);
//         if (symptoms !== 'Chat') {
//           return symptoms;
//         }
//       }
//     }

//     // Extract symptoms from chat text
//     const text = chat.text || chat.content || '';
//     if (text && text.length > 0) {
//       const symptoms = this.extractSymptoms(text);
//       if (symptoms !== 'Chat') {
//         return symptoms;
//       }
//       // If no symptoms found, show truncated text
//       return text.length > 40 ? text.substring(0, 40) + '...' : text;
//     }

//     return 'Chat';
//   }

//   private extractSymptoms(text: string): string {
//     // Common medical symptoms and keywords to look for
//     const symptomKeywords = [
//       'headache', 'headaches', 'dizziness', 'dizzy', 'fever', 'cough', 'coughing',
//       'cold', 'flu', 'pain', 'ache', 'fatigue', 'tired', 'nausea', 'vomit',
//       'diarrhea', 'constipation', 'rash', 'itching', 'swelling', 'bleeding',
//       'sore', 'throat', 'chest', 'back', 'stomach', 'belly', 'joint', 'muscle',
//       'weakness', 'shortness of breath', 'breathing', 'anxiety', 'depression',
//       'insomnia', 'sleep', 'allergy', 'allergies', 'asthma', 'diabetes', 'blood pressure',
//       'cholesterol', 'weight', 'indigestion', 'heartburn', 'acid reflux', 'migraine'
//     ];

//     if (!text || text.trim().length === 0) {
//       return 'Chat';
//     }

//     const textLower = text.toLowerCase();
//     const foundSymptoms: string[] = [];

//     // Find symptoms in the text (prioritize multi-word symptoms first)
//     const sortedKeywords = symptomKeywords.sort((a, b) => b.length - a.length);
    
//     for (const symptom of sortedKeywords) {
//       if (textLower.includes(symptom) && !foundSymptoms.find(s => s.toLowerCase().includes(symptom) || symptom.includes(s.toLowerCase()))) {
//         foundSymptoms.push(symptom.charAt(0).toUpperCase() + symptom.slice(1));
//         if (foundSymptoms.length >= 2) break;
//       }
//     }

//     if (foundSymptoms.length > 0) {
//       return foundSymptoms.join(', ');
//     }

//     // If no known symptoms found, extract meaningful words
//     const words = text
//       .split(/[\s,;.!?\-()]+/)
//       .filter(w => w.length > 3 && !['have', 'with', 'from', 'that', 'this', 'does', 'what', 'help', 'tell', 'please', 'could', 'would', 'should', 'about', 'think', 'feeling', 'having', 'feel'].includes(w.toLowerCase()))
//       .slice(0, 3);

//     if (words.length > 0) {
//       return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ');
//     }

//     return 'Chat';
//   }
// }



import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService, ChatSession, ChatMessage } from '../../../core/services/chatbot.service';

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

  @ViewChild('chatMessages') private chatContainer!: ElementRef;

  messages: ChatMessage[] = [];
  recentChats: ChatSession[] = [];
  userInput: string = '';
  isTyping: boolean = false;
  showHistory: boolean = false;
  isLoadingHistory: boolean = false;
  
  currentChatSessionId: string | null = null;

  ngOnInit(): void {
    // 1. Recover active unique session ID across component loads
    this.currentChatSessionId = this.getSessionItem('active_chat_session_id');
    
    // 2. Load sidebar recents trace
    this.loadChatHistory();

    // 3. Rehydrate messages or create initial welcome screen
    const savedActiveMessages = this.getSessionItem('active_chat_messages');
    if (savedActiveMessages && this.currentChatSessionId) {
      this.messages = JSON.parse(savedActiveMessages);
      this.scrollToBottom();
    } else {
      this.sendInitialGreeting();
    }
  }

  private sendInitialGreeting(): void {
    this.messages = [{
      id: 'welcome',
      text: "Hello! I'm your medical assistant. Please tell me about your symptoms so I can help you find the right solution.",
      sender: 'bot',
      timestamp: new Date()
    }];
    this.scrollToBottom();
  }

  private loadChatHistory(): void {
    this.isLoadingHistory = true;
    this.chatbotService.getChatHistory().subscribe({
      next: (normalizedHistory) => {
        this.recentChats = normalizedHistory;
        this.isLoadingHistory = false;
      },
      error: (error) => {
        console.error('Failed to load chat history:', error);
        this.isLoadingHistory = false;
        this.recentChats = [];
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const inputText = this.userInput.trim();
    
    // Initialize session identity on very first message match
    if (!this.currentChatSessionId) {
      this.currentChatSessionId = 'session_' + Date.now().toString();
      this.setSessionItem('active_chat_session_id', this.currentChatSessionId);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.userInput = '';
    this.saveCurrentSessionState();
    this.scrollToBottom();
    this.isTyping = true;

    this.chatbotService.analyzeMessage(inputText).subscribe({
      next: (botResponse) => {
        this.isTyping = false;
        this.addBotMessage(botResponse);
      },
      error: (error) => {
        this.isTyping = false;
        console.error('Error calling chatbot API:', error);
        const errorString = error?.error?.message || error?.message || "I apologize, but I'm experiencing technical difficulties. Please try again later.";
        this.addBotMessage(errorString);
      }
    });
  }

  private addBotMessage(text: string): void {
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'bot',
      timestamp: new Date()
    };
    this.messages.push(botMessage);
    this.saveCurrentSessionState();
    this.scrollToBottom();
    this.updateRecentChatsSidebar();
  }

  private saveCurrentSessionState(): void {
    this.setSessionItem('active_chat_messages', JSON.stringify(this.messages));
  }

  private updateRecentChatsSidebar(): void {
    if (this.messages.length === 0 || !this.currentChatSessionId) return;

    const firstUserMsg = this.messages.find(m => m.sender === 'user');
    if (!firstUserMsg) return;

    const existingChatIndex = this.recentChats.findIndex(c => c.id === this.currentChatSessionId);
    
    // Maintain title stability across live typing turns
    const computedTitle = existingChatIndex > -1 
      ? this.recentChats[existingChatIndex].title 
      : this.extractSymptoms(firstUserMsg.text);

    const sessionPayload: ChatSession = {
      id: this.currentChatSessionId,
      title: computedTitle,
      messages: [...this.messages],
      timestamp: new Date(),
      userSymptom: firstUserMsg.text
    };

    if (existingChatIndex > -1) {
      this.recentChats[existingChatIndex] = sessionPayload;
    } else {
      this.recentChats.unshift(sessionPayload);
      if (this.recentChats.length > 10) {
        this.recentChats.pop();
      }
    }
  }

  loadChat(chatItem: ChatSession): void {
    this.currentChatSessionId = chatItem.id;
    this.setSessionItem('active_chat_session_id', this.currentChatSessionId);
    
    this.messages = [...chatItem.messages];
    this.saveCurrentSessionState();
    this.scrollToBottom();
  }

  startNewChat(): void {
    this.removeSessionItem('active_chat_session_id');
    this.removeSessionItem('active_chat_messages');
    this.currentChatSessionId = null;
    
    this.userInput = '';
    this.showHistory = false;
    this.loadChatHistory();
    this.sendInitialGreeting();
  }

  formatTime(timestamp: Date | string): string {
    const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer?.nativeElement) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return message.id;
  }

  trackByChat(index: number, chat: ChatSession): string {
    return chat.id;
  }

  navigateToHome(): void {
    this.router.navigate(['/home-for-patient']);
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  searchChats(): void {
    const notice = "Search functionality is coming soon! You'll be able to search through your chat history.";
    this.messages.push({ id: 'search_tip', text: notice, sender: 'bot', timestamp: new Date() });
    this.scrollToBottom();
  }

  private extractSymptoms(text: string): string {
    const symptomKeywords = [
      'headache', 'headaches', 'dizziness', 'dizzy', 'fever', 'cough', 'coughing',
      'cold', 'flu', 'pain', 'ache', 'fatigue', 'tired', 'nausea', 'vomit',
      'diarrhea', 'constipation', 'rash', 'itching', 'swelling', 'bleeding',
      'sore', 'throat', 'chest', 'back', 'stomach', 'belly', 'joint', 'muscle',
      'weakness', 'breathing', 'anxiety', 'depression', 'insomnia', 'migraine'
    ];

    if (!text || text.trim().length === 0) return 'Chat';

    const textLower = text.toLowerCase();
    const foundSymptoms: string[] = [];
    const sortedKeywords = symptomKeywords.sort((a, b) => b.length - a.length);
    
    for (const symptom of sortedKeywords) {
      if (textLower.includes(symptom)) {
        foundSymptoms.push(symptom.charAt(0).toUpperCase() + symptom.slice(1));
        if (foundSymptoms.length >= 2) break;
      }
    }

    if (foundSymptoms.length > 0) return foundSymptoms.join(', ');

    const words = text
      .split(/[\s,;.!?\-()]+/)
      .filter(w => w.length > 3 && !['have', 'with', 'from', 'that', 'this', 'does', 'help'].includes(w.toLowerCase()))
      .slice(0, 2);

    if (words.length > 0) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ');
    }

    return 'Chat';
  }

  private getSessionItem(key: string): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
  }

  private setSessionItem(key: string, value: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  }

  private removeSessionItem(key: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  }
}
