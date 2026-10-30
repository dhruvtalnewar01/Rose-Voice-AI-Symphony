export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured in Netlify' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Rose Voice AI Vision Engine. Analyze the image and output strictly valid JSON matching AnalyzedObject structure with object_title, category (PACKAGED_FOOD | MEDICINE | GENERAL_OBJECT), confidence (0.0 - 1.0), bounding_box (x,y,width,height in percent 0-100), headline_summary, extracted_text_ocr, health_verdict (classification: HEALTHY | MODERATE | UNHEALTHY | NOT_APPLICABLE, reason, risk_factors, safety_warnings), cross_verification (verified, source, notes), structured_attributes (array of {label, value, status: good|warning|neutral}), actionable_insights (array of strings), and initial_voice_greeting_hinglish. No markdown wrapping.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify and analyze the product in this camera frame:' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: 'low' },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
