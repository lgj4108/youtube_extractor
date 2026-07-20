import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 💡 프론트엔드에서 넘겨준 musicStyle을 여기서 받아줍니다.
        const { provider, apiKey, keyword, musicStyle, genre, mainLang, subLangs, youtubeData = [] } = body;

        let aiModel;

        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
            aiModel = google('models/gemini-1.5-pro-latest');
        } else if (provider === 'groq') {
            const groq = createOpenAI({
                baseURL: 'https://api.groq.com/openai/v1',
                apiKey: apiKey
            });
            aiModel = groq('llama-3.3-70b-versatile');
        } else {
            const openai = createOpenAI({ apiKey });
            aiModel = openai('gpt-4o-mini');
        }

        // 💡 프롬프트에 '음악 스타일(musicStyle)' 가이드를 주입하여 퀄리티를 폭발시킵니다.
        const prompt = `
        너는 트렌디한 글로벌 K-Pop 프로듀서이자 뮤직비디오 감독이야.
        주제/컨셉: "${keyword}"
        음악 스타일(Suno/Udio 태그): ${musicStyle || '지정되지 않음'}
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
           - 주어진 '음악 스타일'의 무드와 템포에 완벽하게 어울리게 가사 리듬을 맞춰줘.
           - 뻔한 정형화된 구조(Verse-Chorus 반복)에서 벗어나, 곡의 장르와 분위기에 맞춰 [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro] 등을 자유롭고 다이내믹하게 조합해.
           - 인트로가 길게 빠지는 곡, 프리코러스가 생략되고 바로 터지는 곡, 브릿지에서 감정이 고조되는 곡 등 매번 다른 서사를 만들어줘.
           - 각 파트의 길이도 2줄에서 8줄 사이로 변주를 주어 실제 상업용 음원처럼 리듬감이 느껴지게 해.

        3. 씬(Scene) 프롬프트 대폭 추가:
           - 주어진 '음악 스타일'과 가사의 흐름에 맞춰 최소 10개에서 12개의 다이내믹한 씬(Scene) 프롬프트를 뽑아줘.
           - 프롬프트는 무조건 영어로 작성하고, 끝에 --ar 16:9 를 붙여.

        반드시 아래 JSON 형식으로만 응답하고, 백틱(\`\`\`)이나 다른 설명은 절대 넣지마.
        {
            "lyrics": "[Intro]\\n(가사)\\n\\n[Verse 1]\\n(가사)...",
            "scenePrompts": [
                "Scene 1: A neon-lit cyberpunk street scene, energetic choreography, highly detailed --ar 16:9",
                "Scene 2: ..."
            ]
        }
        `;

        const { text } = await generateText({
            model: aiModel,
            prompt: prompt,
        });

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