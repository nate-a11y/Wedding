import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-charcoal px-6 py-12 text-cream">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-heading text-3xl text-gold-400">Privacy &amp; terms</h1>
        <p>We use the information you submit to organize Nate &amp; Blake’s wedding, manage RSVPs, and send wedding communications and invitations. Please submit only information you are authorized to share.</p>
        <h2 className="text-xl">Address validation</h2>
        <p>As you type into a US street-address field, your partial address search is sent to Google Places for suggestions. Choosing a suggestion fills editable address fields. You can also enter an address manually. Suggestions are not proof of postal deliverability; we still validate the completed US address before saving.</p>
        <p>When you validate a US mailing address, its street, apartment/unit, city, state, and ZIP code are sent to Google Maps Address Validation. We do not include your name, email, or phone number in this request. Google may use USPS services to validate the address. Do not submit fabricated addresses.</p>
        <p>Address suggestions can be incorrect. Review them before choosing “Use Suggested Address.” We save the address you confirm for wedding mailings; we do not save Google’s raw response, coordinates, or validation metadata.</p>
        <h2 className="text-xl">Google Maps terms</h2>
        <p>Our address-validation feature incorporates the <a className="underline" href="https://cloud.google.com/maps-platform/terms">Google Terms of Service</a> and <a className="underline" href="https://policies.google.com/privacy">Google Privacy Policy</a>. Your use of this feature is subject to those terms.</p>
        <h2 className="text-xl">Your information</h2>
        <p>We use hosting, database, and communication providers to operate this site. We do not sell guest information. Contact Nate or Blake to request a correction or deletion of your wedding information. Please avoid sharing sensitive information that is not needed for the wedding.</p>
        <Link href="/address" className="inline-block text-gold-400 underline">Return to address form</Link>
      </div>
    </main>
  );
}
