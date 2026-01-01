import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters } from '@/lib/utils/rate-limit';

/**
 * POST /api/backgrounds/upload
 *
 * Uploads a custom background image for Pro users.
 *
 * Requirements:
 * - User must be authenticated
 * - User must have Pro subscription
 * - File size: max 2MB
 * - Allowed formats: JPG, PNG, WebP
 * - Rate limited: 10 uploads per 15 minutes
 *
 * Response format:
 * {
 *   success: boolean,
 *   url: string,
 *   message?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting (10 uploads per 15 minutes per user)
    const rateLimit = rateLimiters.upload(user.id);
    if (rateLimit.limited) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many uploads. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        }
      );
    }

    // Verify user has Pro subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    const isPro = profile?.subscription_tier === 'pro' &&
                  profile?.subscription_status === 'active';

    if (!isPro) {
      return NextResponse.json(
        {
          error: 'Pro subscription required',
          message: 'Upgrade to Pro to upload custom backgrounds'
        },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const fileValue = formData.get('file');

    // Validate that file is actually a File object (not string or null)
    if (!fileValue || !(fileValue instanceof File)) {
      return NextResponse.json(
        { error: 'No valid file provided' },
        { status: 400 }
      );
    }

    const file = fileValue;

    // Validate file size (2MB max)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'Maximum file size is 2MB'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Allowed formats: JPG, PNG, WebP'
        },
        { status: 400 }
      );
    }

    // Determine file extension with explicit mapping
    const EXTENSION_MAP: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = EXTENSION_MAP[file.type];

    if (!ext) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Sanitize user ID to prevent path traversal attacks
    // Supabase user IDs are UUIDs, but we sanitize anyway for defense-in-depth
    const sanitizedUserId = user.id.replace(/[^a-zA-Z0-9-]/g, '');

    if (sanitizedUserId !== user.id) {
      console.error('User ID sanitization changed value - potential attack:', user.id);
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    // Path: {user_id}/custom-background.{ext}
    const filePath = `${sanitizedUserId}/custom-background.${ext}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backgrounds')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Overwrite existing file
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        {
          error: 'Upload failed',
          message: uploadError.message
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update profile with custom background URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ custom_background_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update profile',
          message: updateError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Custom background uploaded successfully'
    });

  } catch (error) {
    console.error('Background upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backgrounds/upload
 *
 * Removes the user's custom background image.
 *
 * Response format:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current background URL from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_background_url')
      .eq('id', user.id)
      .single();

    if (!profile?.custom_background_url) {
      return NextResponse.json(
        {
          success: true,
          message: 'No custom background to delete'
        }
      );
    }

    // Delete all files in user's backgrounds folder
    // Path pattern: {user_id}/custom-background.*
    const { data: files } = await supabase.storage
      .from('backgrounds')
      .list(user.id);

    if (files && files.length > 0) {
      const filePaths = files
        .filter(file => file.name.startsWith('custom-background'))
        .map(file => `${user.id}/${file.name}`);

      if (filePaths.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('backgrounds')
          .remove(filePaths);

        if (deleteError) {
          console.error('Storage delete error:', deleteError);
          return NextResponse.json(
            {
              error: 'Failed to delete background',
              message: deleteError.message
            },
            { status: 500 }
          );
        }
      }
    }

    // Remove URL from profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ custom_background_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update profile',
          message: updateError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Custom background removed successfully'
    });

  } catch (error) {
    console.error('Background delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
