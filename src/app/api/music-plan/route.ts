import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // 💡 프론트엔드에서 보낸 genre 받기 (기본값 설정)
        const { provider, apiKey, youtubeData = [], genre = 'K-POP / 댄스' } = body;

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

        const compressedData = youtubeData.map((v: any) => ({ title: v.title, tags: v.tags }));

        // 💡 프롬프트에 타겟 음악 장르 주입
        const prompt = `
        너는 트렌드를 선도하는 글로벌 K-Pop/힙합 프로듀서야.
        다음은 현재 유튜브에서 인기 있는 관련 영상들의 제목과 태그 데이터야:
        ${JSON.stringify(compressedData)}

        타겟 음악 장르: ${genre}

        이 트렌드 데이터를 분석해서, 대중들이 열광할 만한 **'${genre}' 장르의 새로운 창작 곡(노래)'의 컨셉 3가지**를 기획해 줘.
        각 컨셉마다 Suno나 Udio 같은 AI 음악 생성기에 바로 입력할 수 있는 **구체적인 음악 스타일 태그(Style of Music, 영어로 악기 구성, 비트, 무드 등)**를 반드시 포함해 줘. 스타일 태그는 무조건 '${genre}' 장르의 특성을 완벽하게 반영해야 해.

        반드시 아래 JSON 형식으로만 응답해.
        {
            "inferredTheme": "데이터를 관통하는 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "곡 제목",
                    "musicStyle": "영어 음악 스타일 태그 (예: Melodic emo rap beat, heavy 808s, atmospheric synth, 85 bpm)",
                    "midjourneyPrompt": "이 곡의 앨범 커버나 뮤비 썸네일로 쓸 미드저니 프롬프트 (영어, --ar 16:9 필수)"
                },
                ... (총 3개)
            ]
        }
        `;

        const { text } = await generateText({ model: aiModel, prompt });
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);

        return NextResponse.json(parsedData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}