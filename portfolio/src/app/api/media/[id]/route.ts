import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get('download') === 'true';

    // Initialize Payload
    const payload = await getPayload({ config: configPromise });

    // Fetch the media document
    const media = await payload.findByID({
      collection: 'media',
      id,
    });

    if (!media) {
      return new NextResponse('Media not found', { status: 404 });
    }

    // Get the file path
    const staticDir = path.resolve(process.cwd(), 'public/media');
    const filePath = path.join(staticDir, media.filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', media.mimeType);

    // Set Content-Disposition header based on download parameter
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${media.filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${media.filename}"`);
    }

    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Return the file
    return new NextResponse(fileBuffer, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error('Error serving media file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new NextResponse(null, {
    headers,
    status: 204,
  });
}
