import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  signInWithGoogle(): void {
    window.location.href = 'http://localhost:3000/auth/google';
  }
}
