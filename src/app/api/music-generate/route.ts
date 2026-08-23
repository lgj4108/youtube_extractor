import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringArray } from '@/lib/server/ai';
import { errorResponse, optionalString, optionalStringArray, readJsonObject, requiredString } from '@/lib/server/api';

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const aiModel = createAiModel(body, { geminiModel: 'gemini-3.5-flash' });
        const keyword = requiredString(body, 'keyword', '곡 제목 또는 주제를 입력해주세요.');
        const musicStyle = optionalString(body, 'musicStyle', '지정되지 않음');
        const genre = optionalString(body, 'genre', 'K-POP');
        const vocalType = optionalString(body, 'vocalType', 'Auto');
        const mainLang = optionalString(body, 'mainLang', 'KR');
        const subLangs = optionalStringArray(body, 'subLangs').filter((lang) => lang !== mainLang);
        const customPrompt = optionalString(body, 'customPrompt').slice(0, 8_000);

        const langMap: Record<string, string> = { 'KR': 'Korean', 'EN': 'English', 'JP': 'Japanese' };
        const fullMainLang = langMap[mainLang] || 'Korean';
        const fullSubLangs = subLangs.map((l: string) => langMap[l] || l);

        const roleAndCustom = customPrompt.trim() !== ''
            ? `[디렉터(사용자)의 특별 연출 지시사항]\n${customPrompt}`
            : `너는 사용자의 주제와 음악 스타일을 살려 완성도 높은 가사를 쓰는 프로듀서다.`;

        const prompt = `
        ${roleAndCustom}
        
        [곡 정보]
        - 곡 제목/주제: "${keyword}"
        - 음악 스타일: ${musicStyle || '지정되지 않음'}
        - 장르: ${genre}
        - 타겟 보컬 타입: ${vocalType}
        
        [창작 방향]
        - 사용자의 제목, 스타일, 특별 지시를 가장 중요한 기준으로 삼아.
        - 가사는 ${fullMainLang}를 중심으로 작성하고${fullSubLangs.length ? ` ${fullSubLangs.join(', ')}를 자연스럽게 섞을 수 있어` : ' 장르상 자연스러운 외래어와 훅은 허용해'}.
        - 곡 구조와 길이, 반복, 화음, 연주 구간은 장르와 서사에 맞게 판단해. 특정 소재나 악기를 임의로 금지하지 마.
        - 대괄호 안의 파트·연주 지시는 Suno/Udio가 이해하기 쉬운 간결한 영어를 권장하지만, 사용자 지시가 있으면 그 방식을 따라.
        - scenePrompts는 주요 파트별 뮤직비디오 장면을 영어로 제안해. 모든 가사 줄과 1:1로 맞출 필요는 없어.
        - 파싱을 위해 lyrics와 scenePrompts가 문자열 배열인 아래 JSON 구조를 유지해.

        {
            "lyrics": [
                "[Section and production direction]",
                "lyric line",
                ""
            ],
            "scenePrompts": [
                "English visual prompt for a major song section"
            ]
        }
        `;

        const { text } = await generateText({ model: aiModel, prompt });
        const parsedData = parseJsonObject(text);
        const lyrics = stringArray(parsedData.lyrics);
        const scenePrompts = stringArray(parsedData.scenePrompts);
        if (lyrics.length === 0) throw new Error('AI가 유효한 가사를 반환하지 않았습니다.');

        return NextResponse.json({
            lyrics,
            scenePrompts,
            usedPrompt: prompt
        });

    } catch (error: unknown) {
        return errorResponse(error, '가사 생성에 실패했습니다. API 키와 모델 설정을 확인해주세요.', 'Music generation API');
    }
}
