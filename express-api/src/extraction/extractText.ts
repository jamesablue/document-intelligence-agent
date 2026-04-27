import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  if (filename.endsWith('.pdf')) {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (filename.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${filename}`);
}
