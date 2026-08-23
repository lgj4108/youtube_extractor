import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel } from '@/lib/server/ai';
import { errorResponse, readJsonObject } from '@/lib/server/api';

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const model = createAiModel(body);
        await generateText({
            model,
            prompt: 'Reply with only the word OK.',
            temperature: 0,
        });
        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        return errorResponse(error, 'AI에 연결하지 못했습니다. API 키, 사용 한도와 결제 설정을 확인해주세요.', 'AI connection test');
    }
}
