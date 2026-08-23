import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringArray } from '@/lib/server/ai';
import { errorResponse, optionalString, optionalStringArray, readJsonObject, requiredString } from '@/lib/server/api';

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const aiModel = createAiModel(body);
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
        const usesKorean = mainLang === 'KR' || subLangs.includes('KR');

        const koreanPronunciationGuide = usesKorean
            ? `[한국어 발음 규칙]
        - 한국어로 부르는 모든 줄은 소리 내어 읽을 수 있는 자연스러운 한글 단어와 어순으로 써. 뜻은 통하지만 발음할 수 없는 기호 조합, 코드형 문자열, 불완전한 음절은 가사에 넣지 마.
        - 숫자, 단위, 영문 약어는 그대로 읽기 어려우면 문맥에 맞는 한글 발음으로 풀어 써. 사용자가 요구한 고유명사나 의도적인 외국어 훅은 예외로 할 수 있어.
        - 외국어를 섞을 때도 실제로 발음할 수 있는 단어만 사용하고, 한 줄 안에서 언어가 지나치게 잘게 바뀌지 않게 해. 조어가 필요하면 모든 음절이 명확히 발음되는 한글로 만들어.
        - 맞춤법을 임의의 발음 표기로 망가뜨리지는 말고, 가창 시 연음과 호흡이 자연스러운 어휘를 선택해. 출력 직전에 메타태그가 아닌 모든 줄을 소리 내어 읽는다고 가정해 발음 불가능한 토큰을 제거해.`
            : '';

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
        ${koreanPronunciationGuide}
        - 위 음악 스타일은 Suno의 "Style of Music" 정보이고 가사와 분리해. 스타일 문구를 lyrics 안에 되풀이하지 마.
        - 기본적으로 유튜브용 완곡에 어울리는 3~5분 분량을 목표로 하되, 곡 구조와 길이, 반복, 화음, 연주 구간은 장르와 서사에 맞게 자유롭게 판단해. 모든 섹션을 억지로 넣지 말고 곡에 필요한 것만 선택해.
        - 각 가사 블록의 첫 줄에는 [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Hook], [Bridge], [Break], [Instrumental], [Outro]처럼 Suno가 해석하기 쉬운 표준 영어 대괄호 태그를 배치해.
        - [Verse]는 이야기를 전개하고, [Chorus]는 가장 기억에 남는 핵심 가사를 같은 형태로 반복해. [Bridge]는 후렴과 다른 가사 톤으로 전환하며, [Outro]는 감정을 정리해.
        - 곡을 명확히 끝내야 할 때는 마지막에 [End]를 단독 줄로 넣어. 자연스럽게 잦아드는 엔딩에만 [Outro] 뒤 [Fade Out]을 사용하고 그 다음 [End]로 마쳐.
        - 보컬 구분이나 연주가 실제로 필요한 경우에만 [Female Singer], [Male Singer], [Duet], [Instrumental], [Solo: Electric Guitar] 같은 보조 태그를 섹션 태그 옆이나 바로 다음 줄에 추가해. 선택한 타겟 보컬 타입과 모순되면 안 돼.
        - 한 위치에 메타태그를 과도하게 쌓지 말고 핵심 태그 1~2개만 사용해. 메타태그는 제어 힌트일 뿐이므로 곡에 불필요한 태그를 억지로 넣지 마.
        - (whispered), (spoken), (belting), (humming)처럼 짧은 보컬·퍼포먼스 지시나 실제로 부를 애드리브만 영어 소괄호로 표시해. 악기 목록, 줄거리, 카메라 지시, 장면 묘사는 가사 태그에 넣지 마.
        - 각 가사 줄은 한 번에 부르기 좋은 짧은 구절로 써서 자막으로도 읽기 쉽게 하고, 지나치게 긴 문장과 설명문을 피해야 해. 후렴과 훅은 곡의 정체성을 위해 자연스럽게 반복할 수 있어.
        - 추상적인 감정만 나열하지 말고 장소, 사물, 빛과 색, 움직임처럼 장면이 떠오르는 구체적인 이미지를 가사에 자연스럽게 활용해.
        - 특정 소재나 악기를 임의로 금지하지 마. 사용자 특별 지시가 위 기본 원칙과 충돌하면 사용자의 지시를 우선해.
        - scenePrompts는 가사와 분리된 영어 시각 프롬프트로, 주요 파트의 장면만 제안해. 모든 가사 줄과 1:1로 맞출 필요는 없어.
        - 파싱을 위해 lyrics와 scenePrompts가 문자열 배열인 아래 JSON 구조를 유지해.

        {
            "lyrics": [
                "[Intro]",
                "(humming)",
                "",
                "[Verse 1]",
                "short singable lyric line",
                "",
                "[Chorus]",
                "repeatable hook line",
                "",
                "[Outro]",
                "closing lyric line",
                "[End]"
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
