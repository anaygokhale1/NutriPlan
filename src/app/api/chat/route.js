export const maxDuration = 120;

export async function POST(req) {
  try {
    const { model, max_tokens, messages } = await req.json();

    // Call Anthropic directly with fetch — no SDK needed
    // stream: true tells Anthropic to send tokens as server-sent events
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 5500,
        stream: true,
        messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.text();
      return new Response(
        JSON.stringify({ error: err }),
        { status: anthropicResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Anthropic returns server-sent events (SSE) — lines like:
    //   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}
    // We parse each line and forward just the text to the browser.
    const encoder = new TextEncoder();
    const transform = new TransformStream({
      transform(chunk, controller) {
        // Decode the raw bytes into a string
        const text = new TextDecoder().decode(chunk);

        // Each SSE message is on its own line starting with "data: "
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // We only care about text delta events
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta?.text
            ) {
              // Forward the raw text token to the browser immediately
              controller.enqueue(encoder.encode(parsed.delta.text));
            }
          } catch {
            // Skip any lines that aren't valid JSON
          }
        }
      },
    });

    // Pipe Anthropic's SSE stream through our transformer to the browser
    anthropicResponse.body.pipeThrough(transform);

    return new Response(transform.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
