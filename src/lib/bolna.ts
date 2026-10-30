/**
 * Bolna AI Voice Adapter
 * Autonomous voice agent orchestration & telephony pipeline
 * Powered by Bolna Voice AI & OpenAI Flagship Orchestration
 */

export interface BolnaCallConfig {
  agent_id: string;
  recipient_phone_number?: string;
  user_data?: Record<string, any>;
}

export async function initiateBolnaCall(config: BolnaCallConfig) {
  const apiKey = process.env.BOLNA_API_KEY;
  if (!apiKey) {
    throw new Error('BOLNA_API_KEY is not configured in environment.');
  }

  const response = await fetch('https://api.bolna.dev/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bolna call failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
