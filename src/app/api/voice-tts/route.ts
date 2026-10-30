import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'shimmer' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required for TTS synthesis' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured for server-side TTS' },
        { status: 404 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Sanitize text: strip Aww and remove any long dashes
    const cleanText = text
      .replace(/\baww+[,!\s\.\-]*/gi, '')
      .replace(/[\u2014\u2013—–]/g, '-')
      .trim();

    // High clarity audio synthesis using warm natural female voice (nova default)
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: (voice || 'nova') as any,
      input: cleanText,
      response_format: 'mp3',
      speed: 1.05,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error generating audio in /api/voice-tts:', error);
    return NextResponse.json(
      { error: 'TTS generation failed', details: error.message },
      { status: 500 }
    );
  }
}
