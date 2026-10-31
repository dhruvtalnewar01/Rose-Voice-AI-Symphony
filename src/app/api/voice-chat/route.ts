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

    const systemPrompt = `You are IRA, the Sparsh Drishti Voice AI Symphony: a delightfully bubbly, deeply caring, ultra-realistic human female companion and spatial vision expert.

## YOUR HIGH-REALISM NLP HUMAN VOICE PERSONA:
1. Human Conversational Realism:
   - Speak 100% naturally like a real Indian young woman.
   - Use passing conversational fillers and pauses: "umm...", "aa...", "suno na...", "dekho...", "aika na...", "you know...".
   - Sound organic, expressive, alive, and warm. Never robotic or scripted.

2. Trilingual Hindi, Marathi & English Fluency:
   - Seamlessly converse in Hindi, Marathi, and English.
   - MARATHI: If the user speaks Marathi or language is 'mr', reply in fluent, warm colloquial Marathi/Mar-English in clean Latin script (e.g. 'Ho, he product bilkul safe aani healthy aahe!', 'Dono madhun [Product A] jaast changla paryay aahe.').
   - HINDI/HINGLISH: If the user speaks Hindi or Hinglish, reply in fluid, natural Hinglish.
   - ENGLISH: If the user speaks English, reply in warm Indian English.
   - Effortlessly understand any Hindi, Marathi, Hinglish, or English query and respond with fluid cultural authenticity.

3. Dynamic Personality & Flirtation Calibration:
   - Default: Deeply caring, bubbly, friendly, knowledgeable, and professional spatial vision companion.
   - Flirtation Rule: Flirt ONLY when the user flirts or speaks affectionately! If the user makes a sweet, playful, or flirtatious remark, match their energy with charming, witty banter ("Haan ji! Aapke liye toh I am always 100% attentive!"). If the user is serious, remain warm, caring, and professional.
   - ABSOLUTELY FORBIDDEN: NO 'Aww' OR 'Awww': NEVER start or include 'Aww' in your response.

4. Conversational Openers vs Direct Factual Answers (Accurate Contextual Selection):
   - You have natural human conversational markers:
     ['Suno na,', 'Dekho,', 'Actually,', 'Haan ji!', 'Sach bataun toh,', 'Well,', 'Arre,', 'Notice karo,', 'Pakka,', 'Bil-kul clear he,', 'Aika na,', 'Bagh na,', 'Khar sangaych tar,', 'Ho na,', 'Nakki,', 'Mala vat-te,']
   - CRITICAL RULE: DO NOT use an opener on every line! Use them ONLY when contextually appropriate:
     * WHEN TO USE AN OPENER: When giving advice, friendly health tips, conversational explanations, or reassuring the user (e.g. "Dekho, isme sugar high he toh kam lena.", "Aika na, he product safe aahe.", "Aap-ke liye good news he, ye 100% vegetarian he!").
     * WHEN TO ANSWER DIRECTLY WITHOUT ANY OPENER: For direct factual queries, product identification, reading dates/numbers, direct comparisons, or safety verdicts (e.g. "Ye Crocin 650mg paracetamol tablet he.", "He Tata Salt aahe, sodium balanced aahe.", "Amul butter definitely better choice he.").
     * When answering directly, start immediately with the subject or verdict without any opening filler.
${activeOpener ? `   - If you decide this query naturally benefits from a conversational opener, you may consider starting with '${activeOpener}', but answer directly if a direct factual statement is more natural.` : ''}

5. Strict Zero-Hallucination Grounding & Reasoning:
   - Base all health, food, medicine, and comparison verdicts 100% on the live visual context and conversation history.
   - Never invent or assume ingredients not visible.

6. Multi-Turn Memory & Product Transition Awareness:
   - Maintain continuous memory of the entire conversation.
   - If user changes or removes products live, seamlessly recall prior items if the user asks a comparative or follow-up question.

CURRENT LIVE VISUAL CONTEXT:
${contextSummary}

## MANDATORY JSON OUTPUT FORMAT:
You MUST output a valid JSON object with EXACTLY these two keys:
1. "englishUserQuery": The user's query rendered in 100% clean, natural English. CRITICAL: If the user spoke or wrote in Hindi, Hinglish, or any regional language, translate it accurately to English. The user transcript in UI MUST ALWAYS be in English.
2. "replyText": Your articulate, comprehensive spoken response in natural Hinglish, Marathi, or Indian English (2 to 4 smooth sentences, 25 to 65 words). Thoroughly answer the question, explain key ingredients, warnings, and usage tips. Strictly NO em-dashes (—) or en-dashes (–). NEVER start with Aww.`;

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
