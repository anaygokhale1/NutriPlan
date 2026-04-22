import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    keyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
    keyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) || 'missing',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')),
  });
}
