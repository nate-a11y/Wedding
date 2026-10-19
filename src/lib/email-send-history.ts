export interface EmailSendHistoryEntry {
  id: string;
  campaign_id: string | null;
  email: string;
  guest_name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface OutboundEmail {
  id: string;
  related_id: string | null;
  to_address: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export function mergeEmailSendHistory(campaignSends: EmailSendHistoryEntry[], emails: OutboundEmail[]): EmailSendHistoryEntry[] {
  const matched = new Set<string>();
  const sends = emails.map(email => {
    const campaignSend = email.related_id ? campaignSends.find(send =>
      send.campaign_id === email.related_id && send.email.toLowerCase() === email.to_address.toLowerCase()
    ) : undefined;
    if (campaignSend) matched.add(campaignSend.id);
    return {
      id: email.id,
      campaign_id: campaignSend?.campaign_id || null,
      email: email.to_address,
      guest_name: campaignSend?.guest_name || null,
      status: email.status,
      sent_at: email.sent_at || (email.status === 'failed' ? null : email.created_at),
      error_message: campaignSend?.error_message || null,
      created_at: email.created_at,
    };
  });
  return [...sends, ...campaignSends.filter(send => !matched.has(send.id))]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 100);
}
