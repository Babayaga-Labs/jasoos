import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOCAL_MYSTERIES_DIR = path.join(process.cwd(), 'new_games');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { path: pathSegments } = await params;

  // Validate path to prevent directory traversal
  const requestedPath = pathSegments.join('/');
  if (requestedPath.includes('..') || pathSegments.some((seg) => seg.startsWith('.'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const filePath = path.join(LOCAL_MYSTERIES_DIR, ...pathSegments);

  // Ensure file is within the local mysteries directory
  if (!filePath.startsWith(LOCAL_MYSTERIES_DIR)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Ensure it's a file, not a directory
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return NextResponse.json({ error: 'Not a file' }, { status: 400 });
  }

  const file = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.json': 'application/json',
  };

  return new NextResponse(file, {
    headers: {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
