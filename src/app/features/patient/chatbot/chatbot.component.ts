import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit {
  private router = inject(Router);
  messages: Message[] = [];
  userInput: string = '';
  isTyping: boolean = false;
  showHistory: boolean = false;

  ngOnInit(): void {
    // Add welcome message
    this.addBotMessage('Hello! I\'m your medical assistant. How can I help you today? You can ask me about:\n\n• Booking appointments\n• Finding clinics\n• Medical services\n• General health questions\n• And much more!');
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: this.userInput.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const inputText = this.userInput.trim();
    this.userInput = '';

    // Show typing indicator
    this.isTyping = true;

    // Simulate bot response
    setTimeout(() => {
      this.generateBotResponse(inputText);
      this.isTyping = false;
    }, 1000 + Math.random() * 1000);
  }

  private generateBotResponse(userInput: string): void {
    const input = userInput.toLowerCase();
    let response = '';

    if (input.includes('appointment') || input.includes('book')) {
      response = 'I can help you book an appointment! You can browse available clinics on the home page and click "Book visit" on any clinic that interests you. Would you like me to show you the available clinics?';
    } else if (input.includes('clinic') || input.includes('doctor')) {
      response = 'I can help you find the right clinic! We have many specialized medical centers available. You can search by specialty, location, or doctor name on the home page. What type of medical service are you looking for?';
    } else if (input.includes('symptom') || input.includes('pain') || input.includes('sick')) {
      response = 'I understand you\'re not feeling well. While I\'m not a substitute for professional medical advice, I can help you find appropriate specialists. Could you tell me more about your symptoms so I can suggest the right type of doctor?';
    } else if (input.includes('medicine') || input.includes('medication')) {
      response = 'For medication questions, I recommend speaking with a licensed pharmacist or your doctor. However, I can help you book an appointment with a pharmacist or find clinics with pharmacy services. Would that be helpful?';
    } else if (input.includes('emergency') || input.includes('urgent')) {
      response = 'If this is a medical emergency, please call emergency services immediately (911 or your local emergency number). For non-urgent medical concerns, I can help you find clinics with same-day appointments or urgent care services.';
    } else if (input.includes('insurance') || input.includes('payment')) {
      response = 'I can help with payment and insurance questions! Most of our partner clinics accept various insurance plans. You can check specific payment options when viewing clinic details, or I can help you find clinics that accept your insurance. What insurance plan do you have?';
    } else if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      response = 'Hello! It\'s great to hear from you. How can I assist you with your healthcare needs today?';
    } else if (input.includes('help')) {
      response = 'I\'m here to help! You can ask me about:\n\n🏥 Booking appointments\n🏥 Finding clinics or doctors\n💊 General health information\n💳 Payment and insurance\n📍 Clinic locations and hours\n\nWhat would you like to know?';
    } else {
      response = 'I understand you\'re asking about: "' + userInput + '". Let me help you with that. You can browse our clinics on the home page, check your appointments, or ask me more specific questions about booking or medical services. How else can I assist you?';
    }

    this.addBotMessage(response);
  }

  private addBotMessage(text: string): void {
    const botMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'bot',
      timestamp: new Date()
    };
    this.messages.push(botMessage);
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }

  navigateToHome(): void {
    this.router.navigate(['/home-for-patient']);
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  startNewChat(): void {
    this.messages = [];
    this.userInput = '';
    this.showHistory = false;
  }

  
  loadChat(message: Message): void {
    // In a real app, this would load the full chat history
    // For now, just show a message that this feature is coming soon
    this.addBotMessage(`Loading chat from ${message.timestamp.toLocaleDateString()}... This feature will be available soon!`);
  }

  searchChats(): void {
    this.addBotMessage('Search functionality is coming soon! You\'ll be able to search through your chat history.');
  }

  }
