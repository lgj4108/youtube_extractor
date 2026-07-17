import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
    try {
        // format 파라미터를 추가로 받습니다 ('short' | 'long')
        const { provider, apiKey, title, systemPrompt, format } = await request.json();

        if (!apiKey) return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 });
        if (!title) return NextResponse.json({ error: '기획안 제목이 없습니다.' }, { status: 400 });

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

        const cleanContext = systemPrompt.split('반드시 아래 JSON')[0];

        // 포맷에 따른 지시사항 다이내믹 바인딩
        let scriptInstruction = '';

        if (format === 'long') {
            // 롱폼 전용 심층 대본 빌더 프로그래밍
            scriptInstruction = `
너는 유튜브 채널의 핵심 뼈대를 잡는 수석 에디터이자 다큐멘터리 방송 작가야.
단순히 가벼운 아이디어 나열이 아니라, 시청자가 영상을 중간에 이탈하지 않고 끝까지 보게 만드는 짜임새 있는 10분 내외의 '롱폼(Long-form) 영상 스크랩트'를 작성해야 해.

[기획 배경 의도]
${cleanContext}

[롱폼 대본 구조 스펙]
1. 🎬 오프닝 (도입부 - 1분 분량): 영상의 핵심 문제를 제기하고 시청자의 호기심을 극대화하는 후킹 멘트.
2. 📌 본론 (심층 3막 구성 - 7분 분량): 
   - [세부 섹션 1]: 문제의 본질 및 현상 분석 (풍부한 예시 포함)
   - [세부 섹션 2]: 핵심 갈등 요소 또는 비하인드 스토리 전개
   - [세부 섹션 3]: 기획 의도에 맞는 따뜻한 해결책, 위로, 또는 인사이트 제공
3. 🏁 아웃트로 (결론 - 1분 분량): 영상 전체 요약 및 시청자의 감정적 여운을 남기는 마무리, 자연스러운 구독/좋아요 유도 멘트.

[절대 규칙]
- 대화체보다는 독백 내레이션(화자: 내레이터)과 상세한 영상 연출 지문 [예: 잔잔한 클래식 음악이 깔리며 빈 사무실을 비춘다] 위주로 구성해줘.
- 내용이 절대 빈약하거나 축약되면 안 돼. 각 문장은 구체적이고 깊이 있는 어휘를 사용해 깊이감(결여된 느낌 해소)을 확실히 줘.
- 100% 한글로만 출력하며 한자, 일어, 프로그래밍식 문장 기호(_ 등) 사용을 엄금함.
`;
        } else {
            // 기존 숏츠 포맷
            scriptInstruction = `
너는 유튜브 1분 미만의 숏츠(Shorts) 대본을 작성하는 메인 작가야.
[기획 배경 의도]
${cleanContext}

[대본 작성 규칙]
1. 3초 만에 몰입할 수 있는 강력한 오프닝으로 시작할 것.
2. 지문은 [행동 묘사], 대사는 '화자:' 형태로 명확히 분리해 짧고 굵은 티키타카 플롯으로 작성할 것.
3. 100% 자연스러운 한국어로만 작성하고 한자, 일어, 밑줄 기호 사용 금지.
`;
        }

        const { text } = await generateText({
            model,
            system: scriptInstruction,
            prompt: `제목 "${title}" 에 맞는 완성도 높은 ${format === 'long' ? '롱폼 심층 내레이션 대본' : '숏츠 숏폼 대본'}을 완성도 있게 뽑아줘.`,
        });

        return NextResponse.json({ script: text.trim() });

    } catch (error: any) {
        console.error('Script Error:', error);
        return NextResponse.json({ error: '대본 생성 중 에러가 발생했습니다.' }, { status: 500 });
    }
}