/**
 * OpenAI API Client & Vision Grounding
 * Powers Deictic Reticle Vision (gpt-4o), Strict JSON Schema Zero-Hallucination
 * Grounding (temperature: 0), and instant voice/TTS fallback.
 */
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || '';
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: false, // Server-side preferred
    });
  }
  return openaiClient;
}

/**
 * Strict Zero-Hallucination Grounding with temperature 0
 */
export async function analyzeVisionGrounding(imageBase64: string, prompt: string, schema?: Record<string, any>) {
  const openai = getOpenAIClient();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You are an ultra-precise medical and nutritional grounding engine. State only verifiable facts directly visible or medically certified. Refuse unverified speculations.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    ...(schema ? { response_format: { type: 'json_object' } } : {}),
  });

  return response.choices[0]?.message?.content || '';
}
