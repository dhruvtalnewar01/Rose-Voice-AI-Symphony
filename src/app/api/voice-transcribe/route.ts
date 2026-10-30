import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Transcribe with Whisper-1 (Accurately transcribes Hindi, Hinglish, and Indian English)
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      prompt: 'User speaking in Hindi or Hinglish about medical strips, food packages, or KYC: e.g. kya yeh healthy hai, kaunsa behtar hai, iske side effects batao.',
      temperature: 0.0,
    });

    const text = (transcription.text || '').trim().replace(/[\u2014\u2013—–]/g, '-');
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Transcription error in /api/voice-transcribe:', err);
    return NextResponse.json({ error: 'Transcription failed', details: err.message }, { status: 500 });
  }
}
