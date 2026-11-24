// wa.me wants the international number without "+": Mexico's 52 and the 10-digit
// number, with no mobile "1" since the 2019 numbering change (IFT).
const MEXICO_COUNTRY_CODE = '52'

// Click to chat (https://whatsapp.com/faq/en/general/26000030): opens WhatsApp with
// the text written; the admin still taps Send, so it costs nothing.
export function whatsappChatLink(nationalNumber: string, text: string): string {
  return `https://wa.me/${MEXICO_COUNTRY_CODE}${nationalNumber}?text=${encodeURIComponent(text)}`
}
