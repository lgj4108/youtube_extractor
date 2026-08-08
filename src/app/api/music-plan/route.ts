import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai'; // 💡 다시 안정적인 generateText로 변경

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
            ? `[디렉터(사용자)의 특별 연출 지시사항]\n${customPrompt}`
            : `너는 트렌드를 선도하는 글로벌 K-Pop/힙합 프로듀서야.`;

        const noHanjaRule = fullMainLang === 'Korean'
            ? '절대로 한자(Chinese characters)를 섞어 쓰지 말고 오직 순수 한글로만 작성해라.'
            : '';

        // 💡 [핵심 수정] BPM 필수 포함 및 JSON 출력 형식 명시
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
        
        [⚠️ 절대 변경 불가: 시스템 필수 조건 및 언어 강제 규칙]
        0. 출력 언어: 'musicStyle'과 'midjourneyPrompt' 항목을 제외한 모든 내용(inferredTheme, title, musicStyleKor)은 반드시 ${fullMainLang} 언어로만 작성해라. ${noHanjaRule}
        1. 'musicStyle' 항목: Suno(수노) 최적화 스타일 태그. 쉼표(,)로 구분된 4~7개의 구조화된 영문 키워드 조합으로만 작성해라. 반드시 다음 6가지 요소를 순서대로 포함시켜라: [Genre & Subgenre], [Tempo/Energy], [Key instruments], [Vocal style], [Production quality], [Mood]. (주의: "120 bpm" 같은 정확한 수치나 유명 아티스트 이름은 절대 사용 금지. 대신 "fast-tempo", "high-energy" 등으로 표현할 것.)
        2. 'midjourneyPrompt' 항목: 앨범 커버용 미드저니 프롬프트(영어, 끝에 '--ar 16:9' 필수).
        3. 'musicStyleKor' 항목: 'musicStyle'에 적은 영어 6가지 태그 요소를 반드시 ${fullMainLang} 언어로 번역해서 적을 것.
        4. 오직 아래의 JSON 객체 형식으로만 응답하고, 마크다운이나 인사말, 다른 설명은 절대 일체 금지.
        
        {
            "inferredTheme": "(${fullMainLang} 언어) 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "(${fullMainLang} 언어) 곡 제목",
                    "musicStyle": "(English) [Genre], [Tempo/Energy], [Instruments], [Vocal], [Production], [Mood] 순서의 영문 태그",
                    "musicStyleKor": "(${fullMainLang} 언어) 위 영어 스타일 태그 6가지 요소의 한글 번역",
                    "midjourneyPrompt": "(English) 앨범 커버 프롬프트 (--ar 16:9 필수)"
                }
            ]
        }
        `;

        const { text } = await generateText({
            model: aiModel,
            system: `You are a strict JSON generator. You must respond ONLY with valid JSON. All general fields MUST be in ${fullMainLang}. If ${fullMainLang} is Korean, DO NOT USE ANY Chinese characters (Hanja). Use pure Hangul only. Always include BPM/tempo in musicStyle. Do not add any conversational text before or after the JSON.`,
            prompt: prompt,
            temperature: 0.8
        });

        // 💡 [파싱 에러 원천 차단] AI가 뱉은 텍스트에서 완벽하게 JSON 알맹이({})만 추출합니다.
        let rawText = text;
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
            rawText = match[0];
        }

        // 보이지 않는 제어 문자와 마크다운 찌꺼기 제거
        let cleanText = rawText.replace(/[\u0000-\u001F\u007F-\u009F]/g, function (m) {
            if (m === '\n' || m === '\t') return m;
            return '\\u' + ('0000' + m.charCodeAt(0).toString(16)).slice(-4);
        });

        const parsedData = JSON.parse(cleanText);

        return NextResponse.json({ ...parsedData, usedPrompt: prompt });

    } catch (error: any) {
        console.error("Plan Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}