import { z } from 'zod';

// Usage increment - no body needed (user from auth)
export const IncrementUsageSchema = z.object({}).strict();

// Background upload
export const UploadBackgroundSchema = z.object({
  file: z.string().min(1).refine(
    (val) => {
      try {
        atob(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Must be valid base64' }
  ),
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
});

// Background delete - no body needed
export const DeleteBackgroundSchema = z.object({}).strict();

// Stripe checkout
export const CreateCheckoutSchema = z.object({
  priceId: z.string().startsWith('price_'),
});

// Stripe portal - no body needed
export const CreatePortalSchema = z.object({}).strict();

// Account delete - add confirmation
export const DeleteAccountSchema = z.object({
  confirmation: z.literal('DELETE').optional(), // Optional for backward compatibility
});

// Debug alignment log
export const CreateAlignmentLogSchema = z.object({
  entry: z.object({
    timestamp: z.string().datetime(),
    photo: z.enum(['before', 'after']),
    landmarks: z.array(z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional(),
      visibility: z.number().optional(),
    })),
    keypoints: z.object({
      shoulder: z.object({ x: z.number(), y: z.number() }).optional(),
      hip: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
    metrics: z.object({
      angle: z.number().optional(),
      scale: z.number().optional(),
      offset: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  }),
});

// Export log
export const ExportLogSchema = z.object({
  export_format: z.enum(['png', 'gif']),
  aspect_ratio: z.enum(['1:1', '4:5', '9:16']).optional(),
  anon_id: z.string().max(128).optional(),
});

// Validation helper
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return { success: false, error: errors };
    }
    return { success: false, error: 'Invalid request body' };
  }
}
