import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
    try {
        // 💡 languages 배열 파라미터 추가
        const { provider, apiKey, youtubeData, concept, genre, languages } = await request.json();

        if (!apiKey) return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 });

        let model;
        if (provider === 'gemini') {
            const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });
            model = google('gemini-2.0-flash');
        } else if (provider === 'groq') {
            const groq = createOpenAI({ apiKey: apiKey.trim(), baseURL: 'https://api.groq.com/openai/v1' });
            model = groq('llama-3.3-70b-versatile');
        } else if (provider === 'openai') {
            const openai = createOpenAI({ apiKey: apiKey.trim() });
            model = openai('gpt-4o-mini');
        } else {
            return NextResponse.json({ error: '지원하지 않는 프로바이더입니다.' }, { status: 400 });
        }

        const compressedData = youtubeData.map((v: any) => ({
            title: v.title, tags: v.tags
        }));

        const genreInstruction = genre && genre !== 'auto'
            ? `[필수 장르 지정]: 사용자가 명시적으로 '${genre}' 장르를 선택했습니다. 트렌드 데이터를 참고하되, 반드시 곡의 베이스 장르를 '${genre}'로 고정하여 기획하세요.`
            : `[자동 장르 배정]: 제공된 유튜브 데이터를 분석하여 가장 인기 있는 장르를 스스로 선택하세요.`;

        // 💡 다중 언어 배열을 텍스트로 변환하여 프롬프트에 주입
        const langString = (languages && languages.length > 0) ? languages.join(', ') : '한국어';
        const languageInstruction = `선택된 타겟 언어는 [${langString}]입니다. 메인 언어를 기반으로 전개하되, 코러스나 펀치라인 등 곡의 매력을 살릴 수 있는 구간에 선택된 언어들을 트렌디하고 자연스럽게 혼합하여 작성하세요. 선택되지 않은 언어(예: 한자 등)는 절대 섞어 쓰지 마세요.`;

        const systemInstruction = `
너는 글로벌 톱티어 음악 프로듀서이자 뮤직비디오 시각 연출 감독이다.
주어진 유튜브 음악 트렌드 데이터를 분석하여, 새로운 음악 컨셉 하나를 기획해라.
사용자의 추가 요구사항: [${concept || '없음'}]
${genreInstruction}

[🚨 절대 준수 임무 🚨]
1. 가사 언어 및 스타일: ${languageInstruction}
2. 기획 의도 노출: 어떤 유튜브 트렌드/키워드를 보고 이 주제를 선택했는지 명확한 기획 의도를 작성해라.
3. 파트별 가사 분량 강제 (음악적 구조):
   - Intro와 Outro: 악기 연주 위주의 도입/마무리이므로 가사는 '1~2줄' 이내로 매우 짧게 작성해라.
   - Verse, Pre-Chorus, Chorus, Bridge: 본격적인 노래 파트이므로 각각 '4~8줄'로 풍성하게 작성해라.
4. 다이내믹한 화면 전환 (MV 연출): 뮤직비디오는 한 파트당 하나의 정지 화면만 있으면 지루하다. 각 파트가 진행되는 동안 장면이 2~3번 전환될 수 있도록, '미드저니(Midjourney) 영문 프롬프트'를 반드시 파트당 2~3개씩 배열 형태로 작성해라.

반드시 아래 JSON 객체 구조로만 응답해라:
{
  "conceptReasoning": "AI가 이 곡을 기획한 의도",
  "theme": "장르 및 곡의 핵심 컨셉",
  "songTitle": "음악의 매력적인 제목",
  "scenes": [
    {
      "part": "Intro",
      "lyrics": "(지정된 언어 규칙에 맞춘 가사)",
      "prompts": [
        "A cinematic wide shot of a futuristic cyberpunk city at night, neon lights, 8k resolution, photorealistic, --ar 16:9",
        "Close up of a dripping neon sign in the rain, moody atmosphere, --ar 16:9"
      ]
    }
  ]
}`;

        const userPrompt = `[수집된 음악 유튜브 데이터]\n${JSON.stringify(compressedData)}\n\n뮤직비디오 풀버전 기획안을 지정된 JSON 객체 포맷으로 반환해.`;

        const { text } = await generateText({
            model,
            system: systemInstruction,
            prompt: userPrompt,
        });

        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("JSON 추출 실패");

        const mvPlan = JSON.parse(match[0]);
        return NextResponse.json({ mvPlan });

    } catch (error: any) {
        console.error('Music API Error:', error);
        return NextResponse.json({ error: `뮤직비디오 생성 실패: API 응답을 확인하세요.` }, { status: 500 });
    }
}