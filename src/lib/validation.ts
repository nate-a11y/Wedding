import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, validationErrorResponse } from '@/lib/api-response';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;

export type RequestValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

const requiredString = (max: number, label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalString = (max: number, label: string) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string({ error: `${label} must be a string` }).trim().max(max, `${label} is too long`).optional()
  );

const emailSchema = z
  .string({ error: 'Email address is required' })
  .trim()
  .max(254, 'Email address is too long')
  .email('Please enter a valid email address')
  .toLowerCase();

const optionalEmailSchema = z.preprocess(
  (value) => (value === null || value === undefined || value === '' ? undefined : value),
  emailSchema.optional()
);

const idSchema = requiredString(120, 'ID');

const additionalGuestSchema = z.object({
  id: optionalString(80, 'Guest ID'),
  name: requiredString(120, 'Guest name'),
  mealChoice: optionalString(100, 'Meal choice').default(''),
  isChild: z.boolean({ error: 'Child flag must be true or false' }).optional().default(false),
});

const rsvpAddressSchema = z.object({
  name: optionalString(120, 'Name'),
  email: optionalEmailSchema,
  phone: optionalString(50, 'Phone'),
  street_address: optionalString(150, 'Street address'),
  street_address_2: optionalString(150, 'Street address 2'),
  city: optionalString(100, 'City'),
  state: optionalString(80, 'State'),
  postal_code: optionalString(20, 'Postal code'),
  country: optionalString(100, 'Country'),
});

const eventResponsesSchema = z
  .record(requiredString(80, 'Event'), z.boolean({ error: 'Event response must be true or false' }))
  .refine((responses) => Object.keys(responses).length <= 25, 'Too many event responses');

export const rsvpSubmissionSchema = z.object({
  name: requiredString(120, 'Name'),
  email: emailSchema,
  attending: z.union([z.boolean(), z.enum(['yes', 'no'])], { error: 'Attending status is required' }),
  mealChoice: optionalString(100, 'Meal choice'),
  dietaryRestrictions: optionalString(500, 'Dietary restrictions'),
  songRequest: optionalString(200, 'Song request'),
  message: optionalString(1000, 'Message'),
  additionalGuests: z.array(additionalGuestSchema).max(20, 'Too many additional guests').optional().default([]),
  address: rsvpAddressSchema.optional(),
  existingAddressId: optionalString(120, 'Existing address ID'),
  eventResponses: eventResponsesSchema.optional(),
});

export const rsvpJoinHouseholdSchema = z.object({
  householdRsvpId: idSchema,
  name: requiredString(120, 'Name'),
  email: optionalEmailSchema,
  existingAddressId: optionalString(120, 'Existing address ID'),
  mealChoice: optionalString(100, 'Meal choice'),
  isChild: z.boolean({ error: 'Child flag must be true or false' }).optional().default(false),
});

export const rsvpLookupSchema = z.object({
  email: emailSchema,
});

export const guestbookSubmissionSchema = z
  .object({
    name: requiredString(120, 'Name'),
    email: emailSchema,
    message: optionalString(500, 'Message'),
    media_url: optionalString(2048, 'Media URL'),
    media_type: z.enum(['video', 'audio']).nullable().optional(),
    media_duration: z.number({ error: 'Media duration must be a number' }).min(0).max(120).nullable().optional(),
  })
  .refine(
    (body) => Boolean(body.message?.trim() || body.media_url?.trim()),
    { message: 'Please provide either a message or media', path: ['message'] }
  );

export const addressSubmissionSchema = z
  .object({
    name: requiredString(120, 'Name'),
    email: emailSchema,
    phone: requiredString(50, 'Phone'),
    streetAddress: requiredString(150, 'Street address'),
    streetAddress2: optionalString(150, 'Street address 2'),
    city: requiredString(100, 'City'),
    state: optionalString(80, 'State'),
    postalCode: requiredString(20, 'Postal code'),
    country: optionalString(100, 'Country').default('United States'),
    turnstileToken: optionalString(2048, 'Captcha token'),
  })
  .superRefine((body, ctx) => {
    const isUSOrCanada = body.country === 'United States' || body.country === 'Canada';
    if (isUSOrCanada && !body.state?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['state'],
        message: 'State is required',
      });
    }
  });

const isFileLike = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

export const photoUploadSchema = z.object({
  file: z
    .custom<File>(isFileLike, 'File is required')
    .refine((file) => file.size > 0, 'File is required')
    .refine((file) => ALLOWED_PHOTO_TYPES.includes(file.type as typeof ALLOWED_PHOTO_TYPES[number]), 'Invalid file type. Please upload a JPEG, PNG, or WebP image.')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File too large. Maximum size is 10MB.'),
  guestName: requiredString(120, 'Guest name'),
  caption: optionalString(500, 'Caption'),
  source: z.enum(['camera', 'upload']).optional().default('upload'),
});

export const songListQuerySchema = z.object({
  voter_email: optionalEmailSchema,
});

export const songSubmissionSchema = z.object({
  title: requiredString(200, 'Song title'),
  artist: optionalString(200, 'Artist'),
  submitted_by_email: optionalEmailSchema,
  submitted_by_name: optionalString(120, 'Name'),
});

export const songVoteSchema = z.object({
  song_id: idSchema,
  voter_email: emailSchema,
});

export async function parseJsonRequest<TSchema extends z.ZodType>(
  request: NextRequest,
  schema: TSchema
): Promise<RequestValidationResult<z.infer<TSchema>>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return { success: false, response: badRequest('Invalid JSON payload') };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

export function parseFormData<TSchema extends z.ZodType>(
  payload: unknown,
  schema: TSchema
): RequestValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }

  return { success: true, data: parsed.data };
}
