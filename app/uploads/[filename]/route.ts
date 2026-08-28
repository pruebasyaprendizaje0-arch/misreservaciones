import { NextResponse, type NextRequest } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await ctx.params;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: 'IMAGE_NOT_FOUND' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();

    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
