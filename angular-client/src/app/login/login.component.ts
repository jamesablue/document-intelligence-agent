import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  signInWithGoogle(): void {
    window.location.href = 'http://localhost:3000/auth/google';
  }
}
