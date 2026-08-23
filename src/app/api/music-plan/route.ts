import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringValue } from '@/lib/server/ai';
import { errorResponse, optionalString, optionalStringArray, readJsonObject } from '@/lib/server/api';

interface MusicPlanningSource {
    title?: unknown;
    tags?: unknown;
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const aiModel = createAiModel(body);
        const youtubeData = Array.isArray(body.youtubeData) ? body.youtubeData : [];
        const creativeKeyword = optionalString(body, 'creativeKeyword').slice(0, 500);
        const genre = optionalString(body, 'genre', 'K-POP / 댄스');
        const vocalType = optionalString(body, 'vocalType', 'Auto');
        const mainLang = optionalString(body, 'mainLang', 'KR');
        const subLangs = optionalStringArray(body, 'subLangs').filter((lang) => lang !== mainLang);
        const customPrompt = optionalString(body, 'customPrompt').slice(0, 8_000);

        const compressedData = youtubeData.slice(0, 30).map((source) => {
            const video = source && typeof source === 'object' ? source as MusicPlanningSource : {};
            return {
                title: stringValue(video.title),
                tags: Array.isArray(video.tags)
                    ? video.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8)
                    : [],
            };
        });
        const vocalGuide = vocalType === 'Auto' ? '장르와 컨셉에 어울리는 보컬을 자유롭게 판단하여' : `'${vocalType}' 보컬 타입으로 고정해서`;

        const langMap: Record<string, string> = { 'KR': 'Korean', 'EN': 'English', 'JP': 'Japanese' };
        const fullMainLang = langMap[mainLang] || 'Korean';
        const fullSubLangs = subLangs.map((l: string) => langMap[l] || l);

        const langGuide = fullSubLangs.length > 0
            ? `${fullMainLang} 중심, 필요하면 ${fullSubLangs.join(', ')} 혼용`
            : `${fullMainLang} 중심`;

        const roleAndCustom = customPrompt.trim() !== ''
            ? `[디렉터(사용자)의 특별 연출 지시사항]\n${customPrompt}`
            : `너는 사용자의 아이디어를 다양한 음악 방향으로 확장하는 프로듀서다.`;

        const prompt = `
        ${roleAndCustom}

        [사용자 입력과 참고 정보]
        - 사용자가 직접 입력한 핵심 창작 키워드: ${creativeKeyword || '자유 주제'}
        - 타겟 음악 장르: ${genre}
        - 타겟 보컬 타입: ${vocalGuide}
        - 타겟 곡 언어 규칙: ${langGuide}
        - 출력 언어 설정: **${fullMainLang}**
        - 유튜브 인기 트렌드 참고 데이터(없으면 무시): ${JSON.stringify(compressedData)}
        
        사용자의 핵심 키워드와 특별 지시를 최우선으로 존중해 서로 결이 다른 곡 콘셉트 3가지를 제안해 줘.
        유튜브 데이터는 있을 때만 아이디어를 넓히는 참고 자료로 사용하고 그대로 모방하지 마.
        장르에 전통, 실험, 시대적 소재가 포함되면 임의로 배제하지 말고 사용자의 의도에 맞게 해석해.

        [응답 구성]
        - 제목과 설명은 ${langGuide}으로 자연스럽게 작성해.
        - musicStyle은 Suno/Udio에서 활용하기 쉬운 영어 태그 4~8개로 장르, 에너지, 주요 악기, 보컬, 무드 중 관련 요소를 담아.
        - musicStyleKor은 스타일의 의미를 ${fullMainLang}로 간단히 설명해.
        - midjourneyPrompt는 앨범 커버 제작에 쓸 수 있는 영어 시각 프롬프트로 작성해.
        - 파싱을 위해 아래 JSON 구조를 유지해.
        
        {
            "inferredTheme": "(${fullMainLang} 언어) 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "(${fullMainLang} 언어) 곡 제목",
                    "musicStyle": "English style tags separated by commas",
                    "musicStyleKor": "(${fullMainLang}) 스타일 설명",
                    "midjourneyPrompt": "English album-cover prompt"
                }
            ]
        }
        `;

        const { text } = await generateText({
            model: aiModel,
            system: `Create original music concepts from the user's intent. Return valid JSON matching the requested schema so the application can parse it. Prefer ${fullMainLang} for general fields while allowing natural genre terms and loanwords.`,
            prompt: prompt,
            temperature: 0.8
        });

        const parsedData = parseJsonObject(text);
        const plans = Array.isArray(parsedData.plans)
            ? parsedData.plans.filter((plan) => plan && typeof plan === 'object').slice(0, 3)
            : [];
        if (plans.length === 0) throw new Error('AI가 유효한 음악 기획안을 반환하지 않았습니다.');

        return NextResponse.json({
            inferredTheme: stringValue(parsedData.inferredTheme),
            plans,
            usedPrompt: prompt,
        });
    } catch (error: unknown) {
        return errorResponse(error, '음악 기획안 생성에 실패했습니다. API 키와 모델 설정을 확인해주세요.', 'Music plan API');
    }
}
