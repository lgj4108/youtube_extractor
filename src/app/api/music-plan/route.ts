import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai'; // 💡 generateText 대신 generateObject를 가져옵니다.
import { z } from 'zod'; // 💡 TypeScript와 완벽하게 호환되는 스키마 검증 라이브러리입니다.

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, youtubeData = [], genre = 'K-POP / 댄스', vocalType = 'Auto', mainLang = 'KR', subLangs = [], customPrompt = '' } = body;

        let aiModel;
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
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
            ? `[디렉터(사용자)의 특별 연출 지시사항]\\n${customPrompt}`
            : `너는 트렌드를 선도하는 글로벌 K-Pop/힙합 프로듀서야.`;

        const noHanjaRule = fullMainLang === 'Korean'
            ? '절대로 한자(Chinese characters)를 섞어 쓰지 말고 오직 순수 한글로만 작성해라.'
            : '';

        const prompt = `
        ${roleAndCustom}

        [시스템 제공 데이터 및 필수 반영 변수]
        - 타겟 음악 장르: ${genre}
        - 타겟 보컬 타입: ${vocalGuide}
        - 타겟 곡 언어 규칙: ${langGuide}
        - 출력 언어 설정: **${fullMainLang}**
        - 유튜브 인기 트렌드 참고 데이터: ${JSON.stringify(compressedData)}

        위 데이터를 바탕으로 대중들이 열광할 만한 새로운 창작 곡 컨셉 3가지를 기획해 줘.

        [⚠️ 기획 시 특별 금지/주의사항]
        유튜브 데이터에 '조선힙합' 같은 전통적 키워드가 있더라도 '해금', '가야금', '한복', '조선' 같은 1차원적인 국악/사극 단어를 제목이나 기획안 텍스트에 절대 직접 쓰지 마라.
        동양적인 선율은 'musicStyle' 태그에만 영어로 반영하고, 전체적인 분위기는 철저하게 현대적이고 세련된 요즘 힙합 감성으로 트렌디하게 풀어내라.
        
        [⚠️ 언어 강제 규칙]
        - 'musicStyle'과 'midjourneyPrompt' 항목을 제외한 **모든 내용(inferredTheme, title, musicStyleKor)은 반드시 ${fullMainLang} 언어로만** 작성해라. ${noHanjaRule}
        - 'musicStyle' 항목: Suno/Udio 같은 생성기에 입력할 수 있는 영어 태그. 보컬 타입과 언어 규칙(${langGuide})을 반드시 영어로 포함.
        - 'midjourneyPrompt' 항목: 앨범 커버 프롬프트(영어, 끝에 '--ar 16:9' 필수).
        - 'musicStyleKor' 항목: 'musicStyle'에 적은 영어 태그를 **반드시 ${fullMainLang} 언어로 번역해서** 적을 것.
        `;

        // 💡 [가장 강력한 해결책] generateObject와 Zod 스키마를 사용하여 구조화된 객체를 강제로 반환받습니다.
        const { object } = await generateObject({
            model: aiModel,
            system: `You are a strict JSON generator. You must respond ONLY with valid data matching the schema. All general fields MUST be in ${fullMainLang}. If ${fullMainLang} is Korean, DO NOT USE ANY Chinese characters (Hanja). Use pure Hangul only.`,
            prompt: prompt,
            schema: z.object({
                inferredTheme: z.string().describe(`(${fullMainLang} 언어) 데이터들을 관통하는 핵심 음악 트렌드`),
                plans: z.array(z.object({
                    title: z.string().describe(`(${fullMainLang} 언어) 창작 곡 제목`),
                    musicStyle: z.string().describe(`(English) Suno/Udio용 영어 음악 스타일 태그`),
                    musicStyleKor: z.string().describe(`(${fullMainLang} 언어) 위 영어 스타일 태그 한글 번역`),
                    midjourneyPrompt: z.string().describe(`(English) 앨범 커버나 뮤비 썸네일로 쓸 미드저니 프롬프트 (--ar 16:9 필수)`)
                })).length(3).describe("3가지의 창작 곡 기획안 배열")
            }),
            temperature: 0.8
        });

        // object 변수에는 이미 완벽하게 파싱된 자바스크립트 객체가 들어있습니다. JSON.parse()가 필요 없습니다!
        return NextResponse.json({ ...object, usedPrompt: prompt });

    } catch (error: any) {
        console.error("Plan Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}