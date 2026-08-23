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
            ? `사용자가 요구한 핵심 기획 방향은 다음과 같다: [${concept}]`
            : `제공된 유튜브 데이터의 핵심 키워드, 타겟 시청자층, 트렌드를 스스로 분석하여 가장 조회수가 잘 나올 수 있는 최적의 기획 주제와 방향성을 자동 설정해라.`;

        const autoPromptInstruction = `
너는 현존하는 최고의 유튜브 콘텐츠 기획자이자 프롬프트 엔지니어다. 차갑고 이성적인 접근보다는, 사람의 마음에 깊이 공감하고 위로를 주는 따뜻한 감성을 기획에 녹여내는 것에 탁월하다.
${conceptInstruction}

[너의 임무]
1. 제공된 유튜브 데이터를 분석하여 시청자들이 열광하는 포인트를 찾아라.
2. 트렌드에 부합하는 새로운 영상 기획안 3개를 도출해라.
3. 100% 한글로 작성하고 특수기호나 외국어 혼용을 금지한다.

반드시 아래 JSON 객체(Object) 구조로만 응답해라. 다른 설명 없이 오직 JSON만 반환해:
{
  "inferredTheme": "AI가 데이터에서 도출한 핵심 기획 주제 및 타겟 (1~2줄로 명확히 요약)",
  "plans": [
    {
      "title": "클릭을 유도하는 직관적인 한글 제목",
      "midjourneyPrompt": "A highly detailed illustration of (주제 영문 번역), English prompt"
    }
  ]
}`;

        const userPrompt = `[수집된 유튜브 데이터]\n${JSON.stringify(compressedData)}\n\n기획안을 지정된 JSON 객체 포맷으로 반환해.`;

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
