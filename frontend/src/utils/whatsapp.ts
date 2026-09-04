// Builds recipient-specific WhatsApp links from saved South African numbers.
export function whatsappUrl(phoneNumber: string | undefined, message: string, imageUrl?: string): string | null {
  if (!phoneNumber?.trim()) return null;

  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (!digits) return null;

  const referenceUrl = imageUrl?.trim()
    ? new URL(imageUrl, window.location.origin).href
    : "";
  const messageWithReference = referenceUrl
    ? `${message}\n\nStyle reference: ${referenceUrl}`
    : message;

  return `https://wa.me/${digits}?text=${encodeURIComponent(messageWithReference)}`;
}