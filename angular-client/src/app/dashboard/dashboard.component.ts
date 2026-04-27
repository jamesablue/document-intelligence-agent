import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  status: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  upload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    this.status = 'Uploading...';

    this.http.post('http://localhost:3000/upload', formData, { headers }).subscribe({
      next: () => (this.status = 'Upload complete!'),
      error: (err: HttpErrorResponse) => (this.status = `Upload failed. ${err.status} ${err.message}`),
    });
  }
}
