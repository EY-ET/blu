import { authedFetch } from './adminAuth';

const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function downscaleToDataUrl(source: HTMLImageElement): string {
  const scale = Math.min(1, MAX_IMAGE_WIDTH / source.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.naturalWidth * scale);
  canvas.height = Math.round(source.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The image could not be processed.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be processed.'));
    image.src = dataUrl;
  });
}

export async function resizeImageFile(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  return downscaleToDataUrl(image);
}

export async function uploadMenuImage(file: File): Promise<string> {
  const dataUrl = await resizeImageFile(file);
  const response = await authedFetch('/api/menu-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, dataUrl }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Image upload failed.');
  return result.url as string;
}
