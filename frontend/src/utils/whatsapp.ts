// Builds recipient-specific WhatsApp links from saved South African numbers.
export function whatsappUrl(phoneNumber: string | undefined, message: string): string | null {
  if (!phoneNumber?.trim()) return null;

  let digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (!digits) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}