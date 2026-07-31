import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, apiKey, keyword, musicStyle, customPrompt, mainLang, subLangs } = body;

        if (!keyword || !musicStyle) {
            return NextResponse.json({ error: "곡 제목(keyword) 또는 음악 스타일(musicStyle)이 전달되지 않았습니다." }, { status: 400 });
        }

        let aiModel;
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey });
            aiModel = google('gemini-1.5-flash');
        } else if (provider === 'groq') {
            const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey });
            aiModel = groq('llama-3.3-70b-versatile');
        } else {
            const openai = createOpenAI({ apiKey });
            aiModel = openai('gpt-4o-mini');
        }

        const langMap: Record<string, string> = { 'KR': 'Korean', 'EN': 'English', 'JP': 'Japanese' };
        const fullMainLang = langMap[mainLang] || 'Korean';
        const fullSubLangs = (subLangs || []).map((l: string) => langMap[l] || l);
        const hasSubLangs = fullSubLangs.length > 0;

        const langString = hasSubLangs
            ? `${fullMainLang} mixed with ${fullSubLangs.join(', ')}`
            : fullMainLang;

        const roleAndCustom = customPrompt && customPrompt.trim() !== ''
            ? `[디렉터(사용자) 특별 연출 지시사항]\\n${customPrompt}`
            : ``;

        // 💡 [핵심 추가] 보조 언어가 선택되지 않았을 경우, 영어 등 타 언어 혼용을 강력히 금지합니다.
        const strictLangRule = !hasSubLangs && fullMainLang === 'Korean'
            ? `[🚨 초강력 언어 통제] 보조 언어가 없습니다. 가사 원문에 **영단어나 영어 문장을 단 한 글자도 섞어 쓰지 마세요.** 오직 100% 순수 한국어(Korean)로만 작사하세요. (단, [Chorus] 같은 구조 태그는 예외로 영어 대괄호 유지)`
            : '';

        const prompt = `
        너는 글로벌 차트를 휩쓰는 천재 K-Pop/힙합 작사가야.
        아래 기획된 곡의 컨셉을 바탕으로, 사람들의 귀에 확 꽂히는 트렌디한 가사를 창작해 줘.

        [곡 기획 정보]
        - 제목: ${keyword}
        - 음악 스타일: ${musicStyle}
        - 주 사용 언어: ${langString}
        
        ${roleAndCustom}
        ${strictLangRule}

        [⚠️ 작사 핵심 가이드라인 (매우 중요)]
        1. 기획안에 '조선' 등의 키워드가 있다고 해서 '해금', '가야금', '조선' 같은 1차원적이고 촌스러운 사극 단어를 가사에 절대 직접 쓰지 마라.
        2. 음악 장르의 리듬감이 텍스트에서도 느껴지도록 라임(운율)을 철저하게 맞추고, 현대적이고 트렌디한 감각으로 작사해라.
        3. 훅(Chorus) 부분은 한 번 들으면 잊히지 않을 정도로 중독성 있고 강렬하게 구성해.
        4. 직역체는 절대 금지! 네이티브처럼 자연스럽고 감각적인 은유를 사용해.
        
        [⚠️ 응답 형식 강제 규칙]
        - Suno나 Udio에서 바로 인식할 수 있도록 곡의 구조 태그(예: [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro] 등)를 반드시 대괄호로 포함시켜서 가사를 작성해.
        - 절대로 별표(*)나 볼드체 같은 마크다운 문법을 사용하지 마라. 태그는 순수하게 텍스트 대괄호만 사용해.
        - JSON 형식이 아닌, 가사 텍스트 원문만 깔끔하게 출력해. 다른 인사말은 일체 금지.
        `;

        const { text } = await generateText({
            model: aiModel,
            system: `You are a top-tier Billboard songwriter. Write the most trendy, catchy, and poetic lyrics based on the user's prompt. Emphasize rhythm and rhyme. Never use stereotypical traditional words directly. Output ONLY the lyrics text with structure tags (like [Chorus]). DO NOT USE any markdown formatting like ** or *.`,
            prompt: prompt,
            temperature: 0.85
        });

        let cleanText = text.replace(/\*\*/g, '');
        cleanText = cleanText.replace(/[\u0000-\u001F\u007F-\u009F]/g, function (m) {
            if (m === '\n' || m === '\t') return m;
            return '\\u' + ('0000' + m.charCodeAt(0).toString(16)).slice(-4);
        });

        return NextResponse.json({ lyrics: cleanText.trim() });

    } catch (error: any) {
        console.error("Lyrics Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}