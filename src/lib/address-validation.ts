import { z } from 'zod';
import type { addressValidationSchema } from './validation';

export type AddressInput = z.infer<typeof addressValidationSchema>;

const googleResponseSchema = z.object({
  result: z.object({
    verdict: z.object({
      addressComplete: z.boolean().optional(),
      hasUnconfirmedComponents: z.boolean().optional(),
      validationGranularity: z.string().optional(),
    }),
    address: z.object({
      postalAddress: z.object({
        addressLines: z.array(z.string()).min(1),
        locality: z.string(),
        administrativeArea: z.string(),
        postalCode: z.string(),
      }),
    }),
    uspsData: z.object({
      dpvConfirmation: z.string().optional(),
      standardizedAddress: z.object({
        firstAddressLine: z.string().optional(),
        secondAddressLine: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        zipCodeExtension: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
});

export function parseGoogleAddress(data: unknown, original: AddressInput) {
  const { result } = googleResponseSchema.parse(data);
  const { verdict, uspsData } = result;
  const postal = result.address.postalAddress;
  const standardized = uspsData?.standardizedAddress;
  const zip = standardized?.zipCode
    ? [standardized.zipCode, standardized.zipCodeExtension].filter(Boolean).join('-')
    : postal.postalCode;
  const address: AddressInput = {
    street_address: standardized?.firstAddressLine || postal.addressLines[0],
    street_address_2: standardized?.secondAddressLine || postal.addressLines.slice(1).join(', ') || original.street_address_2,
    city: standardized?.city || postal.locality,
    state: standardized?.state || postal.administrativeArea,
    postal_code: zip,
  };
  const valid = verdict.addressComplete === true &&
    !verdict.hasUnconfirmedComponents &&
    ['PREMISE', 'SUB_PREMISE'].includes(verdict.validationGranularity || '') &&
    uspsData?.dpvConfirmation === 'Y';
  const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();
  const changed = (Object.keys(address) as Array<keyof AddressInput>)
    .some(key => normalized(address[key]) !== normalized(original[key]));

  return {
    ...address,
    is_valid: valid,
    is_standardized: valid && changed,
    ...(!valid && { error: 'We could not verify this address. Check the street, apartment/unit, city, state, and ZIP code.' }),
  };
}

export async function validateGoogleAddress(input: AddressInput) {
  const key = process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
  if (!key) throw new Error('Address validation is not configured');

  const response = await fetch('https://addressvalidation.googleapis.com/v1:validateAddress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      address: {
        regionCode: 'US',
        addressLines: [input.street_address, input.street_address_2].filter(Boolean),
        locality: input.city,
        administrativeArea: input.state,
        postalCode: input.postal_code,
      },
      enableUspsCass: true,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  // Do not log provider bodies: they can contain guest addresses or credential metadata.
  if (!response.ok) throw new Error(`Address validation returned HTTP ${response.status}`);
  return parseGoogleAddress(await response.json(), input);
}
