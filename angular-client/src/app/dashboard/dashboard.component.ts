import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  uploadStatus = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  upload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    this.uploadStatus = 'Uploading…';

    this.http.post('http://localhost:3000/upload', formData, { headers }).subscribe({
      next: () => {
        this.uploadStatus = 'Upload complete — processing in background.';
        this.router.navigate(['/documents']);
      },
      error: (err) => (this.uploadStatus = `Upload failed: ${err.status}`),
    });
  }
}
