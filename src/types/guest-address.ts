export interface GuestAddress {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  linked_rsvp_id: string | null;
  rsvps: {
    id: string;
    name: string;
    attending: boolean;
    created_at: string;
  } | null;
  created_at: string;
  updated_at: string | null;
}
