import Tesseract from 'tesseract.js';

export async function parseImageWithOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (!isImageFile(file)) {
      throw new Error('Invalid file type. Please upload an image file (JPG, PNG, WEBP).');
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Image file too large. Maximum size is 20MB.');
    }

    console.log('Starting OCR processing for:', file.name);
    
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(info.progress * 100));
        }
        console.log('OCR Status:', info.status, info.progress);
      },
    });

    const extractedText = result.data.text.trim();
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Could not extract enough text from image. Please ensure the image is clear and contains readable text.');
    }

    console.log('OCR completed successfully. Extracted characters:', extractedText.length);
    return extractedText;
  } catch (error) {
    console.error('OCR Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract text from image. Please try a clearer image.');
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
