import { z } from 'zod';

export interface AddressSuggestion { placeId: string; text: string }
export interface SuggestedAddress {
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
}

async function googlePlaces(path: string, fieldMask: string, body?: object) {
  const key = process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
  if (!key) throw new Error('Address suggestions not configured');
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Places returned HTTP ${response.status}`);
  return response.json();
}

export async function suggestAddresses(input: string, sessionToken: string): Promise<AddressSuggestion[]> {
  const data = await googlePlaces('places:autocomplete', 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text', {
    input, sessionToken, includedRegionCodes: ['us'], languageCode: 'en',
  });
  const parsed = z.object({ suggestions: z.array(z.object({ placePrediction: z.object({
    placeId: z.string(), text: z.object({ text: z.string() }),
  }).optional() })).optional() }).parse(data);
  return (parsed.suggestions || []).flatMap(item => item.placePrediction
    ? [{ placeId: item.placePrediction.placeId, text: item.placePrediction.text.text }] : []).slice(0, 5);
}

export function parsePlaceAddress(data: unknown): SuggestedAddress {
  const { addressComponents } = z.object({ addressComponents: z.array(z.object({
    longText: z.string().optional(), shortText: z.string().optional(), types: z.array(z.string()),
  })) }).parse(data);
  const part = (type: string, short = false) => {
    const value = addressComponents.find(component => component.types.includes(type));
    return (short ? value?.shortText : value?.longText) || value?.longText || '';
  };
  if (part('country', true) !== 'US') throw new Error('Address is outside the US');
  if (!part('street_number') || !part('route')) throw new Error('Choose a full street address or enter it manually');
  return {
    street_address: [part('street_number'), part('route')].filter(Boolean).join(' '),
    street_address_2: part('subpremise'),
    city: part('locality') || part('postal_town') || part('sublocality_level_1'),
    state: part('administrative_area_level_1', true),
    postal_code: [part('postal_code'), part('postal_code_suffix')].filter(Boolean).join('-'),
  };
}

export async function resolveAddress(placeId: string, sessionToken: string) {
  const params = new URLSearchParams({ sessionToken, languageCode: 'en' });
  return parsePlaceAddress(await googlePlaces(`places/${encodeURIComponent(placeId)}?${params}`, 'addressComponents'));
}
