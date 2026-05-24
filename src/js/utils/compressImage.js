/**
 * Resize and compress a photo for storage as a data URL (fits API limits).
 */
export function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please choose a JPG, PNG, or WebP image.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 960;
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const maxChars = 480_000;
      let quality = 0.88;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);

      while (dataUrl.length > maxChars && quality > 0.45) {
        quality -= 0.07;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      if (dataUrl.length > maxChars) {
        reject(new Error('Photo is too large. Try a smaller image.'));
        return;
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image.'));
    };

    img.src = objectUrl;
  });
}
