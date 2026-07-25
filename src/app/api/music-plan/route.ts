import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, youtubeData = [], genre = 'K-POP / 댄스', vocalType = 'Auto', mainLang = 'KR', subLangs = [], customPrompt = '' } = body;

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

        const compressedData = youtubeData.map((v: any) => ({ title: v.title, tags: v.tags }));
        const vocalGuide = vocalType === 'Auto' ? '장르와 컨셉에 어울리는 보컬을 자유롭게 판단하여' : `'${vocalType}' 보컬 타입으로 고정해서`;

        const langMap: Record<string, string> = { 'KR': 'Korean', 'EN': 'English', 'JP': 'Japanese' };
        const fullMainLang = langMap[mainLang] || 'Korean';
        const fullSubLangs = subLangs.map((l: string) => langMap[l] || l);

        const langGuide = fullSubLangs.length > 0
            ? `${fullMainLang} main with trendy mix of ${fullSubLangs.join(', ')}`
            : `strictly in ${fullMainLang} language`;

        const roleAndCustom = customPrompt.trim() !== ''
            ? `[디렉터(사용자)의 특별 연출 지시사항]\n${customPrompt}`
            : `너는 트렌드를 선도하는 글로벌 K-Pop/힙합 프로듀서야.`;

        const prompt = `
        ${roleAndCustom}

        [시스템 제공 데이터 및 필수 반영 변수]
        - 타겟 음악 장르: ${genre}
        - 타겟 보컬 타입: ${vocalGuide}
        - 타겟 곡 언어 규칙: ${langGuide}
        - 유튜브 인기 트렌드 참고 데이터: ${JSON.stringify(compressedData)}

        위 데이터를 바탕으로 대중들이 열광할 만한 새로운 창작 곡 컨셉 3가지를 기획해 줘.
        
        [⚠️ 절대 변경 불가: 시스템 필수 조건 및 JSON 강제 규칙]
        1. 각 컨셉마다 Suno나 Udio 같은 AI 음악 생성기에 바로 입력할 수 있는 '구체적인 음악 스타일 태그'를 작성해.
        2. 스타일 태그에는 보컬 타입(${vocalGuide})과 언어 규칙(${langGuide}) 특성을 영어로 반드시 포함시켜.
        3. 반드시 아래 JSON 형식(Array 안의 Object 구조)으로만 응답해야 하며 백틱(\`\`\`) 등 다른 말은 일체 금지.
        
        {
            "inferredTheme": "데이터를 관통하는 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "곡 제목",
                    "musicStyle": "Suno/Udio용 영어 음악 스타일 태그 (예: Female ${fullMainLang} vocal, melodic emo rap beat, 95 bpm)",
                    "musicStyleKor": "위 영어 스타일 태그 한글 번역",
                    "midjourneyPrompt": "이 곡의 앨범 커버나 뮤비 썸네일로 쓸 미드저니 프롬프트 (영어, --ar 16:9 필수)"
                }
            ]
        }
        `;

        const { text } = await generateText({ model: aiModel, prompt });
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);

        return NextResponse.json({ ...parsedData, usedPrompt: prompt });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}