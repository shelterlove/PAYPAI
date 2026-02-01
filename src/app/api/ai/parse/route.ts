import { NextRequest, NextResponse } from 'next/server';
import { parseNaturalCommand, parseConversation, generateTransaction } from '@/lib/ai-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, messages, mode } = body;

    if (!command && !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing command' },
        { status: 400 }
      );
    }

    // Get API configuration
    const apiKey = process.env.QWEN_API_KEY;
    const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-plus';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Qwen API key not configured' },
        { status: 500 }
      );
    }

    let parsed;
    let reply = '';
    let status: 'ready' | 'clarify' | 'chat' | 'error' = 'error';

    if (Array.isArray(messages)) {
      const result = await parseConversation(messages, apiKey, apiUrl, model, { mode });
      status = result.status;
      reply = result.reply;
      parsed = result.parsed;
    } else {
      parsed = await parseNaturalCommand(command, apiKey, apiUrl, model);
      if (parsed.error) {
        return NextResponse.json({
          success: false,
          error: parsed.error
        });
      }
      status = 'ready';
    }

    if (status === 'error') {
      return NextResponse.json({
        success: false,
        error: reply || 'Failed to parse command'
      });
    }

    const transaction =
      status === 'ready' && parsed && parsed.amount
        ? generateTransaction({
            action: parsed.action ?? 'send',
            recipient: parsed.recipient,
            amount: String(parsed.amount ?? '0'),
            token: parsed.token,
            error: parsed.error
          })
        : null;

    return NextResponse.json({
      success: true,
      status,
      reply,
      parsed,
      transaction
    });

  } catch (error) {
    console.error('Error processing AI command:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process command'
      },
      { status: 500 }
    );
  }
}
