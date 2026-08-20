import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube una imagen (JPG, PNG, WEBP, GIF, SVG).' },
        { status: 400 }
      );
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo de 8MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Ensure uploads folder exists
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const ext = path.extname(file.name) || '.jpg';
      const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({ ok: true, url: publicUrl });
    } catch (fsErr) {
      console.warn('[upload] File system write failed, returning base64 fallback:', fsErr);
      const base64Data = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64Data}`;
      return NextResponse.json({ ok: true, url: dataUrl });
    }
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return NextResponse.json({ error: 'Error interno al guardar la imagen.' }, { status: 500 });
  }
}
