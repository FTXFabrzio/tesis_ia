import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUrl(url: string | undefined | null) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // If it starts with 10. (common for DOIs), prepend doi.org
  if (trimmed.startsWith('10.')) {
    return `https://doi.org/${trimmed}`;
  }
  return `https://${trimmed}`;
}
