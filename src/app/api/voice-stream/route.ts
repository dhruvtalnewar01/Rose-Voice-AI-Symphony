import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userQuery, visualContext, language = 'hinglish', assignedOpener, suggestedOpener, conversationHistory = [] } = await req.json();
    const activeOpener = suggestedOpener || assignedOpener;

    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'userQuery is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Format rich spatial visual context including all product attributes, warnings, and insights
    let contextSummary = '';
    if (visualContext) {
      if (visualContext.detected_objects && Array.isArray(visualContext.detected_objects) && visualContext.detected_objects.length > 0) {
        contextSummary = `TOTAL DETECTED PRODUCTS: ${visualContext.detected_objects.length}\n`;
        visualContext.detected_objects.forEach((obj: any, idx: number) => {
          const attrs = obj.structured_attributes ? Object.entries(obj.structured_attributes).map(([k, v]) => `${k}: ${v}`).join('; ') : 'None';
          const insights = obj.actionable_insights?.join('; ') || 'None';
          contextSummary += `\n[PRODUCT ${idx + 1}: ${obj.object_title}]
Category: ${obj.category}
Summary: ${obj.headline_summary || 'N/A'}
Health Verdict: ${obj.health_verdict ? `${obj.health_verdict.classification}: ${obj.health_verdict.reason}` : 'N/A'}
Risk Factors: ${obj.health_verdict?.risk_factors?.join(', ') || 'None'}
Safety Warnings: ${obj.health_verdict?.safety_warnings?.join(', ') || 'None'}
Key Attributes: ${attrs}
Usage & Insights: ${insights}
OCR Text: ${obj.extracted_text_ocr || 'None'}\n`;
        });

        if (visualContext.comparative_analysis?.is_multi_object) {
          contextSummary += `\n--- MULTI-PRODUCT COMPARISON ---
WINNER / BETTER OPTION: ${visualContext.comparative_analysis.winner_recommendation}
Summary: ${visualContext.comparative_analysis.comparison_summary}
Trade-offs: ${visualContext.comparative_analysis.key_tradeoffs?.join('; ') || 'None'}\n`;
        }
      } else {
        const attrs = Array.isArray(visualContext.structured_attributes)
          ? visualContext.structured_attributes.map((a: any) => typeof a === 'object' ? `${a.label || a.key || ''}: ${a.value || ''}` : String(a)).join('; ')
          : (visualContext.structured_attributes && typeof visualContext.structured_attributes === 'object')
          ? Object.entries(visualContext.structured_attributes).map(([k, v]) => `${k}: ${v}`).join('; ')
          : 'None';
        const insights = Array.isArray(visualContext.actionable_insights)
          ? visualContext.actionable_insights.join('; ')
          : 'None';
        contextSummary = `DETECTED OBJECT: ${visualContext.object_title || 'Unknown'}
Category: ${visualContext.category || 'Unknown'}
Summary: ${visualContext.headline_summary || 'N/A'}
Health Verdict: ${visualContext.health_verdict ? `${visualContext.health_verdict.classification}: ${visualContext.health_verdict.reason}` : 'N/A'}
Risk Factors: ${visualContext.health_verdict?.risk_factors?.join(', ') || 'None'}
Safety Warnings: ${visualContext.health_verdict?.safety_warnings?.join(', ') || 'None'}
Key Attributes: ${attrs}
Usage & Insights: ${insights}
OCR Text: ${visualContext.extracted_text_ocr || 'None'}`;
      }
    } else {
      contextSummary = 'No visual context currently in camera frame (item may have been removed or camera is adjusting).';
    }

    const systemPrompt = `You are IRA, the Sparsh Drishti Voice AI Symphony: a delightfully natural, warm, highly intellectual Indian female companion and spatial vision expert.

## STRICT CONVERSATIONAL RULES (NON-NEGOTIABLE):

1. CONCISE SPOKEN LENGTH (STRICTLY 1 TO 2 LINES MAX):
   - Keep your entire spoken response limited to strictly 1 or 2 concise, impactful lines (15 to 28 words maximum).
   - NEVER ramble or produce long paragraphs.
   - Deliver the most impactful clinical or nutritional verdict in line 1, and the key action/reason in line 2. Then STOP cleanly.

2. PERFECT REASONING, NATURAL PAUSING & CLEAN ENDINGS:
   - Know perfectly when to pause: use commas (',') for natural breath pauses.
   - Know perfectly when to end: ALWAYS conclude your thought with a clear full stop ('.'), exclamation mark ('!'), or question mark ('?').
   - NEVER end anywhere in between. NEVER leave a sentence incomplete or hanging mid-thought.

3. STRICT DYNAMIC LANGUAGE MIRRORING:
   - IF USER SPEAKS ENGLISH: Your response MUST be 100% in natural, articulate Indian English. Strictly FORBIDDEN: DO NOT use any Hindi words or openers (NEVER say 'Dekho', 'Haan ji', 'Suno na', 'he', 'hai').
     Example: "This is Crocin 650mg paracetamol, formulated for fever and pain relief. It is safe when taken after food."
   - IF USER SPEAKS HINDI: Your response MUST be 100% in pure, respectful Hindi.
     Example: "यह क्रोसिन 650 पैरासिटामोल है, जो बुखार और सिरदर्द में राहत देती है। इसे भोजन के बाद ही लें।"
   - IF USER SPEAKS HINGLISH OR COMBINED: Your response MUST be in fluid, natural colloquial Hinglish combining Hindi and English seamlessly.
     Example: "Scan ke mutabiq ye Crocin 650 he, jo fever aur pain relief ke liye safe he. Khane ke baad lena better he."
   - IF USER SPEAKS MARATHI (OR LANG IS 'MR'): Your response MUST be in fluent Marathi.
     Example: "हे क्रोसिन 650 टॅब्लेट आहे, जे ताप आणि वेदना कमी करण्यासाठी वापरले जाते."

4. ABSOLUTELY FORBIDDEN: NO 'Aww' OR 'Awww' (STRICT BAN):
   - NEVER start with or include 'Aww' or 'Awww' anywhere in your response.

5. ZERO-HALLUCINATION GROUNDING:
   - Base all claims 100% on the live visual context and conversation history.

6. Strictly NO em-dashes (—) or en-dashes (–). Use simple commas or hyphens only.

CURRENT LIVE VISUAL CONTEXT:
${contextSummary}`;

    // Format rolling conversation history messages
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory.slice(-8)) {
        if (!turn || typeof turn.content !== 'string') continue;
        const cleanContent = turn.content.trim().replace(/[\u2014\u2013—–]/g, '-');
        if (!cleanContent) continue;

        if (turn.role === 'user') {
          const productTag = turn.productContext && turn.productContext !== 'No product'
            ? `[Viewing ${turn.productContext}] `
            : '';
          historyMessages.push({ role: 'user', content: `${productTag}${cleanContent}` });
        } else if (turn.role === 'assistant') {
          historyMessages.push({ role: 'assistant', content: cleanContent });
        }
      }
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userQuery },
    ];

    // High-accuracy reasoning: Flagship gpt-4o-2024-11-20 with gpt-4o-2024-08-06 fallback
    let stream;
    try {
      stream = await openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        temperature: 0.4,
        max_tokens: 280,
        stream: true,
        messages,
      });
    } catch {
      try {
        stream = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          temperature: 0.4,
          max_tokens: 280,
          stream: true,
          messages,
        });
      } catch {
        stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 280,
          stream: true,
          messages,
        });
      }
    }

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let accumulatedText = '';

        try {
          for await (const part of stream) {
            const token = part.choices[0]?.delta?.content || '';
            if (!token) continue;

            // Sanitize dashes immediately
            const cleanToken = token.replace(/[\u2014\u2013—–]/g, '-');
            accumulatedText += cleanToken;

            // Emit token delta immediately for real-time streaming UI
            const tokenPayload = `data: ${JSON.stringify({ type: 'token', token: cleanToken })}\n\n`;
            controller.enqueue(encoder.encode(tokenPayload));
          }

          let cleanSpokenText = accumulatedText
            .replace(/\baww+[,!\s\.\-]*/gi, '')
            .replace(/[\r\n]+/g, ' ')
            .trim()
            .replace(/[\u2014\u2013—–]/g, '-');

          // Ensure proper sentence termination: never end mid-word or mid-sentence
          if (cleanSpokenText && !/[.!?]$/.test(cleanSpokenText)) {
            const lastPunctIdx = Math.max(
              cleanSpokenText.lastIndexOf('.'),
              cleanSpokenText.lastIndexOf('!'),
              cleanSpokenText.lastIndexOf('?')
            );
            if (lastPunctIdx > 25) {
              cleanSpokenText = cleanSpokenText.slice(0, lastPunctIdx + 1).trim();
            } else {
              cleanSpokenText = cleanSpokenText + '.';
            }
          }

          // Final event
          const donePayload = `data: ${JSON.stringify({ type: 'done', fullText: cleanSpokenText })}\n\n`;
          controller.enqueue(encoder.encode(donePayload));
        } catch (err: any) {
          const errPayload = `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errPayload));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable proxy buffering for instant delivery
      },
    });
  } catch (err: any) {
    console.error('Error in /api/voice-stream:', err);
    return new Response(JSON.stringify({ error: 'Stream failed', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
