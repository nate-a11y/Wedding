import { NextRequest, NextResponse } from 'next/server';

interface AddressInput {
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface ValidatedAddress {
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  is_valid: boolean;
  is_standardized: boolean;
  original_input: AddressInput;
  footnotes?: string[];
  error?: string;
}

// USPS OAuth API endpoints
const USPS_TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token';
const USPS_ADDRESS_URL = 'https://apis.usps.com/addresses/v3/address';

// Cache for OAuth token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const consumerKey = process.env.USPS_CONSUMER_KEY;
  const consumerSecret = process.env.USPS_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return null;
  }

  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const response = await fetch(USPS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: consumerKey,
        client_secret: consumerSecret,
        scope: 'addresses',
      }),
    });

    if (!response.ok) {
      console.error('Failed to get USPS token:', await response.text());
      return null;
    }

    const data = await response.json();

    // Cache the token (expires_in is in seconds, subtract 60 seconds for safety margin)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting USPS token:', error);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidatedAddress>> {
  try {
    const body: AddressInput = await request.json();
    const { street_address, street_address_2, city, state, postal_code } = body;

    // Validate required fields
    if (!street_address || !city || !state || !postal_code) {
      return NextResponse.json({
        is_valid: false,
        is_standardized: false,
        street_address: street_address || '',
        street_address_2: street_address_2 || '',
        city: city || '',
        state: state || '',
        postal_code: postal_code || '',
        original_input: body,
        error: 'Missing required address fields',
      }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      // If USPS not configured, return the address as-is
      console.warn('USPS credentials not configured, skipping validation');
      return NextResponse.json({
        is_valid: true,
        is_standardized: false,
        street_address,
        street_address_2: street_address_2 || '',
        city,
        state,
        postal_code,
        original_input: body,
        footnotes: ['USPS validation not configured'],
      });
    }

    // Build query parameters for USPS Address API
    const params = new URLSearchParams({
      streetAddress: street_address,
      city: city,
      state: state,
      ZIPCode: postal_code.substring(0, 5),
    });

    if (street_address_2) {
      params.set('secondaryAddress', street_address_2);
    }

    // Call USPS Address API
    const response = await fetch(`${USPS_ADDRESS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USPS API error:', errorText);

      // If address not found, return as invalid but allow user to continue
      if (response.status === 404) {
        return NextResponse.json({
          is_valid: false,
          is_standardized: false,
          street_address,
          street_address_2: street_address_2 || '',
          city,
          state,
          postal_code,
          original_input: body,
          error: 'Address not found. Please verify the address is correct.',
        });
      }

      throw new Error(`USPS API returned ${response.status}`);
    }

    const data = await response.json();

    // Parse USPS response
    const result = parseUspsResponse(data, body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Address validation error:', error);
    // On error, return the address as-is and allow user to continue
    const body = await request.clone().json().catch(() => ({
      street_address: '',
      city: '',
      state: '',
      postal_code: ''
    }));
    return NextResponse.json({
      is_valid: true,
      is_standardized: false,
      street_address: body.street_address || '',
      street_address_2: body.street_address_2 || '',
      city: body.city || '',
      state: body.state || '',
      postal_code: body.postal_code || '',
      original_input: body,
      footnotes: ['Address validation temporarily unavailable'],
    });
  }
}

interface USPSAddressResponse {
  firm?: string;
  address?: {
    streetAddress?: string;
    streetAddressAbbreviation?: string;
    secondaryAddress?: string;
    city?: string;
    cityAbbreviation?: string;
    state?: string;
    ZIPCode?: string;
    ZIPPlus4?: string;
    urbanization?: string;
  };
  additionalInfo?: {
    deliveryPoint?: string;
    carrierRoute?: string;
    DPVConfirmation?: string;
    DPVCMRA?: string;
    business?: string;
    centralDeliveryPoint?: string;
    vacant?: string;
  };
}

function parseUspsResponse(data: USPSAddressResponse, originalInput: AddressInput): ValidatedAddress {
  const address = data.address || {};
  const additionalInfo = data.additionalInfo || {};

  // Extract standardized address components
  const streetAddress = address.streetAddress || address.streetAddressAbbreviation || '';
  const secondaryAddress = address.secondaryAddress || '';
  const cityName = address.city || address.cityAbbreviation || '';
  const stateName = address.state || '';
  const zip5 = address.ZIPCode || '';
  const zip4 = address.ZIPPlus4 || '';

  // Build full ZIP code
  const fullZip = zip4 ? `${zip5}-${zip4}` : zip5;

  // Check for DPV confirmation (Delivery Point Validation)
  const dpvConfirmation = additionalInfo.DPVConfirmation;
  const isDeliverable = dpvConfirmation === 'Y' || dpvConfirmation === 'D' || dpvConfirmation === 'S';

  // Determine if address was standardized (changed from input)
  const isStandardized =
    streetAddress.toUpperCase() !== originalInput.street_address.toUpperCase() ||
    cityName.toUpperCase() !== originalInput.city.toUpperCase() ||
    fullZip !== originalInput.postal_code;

  // Build footnotes based on validation results
  const footnotes: string[] = [];
  if (isStandardized) {
    footnotes.push('Address standardized to USPS format');
  }
  if (zip4) {
    footnotes.push('ZIP+4 code added');
  }
  if (additionalInfo.vacant === 'Y') {
    footnotes.push('Address appears to be vacant');
  }

  return {
    is_valid: isDeliverable || (streetAddress !== '' && cityName !== '' && stateName !== '' && zip5 !== ''),
    is_standardized: isStandardized,
    street_address: streetAddress,
    street_address_2: secondaryAddress,
    city: cityName,
    state: stateName,
    postal_code: fullZip,
    original_input: originalInput,
    footnotes: footnotes.length > 0 ? footnotes : undefined,
  };
}
