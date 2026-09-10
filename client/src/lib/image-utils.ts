// Utility functions for image processing

/**
 * Compress an image file to reduce its size
 * @param file The image file to compress
 * @param quality The quality of the compressed image (0-1)
 * @param maxWidth The maximum width of the compressed image
 * @returns A promise that resolves to the compressed image as a Blob
 */
export async function compressImage(
  file: File,
  quality: number = 0.7,
  maxWidth: number = 800
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions
      const scaleFactor = Math.min(1, maxWidth / img.width);
      const newWidth = img.width * scaleFactor;
      const newHeight = img.height * scaleFactor;
      
      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Could not load image'));
    };
    
    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Could not read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a Blob to a data URL
 * @param blob The blob to convert
 * @returns A promise that resolves to the data URL
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}