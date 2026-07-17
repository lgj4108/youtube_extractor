import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
    try {
        const { provider, apiKey, youtubeData, concept } = await request.json();

        if (!apiKey) return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 400 });
        if (!youtubeData || youtubeData.length === 0) return NextResponse.json({ error: '분석할 데이터가 없습니다.' }, { status: 400 });

        let model;
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });
            model = google('gemini-2.0-flash');
        } else if (provider === 'groq') {
            const groq = createOpenAI({ apiKey: apiKey.trim(), baseURL: 'https://api.groq.com/openai/v1' });
            model = groq('llama-3.3-70b-versatile');
        } else if (provider === 'openai') {
            const openai = createOpenAI({ apiKey: apiKey.trim() });
            model = openai('gpt-4o-mini');
        } else {
            return NextResponse.json({ error: '지원하지 않는 프로바이더입니다.' }, { status: 400 });
        }

        const compressedData = youtubeData.map((v: any) => ({
            title: v.title,
            engagement: v.engagementRate,
            topComments: v.topComments
        }));

        const conceptInstruction = concept && concept.trim() !== ''
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

        // 객체 {} 형태를 추출하도록 정규식 수정
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON 객체를 찾을 수 없습니다.");

        const parsed = JSON.parse(match[0]);

        // 안전한 파싱 핸들링
        const plans = Array.isArray(parsed) ? parsed : (parsed.plans || []);
        const inferredTheme = parsed.inferredTheme || '';

        return NextResponse.json({ plans, inferredTheme });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: `기획안 생성 실패: 데이터 파싱 오류 또는 API 에러입니다.` }, { status: 500 });
    }
}