import Tesseract from 'tesseract.js';

export async function parseImageWithOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(info.progress * 100));
        }
      },
    });

    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
