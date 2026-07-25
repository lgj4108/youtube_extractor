import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, keyword, musicStyle, genre, vocalType, mainLang = 'KR', subLangs = [], youtubeData = [], customPrompt = '' } = body;

        let aiModel;
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
            // 💡 2026년 최신 Vercel AI SDK 대응: 'gemini-3.5-flash' 로 완전히 변경!
            aiModel = google('gemini-3.5-flash');
        } else if (provider === 'groq') {
            const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey });
            aiModel = groq('llama-3.3-70b-versatile');
        } else {
            const openai = createOpenAI({ apiKey });
            aiModel = openai('gpt-4o-mini');
        }

        const langMap: Record<string, string> = { 'KR': 'Korean', 'EN': 'English', 'JP': 'Japanese' };
        const fullMainLang = langMap[mainLang] || 'Korean';
        const fullSubLangs = subLangs.map((l: string) => langMap[l] || l);

        const roleAndCustom = customPrompt.trim() !== ''
            ? `[디렉터(사용자)의 특별 연출 지시사항]\n${customPrompt}`
            : `너는 트렌디한 글로벌 K-Pop 프로듀서이자 뮤직비디오 감독이야.`;

        const prompt = `
        ${roleAndCustom}

        [시스템 제공 데이터 및 곡 정보]
        - 곡 제목/주제: "${keyword}"
        - 음악 스타일: ${musicStyle || '지정되지 않음'}
        - 장르: ${genre}
        
        [⚠️ 절대 변경 불가: 작사 및 기획 시스템 코어 규칙]
        1. 🌐 언어 통제 및 환각(Hallucination) 방지:
           - 메인 언어(${fullMainLang})와 보조 언어(${fullSubLangs.length > 0 ? fullSubLangs.join(', ') : '없음'})만 사용해.
           - [경고] 중국어(한자), 러시아어(키릴 문자), 스페인어 등 지정되지 않은 언어는 단 한 글자도 출력하지 마. 어길 시 시스템 오류가 발생함.
        2. 🎵 곡 구조 및 분량 (2분 30초 ~ 4분 최적화):
           - 곡의 장르에 맞게 파트 구조([Intro], [Verse], [Rap], [Pre-Chorus], [Chorus], [Drop], [Bridge], [Outro] 등)를 자유롭게 기획해.
           - [분량 가이드] 너무 짧지도, 지루하게 늘어지지도 않게 실제 음원 기준 '2분 30초 ~ 4분' 사이의 길이가 되도록 기획해 (일반적으로 5~8개 파트 내외).
           - 각 파트는 음악적 흐름에 맞게 4~8줄 사이로 구성하고, 끝단어의 라임(Rhyme)을 살려 리듬감 있게 써줘.
        3. 🎬 씬 동기화: 가사의 모든 파트마다 1:1 대응되는 씬 프롬프트 작성 (100% 영어, 끝에 --ar 16:9 포함).
        4. 🛡️ JSON 출력: 가사(lyrics)는 줄바꿈(\n) 없는 문자열 배열(Array of strings)이어야 함. 파트 사이의 띄어쓰기는 빈 문자열("")로 넣어.

        반드시 아래 JSON 형식으로만 응답해.
        {
            "lyrics": [
                "[장르에 맞는 자유로운 파트 태그]",
                "리듬을 타며 부르기 좋게",
                "글자 수를 적당히 맞춰서",
                "최소 4줄 이상 꽉 채워서",
                "",
                "[다음 파트 태그]",
                "라임이 딱 떨어지는 트렌디한 가사",
                "호흡이 자연스럽게 이어지도록",
                "2분 30초에서 4분 사이의 트렌디한 곡 길이가 되도록",
                "적당한 분량(5~8개 파트)으로 기획해줘",
                "",
                "[Chorus]",
                "..."
            ],
            "scenePrompts": [
                "Scene 1: A neon-lit cyberpunk street scene at night, atmospheric fog, cinematic lighting --ar 16:9",
                "Scene 2: Close up of the singer looking directly at the camera with an intense expression --ar 16:9"
            ]
        }
        `;

        const { text } = await generateText({ model: aiModel, prompt });
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);

        return NextResponse.json({
            lyrics: parsedData.lyrics,
            scenePrompts: parsedData.scenePrompts,
            usedPrompt: prompt
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}