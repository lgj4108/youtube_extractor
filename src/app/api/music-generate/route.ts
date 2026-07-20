import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, keyword, genre, mainLang, subLangs, youtubeData = [] } = body;

        let aiModel;

        // 💡 1. 모델 라우팅 로직 완벽 분리
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
            aiModel = google('models/gemini-1.5-pro-latest');

        } else if (provider === 'groq') {
            // Groq은 OpenAI 호환 엔드포인트를 사용합니다.
            const groq = createOpenAI({
                baseURL: 'https://api.groq.com/openai/v1',
                apiKey: apiKey
            });

            // 💡 핵심 수정: 서비스 종료된 llama3-70b-8192 대신 최신 지원 모델로 변경
            aiModel = groq('llama-3.3-70b-versatile');

        } else {
            // 기본값: OpenAI (gpt-4o-mini 등)
            const openai = createOpenAI({ apiKey });
            aiModel = openai('gpt-4o-mini');
        }

        // 💡 2. 프롬프트 생성 (이전과 동일하게 JSON 포맷 강제)
        // 💡 AI 기강을 잡는 3대 원칙(언어, 길이, 씬 개수) 적용 프롬프트
        // 💡 다이내믹한 곡 구조를 스스로 판단하게 만드는 프롬프트
        const prompt = `
        너는 트렌디한 글로벌 K-Pop 프로듀서이자 뮤직비디오 감독이야.
        주제/컨셉: "${keyword}"
        장르: ${genre}
        메인 언어: ${mainLang}
        보조 언어: ${subLangs.length > 0 ? subLangs.join(', ') : '없음'}

        [완벽한 작사 및 기획을 위한 엄격한 3대 원칙]
        1. 언어 통제 (매우 중요):
           - 메인 언어인 '${mainLang}'를 기본으로 작성해.
           - 보조 언어가 '없음'이라면 100% '${mainLang}'만 사용해. (절대 다른 언어의 단어를 섞지 마).
           - 보조 언어가 있다면 해당 언어들만 자연스럽게 믹스해.
           - 네가 임의로 다른 나라 언어(예: 의미 없는 외국어, 힌디어, 아랍어 등)를 넣는 것은 절대 금지야.

        2. 분량 및 곡 구조 (다이내믹하고 유연하게):
           - 뻔한 정형화된 구조(Verse-Chorus 반복)에서 벗어나, 곡의 장르와 분위기에 맞춰 [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro] 등을 자유롭고 다이내믹하게 조합해.
           - 인트로가 길게 빠지는 곡, 프리코러스가 생략되고 바로 터지는 곡, 브릿지에서 감정이 고조되는 곡 등 매번 다른 서사를 만들어줘.
           - 각 파트의 길이도 2줄에서 8줄 사이로 변주를 주어 실제 상업용 음원처럼 리듬감이 느껴지게 해.

        3. 씬(Scene) 프롬프트 대폭 추가:
           - 가사의 흐름에 맞춰 최소 10개에서 12개의 다이내믹한 씬(Scene) 프롬프트를 뽑아줘.
           - 프롬프트는 무조건 영어로 작성하고, 끝에 --ar 16:9 를 붙여.

        반드시 아래 JSON 형식으로만 응답하고, 백틱(\`\`\`)이나 다른 설명은 절대 넣지마.
        {
            "lyrics": "[Intro]\\n(가사)\\n\\n[Verse 1]\\n(가사)...",
            "scenePrompts": [
                "Scene 1: A neon-lit cyberpunk street scene, energetic choreography, highly detailed --ar 16:9",
                ... (총 10~12개)
            ]
        }
        `;

        // 💡 3. AI 호출
        const { text } = await generateText({
            model: aiModel,
            prompt: prompt,
        });

        // 💡 4. JSON 찌꺼기(마크다운 백틱 등) 제거 후 파싱
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);

        return NextResponse.json({
            lyrics: parsedData.lyrics,
            scenePrompts: parsedData.scenePrompts
        });

    } catch (error: any) {
        console.error("Music Generate Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}