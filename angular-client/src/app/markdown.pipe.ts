import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Model output is derived from user-uploaded documents, so treat it as untrusted:
// raw HTML is escaped, images are reduced to their alt text, and links open in a
// new tab. The result is still passed through Angular's sanitizer via [innerHTML].
const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  },
});

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? (marked.parse(value, { async: false }) as string) : '';
  }
}
