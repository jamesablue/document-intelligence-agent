import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentService } from '../document.service';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  query = '';
  messages: Message[] = [];
  loading = false;
  error = '';

  constructor(private documentService: DocumentService, private router: Router) {}

  submit(): void {
    if (!this.query.trim() || this.loading) return;

    const userText = this.query.trim();
    this.messages.push({ role: 'user', text: userText });
    this.query = '';
    this.loading = true;
    this.error = '';

    this.documentService.chat(userText).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', text: res.answer });
        this.loading = false;
      },
      error: () => {
        this.error = 'Something went wrong. Please try again.';
        this.loading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }
}
