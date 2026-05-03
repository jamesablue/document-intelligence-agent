import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface DocumentSummary {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  _count: { chunks: number };
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    chunkId: string;
    documentId: string;
    content: string;
    similarity: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = 'http://localhost:3000';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getDocuments(): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(`${this.api}/documents`, {
      headers: this.headers(),
    });
  }

  chat(query: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(
      `${this.api}/chat`,
      { query },
      { headers: this.headers() }
    );
  }
}
