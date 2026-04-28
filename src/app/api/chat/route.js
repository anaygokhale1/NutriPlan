import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req) {
  try {
    const { model, max_tokens, messages } = await req.json();

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: max_tokens || 5500,
          messages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta?.type === 'text_delta' &&
            chunk.delta?.text
          ) {
            await writer.write(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        await writer.write(encoder.encode(`\n__STREAM_ERROR__:${err.message}`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
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
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
    },
  });
}
