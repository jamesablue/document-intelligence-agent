import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DocumentService, DocumentSummary } from '../document.service';

const PROCESSING_STATUSES = new Set(['PENDING', 'EXTRACTED', 'CHUNKED', 'EMBEDDED']);

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit, OnDestroy {
  documents: DocumentSummary[] = [];
  error = '';
  private poll$?: Subscription;

  constructor(private documentService: DocumentService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.poll$ = interval(3000)
      .pipe(switchMap(() => this.documentService.getDocuments()))
      .subscribe({
        next: (docs) => {
          this.documents = docs;
          if (!docs.some((d) => PROCESSING_STATUSES.has(d.status))) {
            this.poll$?.unsubscribe();
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.poll$?.unsubscribe();
  }

  private load(): void {
    this.documentService.getDocuments().subscribe({
      next: (docs) => (this.documents = docs),
      error: () => (this.error = 'Failed to load documents.'),
    });
  }

  goToChat(): void {
    this.router.navigate(['/chat']);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'READY': return 'status-ready';
      case 'ERROR': return 'status-error';
      default: return 'status-processing';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'EXTRACTED': return 'Extracted';
      case 'CHUNKED': return 'Chunking…';
      case 'EMBEDDED': return 'Embedding…';
      case 'READY': return 'Ready';
      case 'ERROR': return 'Error';
      default: return status;
    }
  }
}
