'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentMethod } from '@/types/database';

export interface RequestAccessInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  paymentMethod: PaymentMethod;
  senderNumber: string;
  transactionId: string;
  screenshotBase64?: string;
  screenshotFileName?: string;
  screenshotUrl?: string;
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
}

/**
 * Handle new client access request with manual payment proof.
 * Registers user, uploads screenshot to 'payment_proofs' bucket, and logs pending payment request.
 */
export async function submitAccessRequest(
  input: RequestAccessInput
): Promise<AuthActionResult> {
  try {
    const adminSupabase = createAdminClient();

    const fullName = input.fullName?.trim();
    const phone = input.phone?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    const paymentMethod = input.paymentMethod;
    const senderNumber = input.senderNumber?.trim();
    const transactionId = input.transactionId?.trim();

    // 1. Validation
    if (!fullName || !phone || !email || !password || !transactionId || !senderNumber) {
      return {
        success: false,
        error: 'All fields (Full Name, Phone, Email, Password, Sender Account/Phone, and TID) are required.',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long.',
      };
    }

    // 2. Check if Transaction ID (TID) is already used
    const { data: existingTid } = await adminSupabase
      .from('payment_requests')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (existingTid) {
      return {
        success: false,
        error: 'This Transaction ID (TID) has already been submitted. Please provide a valid, unique receipt.',
      };
    }

    // 3. Upload screenshot if provided as base64 or file
    let finalScreenshotUrl = input.screenshotUrl || '';

    if (input.screenshotBase64) {
      try {
        const matches = input.screenshotBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer: Buffer;
        let contentType = 'image/jpeg';

        if (matches && matches.length === 3) {
          contentType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(input.screenshotBase64, 'base64');
        }

        const ext = contentType.split('/')[1] || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const filePath = `receipts/${fileName}`;

        // Ensure bucket exists
        await adminSupabase.storage.createBucket('payment_proofs', {
          public: true,
        }).catch(() => {
          // Bucket might already exist, safe to ignore
        });

        const { error: uploadError } = await adminSupabase.storage
          .from('payment_proofs')
          .upload(filePath, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.warn('Storage upload error, falling back to base64 data:', uploadError);
          finalScreenshotUrl = input.screenshotBase64;
        } else {
          const { data: publicUrlData } = adminSupabase.storage
            .from('payment_proofs')
            .getPublicUrl(filePath);

          finalScreenshotUrl = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error('Screenshot processing error:', err);
        finalScreenshotUrl = input.screenshotBase64 || '';
      }
    }

    if (!finalScreenshotUrl) {
      return {
        success: false,
        error: 'Payment screenshot proof is required.',
      };
    }

    // 4. Create or Fetch User via Admin Auth
    let userId: string;

    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'client',
      },
    });

    if (createError) {
      // If user already registered, check status
      const isAlreadyRegistered =
        (createError as { code?: string }).code === 'email_exists' ||
        createError.message.toLowerCase().includes('already');

      if (isAlreadyRegistered) {
        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('id, status, role')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          if (existingProfile.status === 'active') {
            return {
              success: false,
              error: `An active ${existingProfile.role === 'admin' ? 'administrator' : 'client'} account already exists for ${email}. Please sign in directly at /login.`,
            };
          }
          userId = existingProfile.id;
        } else {
          return {
            success: false,
            error: 'This email is already registered. Please sign in or use a demo client email (e.g. client@example.com).',
          };
        }
      } else {
        console.error('Auth create user error:', createError);
        return {
          success: false,
          error: `Account registration failed: ${createError.message}`,
        };
      }
    } else {
      userId = userData.user.id;
    }

    // 5. Ensure Profile exists with status 'pending'
    const { error: profileUpsertError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        phone_number: phone,
        role: 'client',
        status: 'pending',
      } as any);

    if (profileUpsertError) {
      console.error('Profile upsert error:', profileUpsertError);
    }

    // 6. Insert record into payment_requests
    const methodFormatted =
      paymentMethod === 'Bank Transfer'
        ? 'bank_transfer'
        : paymentMethod.toLowerCase();

    const { error: paymentInsertError } = await adminSupabase
      .from('payment_requests')
      .insert({
        user_id: userId,
        amount_paid: 3000,
        payment_method: methodFormatted,
        account_number_used: senderNumber,
        transaction_id: transactionId,
        proof_screenshot_url: finalScreenshotUrl,
        status: 'pending',
      } as any);

    if (paymentInsertError) {
      console.error('Payment request insert error:', paymentInsertError);
      return {
        success: false,
        error: `Could not save payment proof: ${paymentInsertError.message}`,
      };
    }

    return {
      success: true,
      userId,
      message: 'Your access request and payment proof have been received. You will be able to sign in once the admin approves your payment.',
    };
  } catch (err: unknown) {
    console.error('Unexpected error in submitAccessRequest:', err);
    const message = err instanceof Error ? err.message : 'Unknown technical error';
    return {
      success: false,
      error: `Error occurred: ${message}`,
    };
  }
}
