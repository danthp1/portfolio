import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import { get } from '@vercel/blob';

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

    // Get the URL from the media document
    const url = media.url;

    if (!url) {
      return new NextResponse('Media URL not found', { status: 404 });
    }

    // Fetch the blob from Vercel Blob Storage
    const blob = await get(url);

    if (!blob) {
      return new NextResponse('Blob not found', { status: 404 });
    }

    // Set appropriate headers for the response
    const headers = new Headers();

    // Set CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle based on download parameter
    if (download) {
      // For downloads, redirect with the download parameter
      const downloadUrl = `${blob.url}?download=true`;
      return NextResponse.redirect(downloadUrl, {
        headers,
        status: 302
      });
    } else {
      // For inline viewing, just redirect to the blob URL
      return NextResponse.redirect(blob.url, {
        headers,
        status: 302
      });
    }
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
