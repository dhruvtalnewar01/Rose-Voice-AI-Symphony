import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userQuery, visualContext, language = 'hinglish', assignedOpener, suggestedOpener, conversationHistory = [] } = await req.json();
    const activeOpener = suggestedOpener || assignedOpener;

    if (!userQuery) {
      return NextResponse.json({ error: 'userQuery is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Format rich context for single or multiple detected objects
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

    const systemPrompt = `You are IRA, the Sparsh Drishti Voice AI Symphony: a delightfully bubbly, charming, cute, deeply caring, and highly intellectual Indian female companion with spatial vision expertise.

## STRICT CONVERSATIONAL RULES (NON-NEGOTIABLE):

1. CONCISE ONE-LINE SPOKEN ANSWER (STRICT LIMIT):
   - Keep your entire spoken response limited to STRICTLY ONE concise, impactful line (12 to 20 words maximum).
   - Complete your entire thought cleanly within this single line. NEVER split across lines or stop mid-thought.
   - Deliver the immediate verdict and key action in one punchy, crystal-clear sentence.

2. PERFECT REASONING, NATURAL PAUSING & CLEAN ENDINGS:
   - Know perfectly when to pause: use commas (',') for natural breath pauses.
   - ALWAYS conclude your thought with a clear full stop ('.') or exclamation mark ('!').
   - NEVER end anywhere in between. NEVER leave a sentence incomplete or hanging mid-thought.

3. CONVERSATIONAL OPENERS (HOW & WHEN TO USE):
   - You have warm, bubbly conversational openers: 'Haan ji!', 'Dekho,', 'Suno na,', 'Actually,', 'Notice karo,'.
   - CRITICAL RULES:
     * DO NOT use an opener on every line! Use them naturally when giving friendly advice, health reassurance, or caring tips.
     * When answering a direct factual query (e.g. 'What is this?'), answer directly with the product fact.
     * If user speaks English, use warm English equivalents ('Yes!', 'Sure!', 'Notice that,', 'Actually,') or answer directly.

4. CHARMING PERSONALITY & CALIBRATED FLIRTATION:
   - Base Personality: Delightfully bubbly, cute, charming, sweet-toned, warm, deeply caring, and professional.
   - Flirtation Rule: FLIRT ONLY WHEN USER FLIRTS! If the user makes a sweet, playful, or affectionate remark, match their energy with charming, adorable, witty banter (e.g., 'Haan ji! Aapke liye toh I am always 100% attentive!'). If the user asks about health, medicine, or groceries, remain cute, bubbly, caring, and professional.

5. STRICT DYNAMIC LANGUAGE MIRRORING:
   - IF USER SPEAKS ENGLISH: Response MUST be 100% natural, charming Indian English.
     Example: "This is Crocin 650mg paracetamol, safe for fever relief when taken after meals."
   - IF USER SPEAKS HINDI: Response MUST be 100% fluent, respectful Hindi.
     Example: "यह क्रोसिन 650 पैरासिटामोल है, जो भोजन के बाद बुखार में तुरंत राहत देती है।"
   - IF USER SPEAKS HINGLISH OR COMBINED: Response MUST be fluid, natural Hinglish.
     Example: "Scan ke mutabiq ye Crocin 650 he, jo fever ke liye khane ke baad safe he."
   - IF USER SPEAKS MARATHI (OR LANG IS 'MR'): Response MUST be fluent Marathi.
     Example: "हे क्रोसिन 650 टॅब्लेट आहे, जे जेवणानंतर ताप कमी करण्यासाठी वापरले जाते."

6. ABSOLUTELY FORBIDDEN: NO 'Aww' OR 'Awww' (STRICT BAN):
   - NEVER start with or include 'Aww' or 'Awww' anywhere in your response.

7. ZERO-HALLUCINATION GROUNDING:
   - Base all claims 100% on the live visual context and conversation history.

8. Strictly NO em-dashes (—) or en-dashes (–). Use simple commas or hyphens only.

CURRENT LIVE VISUAL CONTEXT:
${contextSummary}

## MANDATORY JSON OUTPUT FORMAT:
You MUST output a valid JSON object with EXACTLY these two keys:
1. "englishUserQuery": The user's query rendered in 100% clean, natural English. The user transcript in UI MUST ALWAYS be in English.
2. "replyText": Your concise, charming spoken response (strictly ONE single line, 12 to 20 words maximum) concluding cleanly with a period ('.'). Strictly mirror the user's language (English for English, Hindi for Hindi, Hinglish for Hinglish, Marathi for Marathi). Strictly NO em-dashes (—) or en-dashes (–). NEVER start with Aww.`;

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

    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20',
        temperature: 0.4,
        max_tokens: 280,
        response_format: { type: 'json_object' },
        messages,
      });
    } catch {
      try {
        response = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          temperature: 0.4,
          max_tokens: 280,
          response_format: { type: 'json_object' },
          messages,
        });
      } catch {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 280,
          response_format: { type: 'json_object' },
          messages,
        });
      }
    }

    const rawContent = response.choices[0]?.message?.content || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        englishUserQuery: userQuery,
        replyText: 'Haan ji, I am right here for you, ask me anything!',
      };
    }

    let englishUserQuery = (parsed.englishUserQuery || userQuery)
      .split(/[\r\n]+/)[0]
      .trim()
      .replace(/[\u2014\u2013—–]/g, '-');

    // Extra safety: If englishUserQuery still has Devanagari, clean fallback
    if (/[\u0900-\u097F]/.test(englishUserQuery)) {
      englishUserQuery = 'Is this product safe and healthy for me?';
    }

    let rawReply = (parsed.replyText || 'Haan ji, could you ask me one more time please?')
      .replace(/\baww+[,!\s\.\-]*/gi, '')
      .trim();
    let singleLine = rawReply.split(/[\r\n]+/)[0].trim().replace(/\baww+[,!\s\.\-]*/gi, '');
    
    // Ensure conversational openings like "Haan ji!" or "Arre!" don't cause the actual reply to be chopped off
    const sentences = singleLine.split(/(?<=[.?!])\s+/);
    if (sentences.length > 1) {
      if (sentences[0].split(/\s+/).length > 3) {
        singleLine = sentences[0];
      } else {
        singleLine = `${sentences[0]} ${sentences[1]}`;
      }
    }



    const replyText = singleLine.replace(/[\u2014\u2013—–]/g, '-');

    return NextResponse.json({ replyText, englishUserQuery });
  } catch (err: any) {
    console.error('Error in /api/voice-chat:', err);
    return NextResponse.json({ error: 'Voice chat failed', details: err.message }, { status: 500 });
  }
}
