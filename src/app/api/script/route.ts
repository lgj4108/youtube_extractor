import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel } from '@/lib/server/ai';
import { errorResponse, optionalString, readJsonObject, requiredString } from '@/lib/server/api';

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const model = createAiModel(body);
        const title = requiredString(body, 'title', '기획안 제목이 없습니다.');
        const format = body.format === 'long' ? 'long' : 'short';
        const cleanContext = optionalString(body, 'systemPrompt').slice(0, 12_000);

        // 포맷에 따른 지시사항 다이내믹 바인딩
        let scriptInstruction = '';

        if (format === 'long') {
            scriptInstruction = `
너는 시청자가 이해하기 쉬운 흐름을 설계하는 유튜브 롱폼 작가다.

[기획 배경]
${cleanContext}

[작성 방향]
- 약 8~12분 분량을 목표로 하되 소재에 알맞은 길이와 구조를 선택해.
- 초반에는 시청 이유를 명확히 하고, 본문은 근거·사례·전환이 자연스럽게 이어지게 해.
- 내레이션, 대화, 인터뷰, 화면 지문 중 주제에 어울리는 방식을 자유롭게 조합해.
- 확인되지 않은 사실은 단정하지 말고, 사용자 맥락에 없는 수치나 인용을 지어내지 마.
- 자연스러운 한국어를 중심으로 작성하되 필요한 고유명사와 외래어는 사용할 수 있어.
- 구독 유도 문구는 내용과 어울릴 때만 자연스럽게 넣어.
`;
        } else {
            scriptInstruction = `
너는 짧고 선명한 유튜브 숏츠 대본을 쓰는 작가다.
[기획 배경]
${cleanContext}

[작성 방향]
- 60초 이내에서 핵심 메시지가 하나로 모이게 해.
- 첫 문장은 과장된 낚시보다 호기심과 시청 이유를 빠르게 전달해.
- 내레이션, 대화, 화면 자막 중 소재에 어울리는 형식을 선택해.
- 자연스러운 한국어를 중심으로 쓰고 필요한 고유명사와 외래어는 허용해.
- 사용자 맥락에 없는 사실이나 수치를 지어내지 마.
`;
        }

        const { text } = await generateText({
            model,
            system: scriptInstruction,
            prompt: `제목 "${title}"에 맞는 ${format === 'long' ? '롱폼 영상 대본' : '숏츠 대본'}을 작성해줘.`,
        });

        return NextResponse.json({ script: text.trim() });

    } catch (error: unknown) {
        return errorResponse(error, '대본 생성 중 오류가 발생했습니다.', 'Script API');
    }
}
