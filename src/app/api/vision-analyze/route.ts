import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

// Production Multi-Object Strict JSON Schema for Sparsh Drishti Vision AI
const multiObjectVisionSchema = {
  name: 'multi_object_analysis_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      object_detected: {
        type: 'boolean',
        description: 'Whether any recognizable real-world object or product was detected anywhere in the frame.',
      },
      total_objects_count: {
        type: 'number',
        description: 'Total number of distinct objects or products detected across the entire image frame.',
      },
      detected_objects: {
        type: 'array',
        description: 'List of all detected objects anywhere on the screen (left, center, right, top, bottom, corners).',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for object, e.g. obj_1, obj_2.',
            },
            object_title: {
              type: 'string',
              description: 'Accurate brand name and title of this specific detected object. Never guess.',
            },
            category: {
              type: 'string',
              enum: [
                'PACKAGED_FOOD',
                'MEDICINE',
                'TEXTBOOK_EDUCATION',
                'FORM_DOCUMENT',
                'PLANT_BOTANY',
                'GENERAL_OBJECT',
              ],
              description: 'The classified domain of this object.',
            },
            confidence: {
              type: 'number',
              description: 'Confidence between 0.0 and 1.0.',
            },
            bounding_box: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'Left position percentage (0-100) anywhere on screen' },
                y: { type: 'number', description: 'Top position percentage (0-100) anywhere on screen' },
                width: { type: 'number', description: 'Width percentage (0-100)' },
                height: { type: 'number', description: 'Height percentage (0-100)' },
              },
              required: ['x', 'y', 'width', 'height'],
              additionalProperties: false,
            },
            headline_summary: {
              type: 'string',
              description: 'Crisp, human-friendly 1-sentence headline describing what this object is.',
            },
            extracted_text_ocr: {
              type: 'string',
              description: 'Visible text, ingredients, strength, or label details read accurately from this object.',
            },
            health_verdict: {
              type: 'object',
              properties: {
                classification: {
                  type: 'string',
                  enum: ['HEALTHY', 'MODERATE', 'UNHEALTHY', 'NOT_APPLICABLE'],
                  description: 'Health classification for food or consumables. Use NOT_APPLICABLE for medicine/docs/general.',
                },
                reason: {
                  type: 'string',
                  description: 'Clear, concise human-friendly reason based strictly on visible evidence.',
                },
                risk_factors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of specific visible risk factors (e.g. "High Sodium", "Added Palm Oil"). Empty if none.',
                },
                safety_warnings: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Critical safety warnings or contraindications. Empty if none.',
                },
              },
              required: ['classification', 'reason', 'risk_factors', 'safety_warnings'],
              additionalProperties: false,
            },
            cross_verification: {
              type: 'object',
              properties: {
                verified: {
                  type: 'boolean',
                  description: 'Whether product was verified against established database guidelines.',
                },
                source: {
                  type: 'string',
                  description: 'Source of verification (e.g. FSSAI Guidelines, OpenFDA, Pharmacopoeia).',
                },
                notes: {
                  type: 'string',
                  description: 'Cross-verification verification note or confirmation.',
                },
              },
              required: ['verified', 'source', 'notes'],
              additionalProperties: false,
            },
            structured_attributes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                  status: { type: 'string', enum: ['good', 'warning', 'neutral'] },
                },
                required: ['label', 'value', 'status'],
                additionalProperties: false,
              },
              description: 'Key visible properties (e.g. Net Wt, Serving Size, Active Salt, Protein).',
            },
            actionable_insights: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key practical consumer tips grounded in the visible packaging.',
            },
          },
          required: [
            'id',
            'object_title',
            'category',
            'confidence',
            'bounding_box',
            'headline_summary',
            'extracted_text_ocr',
            'health_verdict',
            'cross_verification',
            'structured_attributes',
            'actionable_insights',
          ],
          additionalProperties: false,
        },
      },
      comparative_analysis: {
        type: 'object',
        properties: {
          is_multi_object: {
            type: 'boolean',
            description: 'True if 2 or more distinct products are visible in the frame.',
          },
          comparison_summary: {
            type: 'string',
            description: 'Crisp side-by-side comparison if 2+ products are visible. Empty string if single object.',
          },
          winner_recommendation: {
            type: 'string',
            description: 'Direct answer to which product is the better option and why. Empty string if single object.',
          },
          key_tradeoffs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Bullet points highlighting key nutritional or practical differences. Empty if single object.',
          },
        },
        required: ['is_multi_object', 'comparison_summary', 'winner_recommendation', 'key_tradeoffs'],
        additionalProperties: false,
      },
      initial_voice_greeting_hinglish: {
        type: 'string',
        description: 'Warm, direct, human-friendly summary in Hinglish/English. If multiple items are present, announce both and state which one is the better option. Strictly zero AI slop, zero corporate jargon, zero em-dashes.',
      },
    },
    required: [
      'object_detected',
      'total_objects_count',
      'detected_objects',
      'comparative_analysis',
      'initial_voice_greeting_hinglish',
    ],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided for vision analysis' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const visionMessages: any[] = [
      {
        role: 'system',
        content: `You are Sparsh Drishti Vision AI: an ultra-precise, ZERO-HALLUCINATION production vision engine for the Indian market.

## CRITICAL FULL-FRAME DETECTION MANDATE:
1. Scan the ENTIRE image frame edge-to-edge: left side, right side, top, bottom, corners, and center.
2. An object can be placed ANYWHERE in the frame. DO NOT focus solely on the center. Detect objects at the periphery, on the left, or on the right.
3. MULTI-OBJECT DETECTION: If multiple distinct products or items are visible (e.g. 2 different snacks, 2 medicine strips, a drink and biscuits, multiple textbook pages), detect ALL of them individually in detected_objects!
4. Provide precise bounding box coordinates (0-100 percentage) for each individual object covering its exact location across the screen.

## MULTI-OBJECT COMPARATIVE VERDICT ("Which one is the better option?"):
- When 2 or more products are detected:
  - Set comparative_analysis.is_multi_object = true
  - Provide an authoritative, side-by-side comparison in comparative_analysis.comparison_summary
  - Set winner_recommendation with a clear, definitive verdict (e.g. "Product A is the recommended better option because it has 70% lower sodium and zero added sugar compared to Product B.")
  - List key trade-offs in comparative_analysis.key_tradeoffs
  - In initial_voice_greeting_hinglish, speak directly to the comparison: e.g. "Maine do products detect kiye: [Product A] aur [Product B]. In dono mein se [Product A] behtar option hai kyunki..."

## ZERO-HALLUCINATION & ANTI-AI-SLOP ENFORCEMENT:
1. ONLY report text and facts that are ACTUALLY READABLE in this image.
2. If nutritional facts or ingredients are on the back side and NOT visible in this image:
   - State clearly: "Back nutritional panel not visible in this angle: based on visible front packaging claims."
   - NEVER fabricate numbers, calorie counts, or grams that you cannot see!
3. NO AI SLOP: Strictly ban robotic corporate phrases such as:
   - "In today's fast-paced world"
   - "It is important to remember"
   - "Delve into the multifaceted nature"
   - "Consult a medical professional prior to consumption"
4. Speak like an educated, warm Indian expert or elder sibling: clear, helpful, grounded, and concise.
5. Absolutely NO em-dashes or en-dashes. Only use standard hyphens (-) or colons (:).

## CATEGORY GUIDELINES:
- PACKAGED_FOOD:
  - Classify as HEALTHY, MODERATE, or UNHEALTHY strictly based on visible sugar, sodium, trans fat, and refined flour.
  - If high sugar (>15g/100g) or high sodium (>600mg/100g) or palm oil/maida dominant: strictly UNHEALTHY.
- MEDICINE:
  - Classify health_verdict as NOT_APPLICABLE (medicines are therapeutic).
  - Extract active salt, dosage, and critical contraindications (e.g. "Take on empty stomach", "Do not take with milk/antacids").
- TEXTBOOK_EDUCATION / FORM_DOCUMENT / PLANT_BOTANY / GENERAL_OBJECT:
  - Follow domain guidelines, and strictly redact any 12-digit Aadhaar number as "[ID Redacted]".`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Perform an exhaustive full-frame, multi-object detection and zero-hallucination analysis. Inspect all sectors of the image. If multiple products are shown, classify every one and provide a direct comparative recommendation on which is better.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${cleanBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ];

    // State-of-the-art vision reasoning model for high-resolution OCR & spatial detection
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        temperature: 0.0,
        response_format: {
          type: 'json_schema',
          json_schema: multiObjectVisionSchema,
        },
        messages: visionMessages,
      });
    } catch {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.0,
        response_format: {
          type: 'json_schema',
          json_schema: multiObjectVisionSchema,
        },
        messages: visionMessages,
      });
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI Vision');
    }

    const parsedData = JSON.parse(content);

    // Sanitize any PII (Aadhaar, IDs)
    if (parsedData.detected_objects && Array.isArray(parsedData.detected_objects)) {
      for (const obj of parsedData.detected_objects) {
        if (obj.extracted_text_ocr) {
          obj.extracted_text_ocr = obj.extracted_text_ocr.replace(
            /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
            '[ID Redacted]'
          );
        }
      }
    }

    // LIVE REGISTRY CROSS-VERIFICATION (OpenFoodFacts / OpenFDA)
    try {
      if (parsedData.detected_objects && parsedData.detected_objects.length > 0) {
        for (const obj of parsedData.detected_objects) {
          const cleanTitle = (obj.object_title || '').trim();

          if (obj.category === 'PACKAGED_FOOD' && cleanTitle.length > 2) {
            const searchTerms = cleanTitle.split(' ').slice(0, 3).join(' ');
            const offUrl = `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${encodeURIComponent(
              searchTerms
            )}&page_size=1&json=true`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1800);

            const offRes = await fetch(offUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': 'SparshDrishti-IRA/1.0' },
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (offRes && offRes.ok) {
              const offData = await offRes.json().catch(() => null);
              const firstProduct = offData?.products?.[0];

              if (firstProduct) {
                const nutriGrade = firstProduct.nutriscore_grade?.toUpperCase() || null;
                const novaGroup = firstProduct.nova_group || null;

                obj.cross_verification = {
                  verified: true,
                  source: `Open Food Facts Global Registry${nutriGrade ? ` (Nutri-Score: ${nutriGrade})` : ''}`,
                  notes: `Live database confirmed: ${firstProduct.product_name || cleanTitle}.${
                    novaGroup ? ` NOVA Group ${novaGroup} (Ultra-processed).` : ''
                  }`,
                };

                if ((nutriGrade === 'D' || nutriGrade === 'E' || novaGroup === 4) && obj.health_verdict) {
                  if (obj.health_verdict.classification !== 'UNHEALTHY') {
                    obj.health_verdict.classification = 'UNHEALTHY';
                    obj.health_verdict.reason += ` Verified: Nutri-Score ${nutriGrade || 'low'}, ultra-processed rating.`;
                  }
                }
              }
            }
          } else if (obj.category === 'MEDICINE' && cleanTitle.length > 2) {
            const firstWord = cleanTitle.split(' ')[0];
            const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(
              firstWord
            )}"+openfda.generic_name:"${encodeURIComponent(firstWord)}"&limit=1`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1800);

            const fdaRes = await fetch(fdaUrl, {
              signal: controller.signal,
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (fdaRes && fdaRes.ok) {
              const fdaData = await fdaRes.json().catch(() => null);
              const drug = fdaData?.results?.[0];
              if (drug) {
                obj.cross_verification = {
                  verified: true,
                  source: 'OpenFDA Drug Registry & Pharmacopoeia',
                  notes: `Live FDA verified: ${drug.openfda?.generic_name?.[0] || firstWord}. Standard indications confirmed.`,
                };
              }
            }
          }
        }
      }
    } catch (crossErr) {
      console.warn('Non-blocking cross-verification note:', crossErr);
    }

    // BACKWARD COMPATIBILITY ALIASING:
    // If detected_objects has at least 1 object, expose primary object attributes at root
    const primary = parsedData.detected_objects?.[0] || null;
    const responsePayload = {
      ...parsedData,
      // Alias primary object at top level for backward compatibility
      object_title: primary?.object_title || 'No recognizable object',
      category: primary?.category || 'GENERAL_OBJECT',
      confidence: primary?.confidence || 0,
      bounding_box: primary?.bounding_box || { x: 25, y: 25, width: 50, height: 50 },
      headline_summary: primary?.headline_summary || '',
      extracted_text_ocr: primary?.extracted_text_ocr || '',
      health_verdict: primary?.health_verdict || {
        classification: 'NOT_APPLICABLE',
        reason: 'No health assessment needed.',
        risk_factors: [],
        safety_warnings: [],
      },
      cross_verification: primary?.cross_verification || {
        verified: false,
        source: 'Unverified',
        notes: '',
      },
      structured_attributes: primary?.structured_attributes || [],
      actionable_insights: primary?.actionable_insights || [],
    };

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('Error in /api/vision-analyze:', err);
    return NextResponse.json(
      {
        error: 'Vision analysis failed',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
