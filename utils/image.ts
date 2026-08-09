export function getDisplayableImageUrl(imageValue?: string): string | null {
  if (!imageValue) return null;
  if (imageValue.startsWith('http://') || imageValue.startsWith('https://') || imageValue.startsWith('data:')) {
    return imageValue;
  }

  // NEW — this proxy endpoint was switched to require the leak-safe
  // access_token (not the private license code) as part of the Mini App
  // security fix; this helper needs the same value, or every gallery/
  // product image inside the admin panel itself 404s.
  const accessToken = localStorage.getItem('webhook_access_token') || '';
  if (!accessToken) return null;

  return `https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(accessToken)}/image/${encodeURIComponent(imageValue)}`;
}