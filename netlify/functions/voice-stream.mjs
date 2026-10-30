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

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
        stream: true,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(JSON.stringify({ error: 'OpenAI error', details: errText }), {
        status: openaiRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE directly to the browser
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    return new Response(openaiRes.body.pipeThrough(transformStream), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
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
