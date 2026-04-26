import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private token: string | null = null;

  constructor(private route: ActivatedRoute) {}

  handleCallback(): void {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
      }
    });
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }
}
