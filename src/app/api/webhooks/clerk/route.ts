// src/app/api/webhooks/clerk/route.ts
// Webhook endpoint to sync Clerk users with Neon PostgreSQL

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';

// Webhook event types from Clerk
type WebhookEvent = {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
  };
  object: 'event';
  type: 'user.created' | 'user.updated' | 'user.deleted';
};

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle the webhook
  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name, image_url } = evt.data;

  // Get primary email
  const primaryEmail = email_addresses?.[0]?.email_address;

  if (!primaryEmail && eventType !== 'user.deleted') {
    console.error('No email address found for user:', id);
    return NextResponse.json(
      { error: 'No email address found' },
      { status: 400 }
    );
  }

  try {
    switch (eventType) {
      case 'user.created':
        await prisma.clerkUser.create({
          data: {
            clerkId: id,
            email: primaryEmail,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
        });
        console.log('Created user in database:', id);
        break;

      case 'user.updated':
        await prisma.clerkUser.upsert({
          where: { clerkId: id },
          update: {
            email: primaryEmail,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
          create: {
            clerkId: id,
            email: primaryEmail,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
        });
        console.log('Updated user in database:', id);
        break;

      case 'user.deleted':
        await prisma.clerkUser.deleteMany({
          where: { clerkId: id },
        });
        console.log('Deleted user from database:', id);
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
