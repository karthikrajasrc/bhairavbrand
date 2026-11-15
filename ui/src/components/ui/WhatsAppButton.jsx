import { WHATSAPP_NUMBER } from '../../lib/contact.js';

export default function WhatsAppButton() {
  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Chat with Bhairav Brand on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <img src="/assets/whatsapp-icon.png" alt="" aria-hidden="true" />
    </a>
  );
}
