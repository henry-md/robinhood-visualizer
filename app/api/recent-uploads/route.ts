import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const uploads = await prisma.recentUpload.findMany({
      include: {
        files: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10,
    });

    // Format the response to match the expected structure
    const formattedUploads = uploads.map(upload => ({
      id: upload.id,
      timestamp: upload.timestamp.getTime(),
      fileType: upload.fileType,
      name: upload.name,
      files: upload.files.map(file => ({
        filename: file.filename,
        content: file.content,
        accountType: file.accountType,
      })),
    }));

    return NextResponse.json(formattedUploads);
  } catch (error) {
    console.error('Error fetching recent uploads:', error);
    return NextResponse.json({ error: 'Failed to fetch recent uploads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileType, files, name } = body;

    if (!fileType || !files || files.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const uploadName = name || (fileType === 'robinhood'
      ? 'Robinhood'
      : `Chase (${files.length} file${files.length > 1 ? 's' : ''})`);

    const upload = await prisma.recentUpload.create({
      data: {
        fileType,
        name: uploadName,
        files: {
          create: files.map((file: any) => ({
            filename: file.filename,
            content: file.content,
            accountType: file.accountType || null,
          })),
        },
      },
      include: {
        files: true,
      },
    });

    return NextResponse.json({ success: true, id: upload.id });
  } catch (error) {
    console.error('Error saving recent upload:', error);
    return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 });
  }
}
