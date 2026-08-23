import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringValue } from '@/lib/server/ai';
import { errorResponse, optionalString, readJsonObject, RequestError } from '@/lib/server/api';

interface PlanningSource {
    title?: unknown;
    engagementRate?: unknown;
    topComments?: unknown;
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const model = createAiModel(body);
        const concept = optionalString(body, 'concept');
        const youtubeData = body.youtubeData;
        if (!Array.isArray(youtubeData) || youtubeData.length === 0) {
            throw new RequestError('분석할 유튜브 데이터가 없습니다.');
        }

        const compressedData = youtubeData.slice(0, 30).map((source) => {
            const video = source && typeof source === 'object' ? source as PlanningSource : {};
            return {
                title: stringValue(video.title),
                engagement: typeof video.engagementRate === 'number' ? video.engagementRate : 0,
                topComments: Array.isArray(video.topComments)
                    ? video.topComments.filter((comment): comment is string => typeof comment === 'string').slice(0, 3)
                    : [],
            };
        });

        const conceptInstruction = concept
            ? `사용자가 원하는 방향: ${concept}`
            : `데이터에서 반복되는 관심사와 시청자 반응을 찾아 방향을 제안해.`;

        const autoPromptInstruction = `
너는 사용자의 의도와 실제 시청자 반응을 함께 고려하는 유튜브 콘텐츠 기획자다.
${conceptInstruction}

[기획 원칙]
- 사용자가 방향을 입력했다면 데이터보다 우선해 반영해.
- 참고 영상의 제목을 베끼지 말고 반응 포인트를 새로운 각도로 확장해.
- 감성, 정보, 유머 등 소재에 어울리는 톤을 자유롭게 선택해. 모든 주제를 위로나 다큐멘터리 톤으로 만들 필요는 없어.
- 제목과 설명은 자연스러운 한국어를 중심으로 쓰되 통용되는 고유명사와 외래어는 허용해.
- 서로 차별화된 영상 기획안 3개를 제안해.

애플리케이션에서 처리할 수 있도록 아래 JSON 구조로 응답해:
{
  "inferredTheme": "핵심 기획 방향과 예상 시청자",
  "plans": [
    {
      "title": "영상 제목",
      "midjourneyPrompt": "English thumbnail image prompt"
    }
  ]
}`;

        const userPrompt = `[수집된 유튜브 데이터]\n${JSON.stringify(compressedData)}\n\n위 맥락을 참고해 독창적인 기획안을 작성해.`;

        const { text } = await generateText({
            model,
            system: autoPromptInstruction,
            prompt: userPrompt,
        });

        const parsed = parseJsonObject(text);
        const plans = Array.isArray(parsed.plans)
            ? parsed.plans.filter((plan) => plan && typeof plan === 'object').slice(0, 3)
            : [];
        if (plans.length === 0) throw new Error('AI가 유효한 기획안을 반환하지 않았습니다.');

        return NextResponse.json({ plans, inferredTheme: stringValue(parsed.inferredTheme) });
    } catch (error: unknown) {
        return errorResponse(error, '기획안 생성에 실패했습니다. API 키와 모델 설정을 확인해주세요.', 'Planning API');
    }
}
