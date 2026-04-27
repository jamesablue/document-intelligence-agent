import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;

  handleCallback(): void {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      this.token = token;
    }
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }
}
