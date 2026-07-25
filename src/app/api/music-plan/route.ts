import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // 💡 vocalType 파라미터 받기
        const { provider, apiKey, youtubeData = [], genre = 'K-POP / 댄스', vocalType = 'Auto' } = body;

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
        const vocalGuide = vocalType === 'Auto' ? '장르와 컨셉에 어울리는 보컬을 자유롭게 판단하여' : `'${vocalType}' 보컬 타입으로 고정해서`;

        const prompt = `
        너는 트렌드를 선도하는 글로벌 K-Pop/힙합 프로듀서야.
        다음은 현재 유튜브에서 인기 있는 관련 영상들의 제목과 태그 데이터야:
        ${JSON.stringify(compressedData)}

        타겟 음악 장르: ${genre}
        타겟 보컬 타입: ${vocalGuide}

        이 트렌드 데이터를 분석해서, 대중들이 열광할 만한 **'${genre}' 장르의 새로운 창작 곡(노래)'의 컨셉 3가지**를 기획해 줘.
        
        [필수 조건]
        각 컨셉마다 Suno나 Udio 같은 AI 음악 생성기에 바로 입력할 수 있는 **구체적인 음악 스타일 태그(Style of Music)**를 작성해.
        특히, 네가 기획한 스타일 태그 첫 줄에는 **${vocalGuide} 반드시 포함**시켜줘. (예: Female vocal, Male rapper 등)

        반드시 아래 JSON 형식으로만 응답해.
        {
            "inferredTheme": "데이터를 관통하는 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "곡 제목",
                    "musicStyle": "Suno/Udio용 영어 음악 스타일 태그 (예: Female vocal, melodic emo rap beat, heavy 808s, 85 bpm)",
                    "musicStyleKor": "위 영어 스타일 태그 한글 번역",
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