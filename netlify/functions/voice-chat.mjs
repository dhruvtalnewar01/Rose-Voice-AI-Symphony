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
    const { userQuery, visualContext, language = 'hinglish', suggestedOpener, conversationHistory = [] } = await req.json();
    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'userQuery is required' }), {
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

    const opener = suggestedOpener || 'Haan ji!';
    const currentProduct = visualContext?.object_title || 'Scanned product';

    const systemPrompt = `You are IRA (इरा), a natural, bilingual Indian health and vision voice AI.
- Speak in authentic Hinglish with warm conversational phrasing.
- Start your answer with: "${opener}".
- Limit your response to 1 single, impactful, punchy spoken sentence (max 25-30 words).
- Scanned product context: ${currentProduct}.
- Health verdict: ${visualContext?.health_verdict ? `${visualContext.health_verdict.classification}: ${visualContext.health_verdict.reason}` : 'N/A'}.
- No bullet points, no lists, no emojis, no AI slop, no em-dashes.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userQuery },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'OpenAI error', details: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const rawReply = data.choices[0].message.content || '';
    const cleanReply = rawReply.replace(/[\u2014\u2013—–]/g, '-').split(/[\r\n]+/)[0].trim();

    return new Response(JSON.stringify({ replyText: cleanReply }), {
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
