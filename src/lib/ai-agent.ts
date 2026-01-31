import { ethers } from 'ethers';

/**
 * AI Agent Service
 * Integrates with Qwen API for natural language processing
 */

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ParsedCommand = {
  action?: string;
  recipient?: string;
  amount?: string;
  token?: string;
};

type ParseResponse = {
  status: 'ready' | 'clarify' | 'chat' | 'error';
  reply: string;
  parsed?: ParsedCommand;
  error?: string;
};

function extractJson(content: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  return jsonMatch[0];
}

export async function parseConversation(
  messages: ChatMessage[],
  apiKey: string,
  apiUrl: string,
  model: string,
  options?: { mode?: 'chat' | 'auto' }
): Promise<ParseResponse> {
  try {
    const mode = options?.mode ?? 'auto';
    const systemPrompt = mode === 'chat'
      ? `You are PayPai, an AI blockchain payment assistant.
The user is asking a general or follow-up question. Respond helpfully and DO NOT initiate or prepare any transaction.
Always return JSON with status "chat" and a friendly reply. If needed, reference prior conversation.

Return ONLY a strict JSON object with this schema:
{
  "status": "chat",
  "reply": "short assistant reply to the user",
  "parsed": {}
}`
      : `You are PayPai, an AI blockchain payment assistant.
Only prepare a transaction if the user's LATEST message explicitly requests an on-chain action (send/transfer/pay/approve/swap/withdraw).
Do NOT infer a transaction from prior context alone or from memory questions like "do you remember the address".
If the user is asking a general question (e.g. "who are you" or "do you remember Alice's address"), reply normally without forcing a transaction.

Return ONLY a strict JSON object with this schema:
{
  "status": "ready" | "clarify" | "chat" | "error",
  "reply": "short assistant reply to the user",
  "parsed": {
    "action": "send",
    "recipient": "0x...",
    "amount": "0.01",
    "token": "ETH"
  }
}

Rules:
- For normal conversation unrelated to transactions, use status "chat" and provide a friendly reply.
- If anything required for a transaction is missing, set status "clarify" and ask a SINGLE clear question.
- If the user asks to cancel or the request is unsafe, set status "error" with a brief reply.
- Only output JSON. No extra text.`;

    const payloadMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: {
          messages: payloadMessages
        },
        parameters: {
          temperature: 0.3,
          max_tokens: 500,
          result_format: 'message'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = '';

    if (data.output?.choices?.[0]?.message?.content) {
      content = data.output.choices[0].message.content;
    } else if (data.output?.text) {
      content = data.output.text;
    } else if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
    } else {
      throw new Error('Unexpected API response format. Expected data.output.choices[0].message.content');
    }

    const jsonString = extractJson(content);
    if (!jsonString) {
      if (mode === 'chat') {
        return {
          status: 'chat',
          reply: content || 'How can I help you today?',
          parsed: {}
        };
      }
      return {
        status: 'clarify',
        reply: 'I could not parse the request. What recipient address should I send to?',
        parsed: {}
      };
    }

    const parsed = JSON.parse(jsonString) as ParseResponse;
    if (!parsed.status || !parsed.reply) {
      if (mode === 'chat') {
        return {
          status: 'chat',
          reply: content || 'How can I help you today?',
          parsed: {}
        };
      }
      return {
        status: 'clarify',
        reply: 'I need more details to proceed. What should I send and to which address?',
        parsed: {}
      };
    }

    if (parsed.status === 'chat') {
      return parsed;
    }

    if (mode === 'chat') {
      return {
        status: 'chat',
        reply: parsed.reply || content || 'How can I help you today?',
        parsed: {}
      };
    }

    if (parsed.status === 'ready') {
      const missing: string[] = [];
      if (!parsed.parsed?.recipient) missing.push('recipient address');
      if (!parsed.parsed?.amount) missing.push('amount');
      if (missing.length) {
        return {
          status: 'clarify',
          reply: `I still need the ${missing.join(' and ')}. Can you provide it?`,
          parsed: parsed.parsed || {}
        };
      }
      if (!parsed.parsed?.action) {
        parsed.parsed = { ...parsed.parsed, action: 'send' };
      }
      if (!parsed.parsed?.token) {
        parsed.parsed = { ...parsed.parsed, token: 'ETH' };
      }
    }

    if (parsed.parsed?.recipient && !ethers.isAddress(parsed.parsed.recipient)) {
      return {
        status: 'clarify',
        reply: 'That recipient address looks invalid. Can you provide a valid address?',
        parsed: { ...parsed.parsed, recipient: undefined }
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing conversation:', error);
    return {
      status: 'error',
      reply: error instanceof Error ? error.message : 'Failed to parse command'
    };
  }
}

/**
 * Parse natural language command into transaction parameters
 */
export async function parseNaturalCommand(
  command: string,
  apiKey: string,
  apiUrl: string,
  model: string
): Promise<{
  action: string;
  recipient?: string;
  amount: string;
  token?: string;
  error?: string;
}> {
  try {
    const response = await parseConversation(
      [{ role: 'user', content: command }],
      apiKey,
      apiUrl,
      model
    );

    if (response.status !== 'ready' || !response.parsed) {
      return {
        action: 'error',
        amount: '0',
        error: response.reply || 'Failed to parse command'
      };
    }

    return {
      action: response.parsed.action || 'send',
      recipient: response.parsed.recipient,
      amount: response.parsed.amount?.toString() || '0',
      token: response.parsed.token || 'ETH'
    };

  } catch (error) {
    console.error('Error parsing command:', error);
    return {
      action: 'error',
      amount: '0',
      error: error instanceof Error ? error.message : 'Failed to parse command'
    };
  }
}

/**
 * Generate transaction from parsed command
 */
export function generateTransaction(parsed: {
  action: string;
  recipient?: string;
  amount: string;
  token?: string;
  error?: string;
}) {
  if (parsed.error || !parsed.recipient) {
    return null;
  }

  // Convert amount to bigint
  const decimals = parsed.token === 'ETH' ? 18 : 18;
  const amountBigInt = ethers.parseUnits(parsed.amount, decimals);

  return {
    target: parsed.recipient,
    value: parsed.token === 'ETH' ? amountBigInt.toString() : '0',
    callData: '0x', // Simple ETH transfer
    token: parsed.token
  };
}

/**
 * Format transaction for display
 */
export function formatTransaction(tx: {
  target: string;
  value: bigint;
  callData: string;
  token: string;
}) {
  if (tx.token === 'ETH') {
    return {
      type: 'ETH Transfer',
      to: tx.target,
      value: ethers.formatEther(tx.value),
      unit: 'ETH'
    };
  }

  return {
    type: 'Token Transfer',
    to: tx.target,
    value: tx.value.toString(),
    token: tx.token
  };
}
