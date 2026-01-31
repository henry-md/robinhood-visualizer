import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const upload = await prisma.recentUpload.findUnique({
      where: { id: params.id },
      include: {
        files: true,
      },
    });

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Format the response to match the expected structure
    const formattedUpload = {
      id: upload.id,
      timestamp: upload.timestamp.getTime(),
      fileType: upload.fileType,
      name: upload.name,
      files: upload.files.map(file => ({
        filename: file.filename,
        content: file.content,
        accountType: file.accountType,
      })),
    };

    return NextResponse.json(formattedUpload);
  } catch (error) {
    console.error('Error fetching upload:', error);
    return NextResponse.json({ error: 'Failed to fetch upload' }, { status: 500 });
  }
}
