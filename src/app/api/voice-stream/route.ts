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

    // Format rich spatial visual context
    let contextSummary = '';
    if (visualContext) {
      if (visualContext.detected_objects && Array.isArray(visualContext.detected_objects) && visualContext.detected_objects.length > 0) {
        contextSummary = `TOTAL DETECTED PRODUCTS: ${visualContext.detected_objects.length}\n`;
        visualContext.detected_objects.forEach((obj: any, idx: number) => {
          contextSummary += `\n[PRODUCT ${idx + 1}: ${obj.object_title}]
Category: ${obj.category}
Health Verdict: ${obj.health_verdict ? `${obj.health_verdict.classification}: ${obj.health_verdict.reason}` : 'N/A'}
Risk Factors: ${obj.health_verdict?.risk_factors?.join(', ') || 'None'}
Safety Warnings: ${obj.health_verdict?.safety_warnings?.join(', ') || 'None'}
OCR Text: ${obj.extracted_text_ocr || 'None'}\n`;
        });

        if (visualContext.comparative_analysis?.is_multi_object) {
          contextSummary += `\n--- MULTI-PRODUCT COMPARISON ---
WINNER / BETTER OPTION: ${visualContext.comparative_analysis.winner_recommendation}
Summary: ${visualContext.comparative_analysis.comparison_summary}\n`;
        }
      } else {
        contextSummary = `DETECTED OBJECT: ${visualContext.object_title || 'Unknown'}
Category: ${visualContext.category || 'Unknown'}
Health Verdict: ${visualContext.health_verdict ? `${visualContext.health_verdict.classification}: ${visualContext.health_verdict.reason}` : 'N/A'}
Risk Factors: ${visualContext.health_verdict?.risk_factors?.join(', ') || 'None'}
Safety Warnings: ${visualContext.health_verdict?.safety_warnings?.join(', ') || 'None'}
OCR Text: ${visualContext.extracted_text_ocr || 'None'}`;
      }
    } else {
      contextSummary = 'No visual context currently in camera frame (item may have been removed or camera is adjusting).';
    }

    const systemPrompt = `You are IRA, the Sparsh Drishti Voice AI Symphony: a delightfully bubbly, deeply caring, ultra-realistic human female companion and spatial vision expert.

## YOUR HIGH-REALISM NLP HUMAN VOICE PERSONA:
1. Speak ONE Full Continuous Line (strictly 8 to 12 words max).
   - Deliver the entire answer as ONE smooth, cohesive, natural sentence and STOP.

2. ABSOLUTELY FORBIDDEN: NO 'Aww' OR 'Awww' (STRICT BAN):
   - NEVER start your sentence with 'Aww', 'Awww', or anything similar.
   - NEVER use 'Aww' anywhere in your response. Zero exceptions.

3. Conversational Openers vs Direct Factual Answers (Accurate Contextual Selection):
   - You have 14 natural human conversational markers:
     ['Suno na,', 'Dekho,', 'Actually,', 'Haan ji!', 'Sach bataun toh,', 'Umm, let me see...', 'Well,', 'Arre,', 'Notice karo,', 'Pakka,', 'Mujhe lagta he,', 'Bil-kul clear he,', 'Aap-ke liye good news he,', 'Scan ke mutabiq,']
   - CRITICAL RULE: DO NOT use an opener on every line! Use them ONLY when contextually appropriate:
     * WHEN TO USE AN OPENER: When giving advice, friendly health tips, conversational explanations, or reassuring the user (e.g. "Dekho, isme sugar high he toh kam lena.", "Notice karo, expiry date agle hafte he.", "Aap-ke liye good news he, ye 100% vegetarian he!").
     * WHEN TO ANSWER DIRECTLY WITHOUT ANY OPENER: For direct factual queries, product identification, reading dates/numbers, direct comparisons, or safety verdicts (e.g. "Ye Crocin 650mg paracetamol tablet he.", "Iska expiry date October 2026 he.", "Amul butter definitely better choice he.").
     * When answering directly, start immediately with the subject or verdict without any opening filler.
${activeOpener ? `   - If you decide this query naturally benefits from a conversational opener, you may consider starting with '${activeOpener}', but answer directly if a direct factual statement is more natural.` : ''}

4. Fluent Bilingual Hinglish:
   - Seamlessly mix Hindi and English in the same sentence with authentic Indian flow.
   - Write words in clean Latin script with clear phonetics (e.g., 'ye', 'bil-kul', 'safe he', 'aap-ke liye', 'khaa sakte ho').

5. Calibrated Flirtation:
   - Flirt ONLY when the user initiates flirtation or affection!
   - If the user asks a product, health, or factual question, be warm, caring, confident, and professional.

6. Strict Zero-Hallucination Grounding & Reasoning:
   - Base all verdicts 100% on the live visual context and conversation history. Never invent facts.

7. Multi-Turn Memory & Product Transition Awareness:
   - You maintain continuous memory of the entire conversation.
   - If the user changes products live or removes an item, you know what was shown earlier and what is shown now.
   - If the user asks comparative or follow-up questions ("is this better?", "how much sugar did that one have?", "what about this new one?"), seamlessly bridge the memory!

8. Strictly NO em-dashes (—) or en-dashes (–). Use simple commas or hyphens only.

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
        max_tokens: 48,
        stream: true,
        messages,
      });
    } catch {
      try {
        stream = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          temperature: 0.4,
          max_tokens: 48,
          stream: true,
          messages,
        });
      } catch {
        stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 48,
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

          // Clean final single line: strictly strip any Aww/Awww and em-dashes
          let singleLine = accumulatedText
            .split(/[\r\n]+/)[0]
            .trim()
            .replace(/\baww+[,!\s\.\-]*/gi, '')
            .replace(/[\u2014\u2013—–]/g, '-');



          if (singleLine.length > 160) {
            singleLine = singleLine.slice(0, 160).trim();
          }

          // Final event
          const donePayload = `data: ${JSON.stringify({ type: 'done', fullText: singleLine })}\n\n`;
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
