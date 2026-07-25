import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, keyword, musicStyle, genre, vocalType, mainLang, subLangs, youtubeData = [] } = body;

        let aiModel;

        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
            aiModel = google('models/gemini-1.5-pro-latest');
        } else if (provider === 'groq') {
            const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey });
            aiModel = groq('llama-3.3-70b-versatile');
        } else {
            const openai = createOpenAI({ apiKey });
            aiModel = openai('gpt-4o-mini');
        }

        const prompt = `
        너는 트렌디한 글로벌 K-Pop 프로듀서이자 뮤직비디오 감독이야.
        주제/컨셉: "${keyword}"
        음악 스타일(Suno/Udio 태그): ${musicStyle || '지정되지 않음'}
        장르: ${genre}
        보컬 타입: ${vocalType === 'Auto' ? '장르에 맞게 자동' : vocalType}
        메인 언어: ${mainLang}
        보조 언어: ${subLangs.length > 0 ? subLangs.join(', ') : '없음'}

        [완벽한 작사 및 기획을 위한 엄격한 원칙]
        1. 언어 통제: 지정된 언어만 사용할 것. 의미 없는 외계어 금지.
        2. 분량 및 곡 구조: [Intro], [Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro] 등을 유연하게 사용하여 3분 분량의 상업용 가사를 완성해. 각 파트는 2~8줄로 리듬감 있게 써.
        3. 씬(Scene) 프롬프트 1:1 동기화: 네가 작성한 가사의 **모든 파트(문단)마다 1:1로 대응되는 새로운 씬 프롬프트를 무조건 작성**해. (프롬프트는 무조건 영어로, 끝에 --ar 16:9 포함)

        [JSON 생성 오류 방지 가이드 - 매우 중요!]
        가사(lyrics) 작성 시 일반 문자열 안에서 실제 줄바꿈(엔터)을 절대로 하지 마.
        오류를 막기 위해 가사는 **반드시 문자열의 배열(Array of strings) 형태**로 응답해.

        반드시 아래 JSON 형식으로만 응답해.
        {
            "lyrics": [
                "[Intro]",
                "가사 첫 번째 줄",
                "가사 두 번째 줄",
                "",
                "[Verse 1]",
                "..."
            ],
            "scenePrompts": [
                "Scene 1: A neon-lit cyberpunk street scene --ar 16:9",
                "Scene 2: Close up of the singer --ar 16:9"
            ]
        }
        `;

        const { text } = await generateText({ model: aiModel, prompt });
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