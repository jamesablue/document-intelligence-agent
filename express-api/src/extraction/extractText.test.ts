import { describe, it, expect } from 'vitest';
import { extractText } from './extractText.js';

describe('extractText', () => {
  const buffer = Buffer.from('plain text content');

  it.each(['notes.txt', 'report.doc', 'slides.pptx', 'image.png', 'no-extension'])(
    'rejects %s',
    async (filename) => {
      await expect(extractText(buffer, filename)).rejects.toThrow(`Unsupported file type: ${filename}`);
    }
  );

  it('rejects a name that only contains .pdf before another extension', async () => {
    await expect(extractText(buffer, 'invoice.pdf.exe')).rejects.toThrow('Unsupported file type');
  });
});
