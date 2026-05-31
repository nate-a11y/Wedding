import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export function formatZodError(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'request',
    message: issue.message,
  }));
}

export function badRequest(error: string, details?: ValidationErrorDetail[]) {
  return NextResponse.json(
    details && details.length > 0 ? { error, details } : { error },
    { status: 400 }
  );
}

export function validationErrorResponse(error: ZodError) {
  return badRequest('Invalid request payload', formatZodError(error));
}
