import { z } from 'zod';

export const FULL_NAME_ERROR = 'Please enter your first and last name.';
// Two whitespace-separated name parts containing letters, without restricting language or punctuation.
export const FULL_NAME_PATTERN = String.raw`.*\p{L}.*\s+.*\p{L}.*`;

export const fullNameSchema = z.string({ error: FULL_NAME_ERROR })
  .trim()
  .max(120, 'Full name is too long')
  .regex(new RegExp(`^${FULL_NAME_PATTERN}$`, 'u'), FULL_NAME_ERROR);
