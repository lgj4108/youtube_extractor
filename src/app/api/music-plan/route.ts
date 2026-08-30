import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringValue } from '@/lib/server/ai';
import { errorResponse, optionalString, optionalStringArray, readJsonObject } from '@/lib/server/api';

interface MusicPlanningSource {
    title?: unknown;
    tags?: unknown;
}

function creativeSliderValue(value: unknown, fallback: number) {
    const numeric = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number.parseFloat(value)
            : Number.NaN;
    if (!Number.isFinite(numeric)) return fallback;
    const clamped = Math.min(100, Math.max(0, numeric));
    return Math.round(clamped / 5) * 5;
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
        
        사용자의 핵심 키워드는 창작 의도와 감정의 출발점으로 존중하되, 제목·훅·모든 장면에 같은 단어를 강제로 반복하지 말고 서로 결이 다른 곡 콘셉트 3가지로 자유롭게 해석해 줘.
        키워드가 추상적이면 그 단어를 설명하지 말고 사람이 실제로 겪을 수 있는 관계, 장소, 사건과 선택으로 번역해. 정확한 키워드 표현을 가사에 넣지 않아도 의도가 살아 있으면 더 좋은 기획으로 판단해.
        유튜브 데이터는 있을 때만 아이디어를 넓히는 참고 자료로 사용하고 그대로 모방하지 마.
        장르에 전통, 실험, 시대적 소재가 포함되면 임의로 배제하지 말고 사용자의 의도에 맞게 해석해.

        [응답 구성]
        - 제목, concept, lyricBrief는 ${langGuide}으로 자연스럽게 작성해.
        - concept는 이 곡만의 화자와 청자 관계, 현재 벌어지는 사건, 핵심 갈등과 정서를 한두 문장으로 명확하게 요약해. 키워드의 사전적 의미나 음악 스타일 설명을 반복하지 마.
        - lyricBrief는 이후 가사 AI가 그대로 이어 쓸 핵심 기획서야. 화자와 청자, 배경 상황, 벌스에서 전개할 사건, 프리코러스의 전환, 후렴의 핵심 메시지와 훅 방향, 브리지에서 바뀌는 감정, 마지막 도착점을 5~8문장으로 구체화해.
        - lyricBrief에는 하나의 사건 안에서 서로 연결되는 핵심 사물·장소·감각 이미지 2~4개와 피해야 할 상투적 표현을 자연스럽게 포함해. 이미지를 체크리스트처럼 전부 사용하라고 지시하거나 완성 가사와 긴 샘플 문구를 미리 쓰지는 마.
        - 키워드를 가사에서 어떤 역할로 사용할지 제목, 훅, 중심 비유, 배경 영감 중 하나만 선택해 브리프에 반영해. 정확한 단어가 부자연스러우면 가사에 직접 쓰지 않고 정서적 영감으로만 남겨.
        - musicStyle은 Suno의 "Style of Music" 입력란에 그대로 붙여넣을 수 있는 자연스러운 영어 설명으로 작성해.
        - genre:, vocal:, instrumentation:, style tags:, production:, tempo: 같은 필드명, JSON 형태, 불필요한 따옴표를 출력하지 마. 내부적으로는 이 범주들을 점검하되 최종 결과는 2~4개의 간결한 문장으로 자연스럽게 연결해.
        - 첫 문장에서 핵심 하위 장르, 시대감, 숫자 BPM, 조성 또는 전체 질감을 명확히 제시하고, 이어서 보컬과 주요 악기, 마지막으로 편곡·믹싱·공간감·다이내믹을 설명해.
        - 전체 핵심 조건은 대략 8~15개, 40~80단어로 제한하고 영향력이 큰 조건부터 배치해. 서로 관련된 조건은 led by, with, driven by 같은 짧은 연결 표현으로 묶어 읽기 쉬운 제작 지시로 만들어.
        - genre에는 넓은 장르명 하나만 쓰지 말고 하위 장르에 질감, 시대감, 연주 방식 중 관련 보정 요소 2~3개를 결합해.
        - 감정이나 상황을 설명하는 문장 대신 minor key feel, sparse arrangement, soft dynamics처럼 실제로 들리는 사운드 특성으로 변환해.
        - instrumentation에는 악기 이름만 나열하지 말고 fingerpicking, muted, distorted, dry recording처럼 핵심 악기의 연주법이나 소리 질감을 함께 명시해.
        - vocal에는 보컬 타입, 음색, 전달 방식, 마이킹 중 곡에 중요한 것만 담고, tempo에는 숫자 BPM과 체감 속도를 담아.
        - 가사, 장면 묘사, 곡의 줄거리, 목표 재생 시간, [Intro]·[Verse] 같은 섹션 태그, 효과음 지시는 musicStyle에 섞지 마. 이런 구조·연출 지시는 가사 생성 단계에서만 사용해.
        - 사용자가 원하지 않는 요소를 명시했다면 마지막 문장에 자연스러운 영어로 짧게 제외 조건을 설명하되 exclusions: 같은 필드명은 쓰지 마.
        - musicStyleKor은 musicStyle의 음악 설계를 ${fullMainLang}로 간단히 설명해.
        - 각 콘셉트에 Suno Creative Sliders 추천값인 weirdness와 styleInfluence를 0~100 사이의 5 단위 정수로 제안해. 이 값들은 musicStyle 문자열 안에 넣지 말고 별도 필드로 출력해.
        - Weirdness는 50을 균형 기준으로 삼아 대중적이고 안정적인 곡은 30~50, 적당히 개성적인 곡은 50~65, 실험·글리치·예측 불가능성이 핵심인 곡은 65~85 범위에서 선택해. 특별한 이유 없이 0이나 100을 쓰지 마.
        - Style Influence는 스타일 프롬프트를 충실히 재현해야 할수록 75~90, 장르 혼합과 우연성을 더 허용할수록 55~75 범위에서 선택해. 구체적인 사용자 지시가 많을수록 높은 값을 우선해.
        - sunoSettingsReason은 두 추천값의 이유를 ${fullMainLang}로 한 문장에 설명해.
        - 파싱을 위해 아래 JSON 구조를 유지해.
        
        {
            "inferredTheme": "(${fullMainLang} 언어) 핵심 음악 트렌드",
            "plans": [
                {
                    "title": "(${fullMainLang} 언어) 곡 제목",
                    "concept": "(${fullMainLang}) 화자, 상황, 핵심 정서를 담은 곡 콘셉트",
                    "lyricBrief": "(${fullMainLang}) 화자와 청자, 배경, 벌스 전개, 감정 전환, 후렴 메시지와 훅 방향, 브리지와 결말, 핵심 이미지, 피할 표현을 담은 가사 기획서",
                    "musicStyle": "90s underground boom bap at 90 BPM in a dark minor key, led by a sharp female rap vocal with a cynical tone and double-tracked chorus layers. Chopped jazz guitar samples, heavy vinyl snares, punchy kicks, and upright bass drive a gritty head-nodding groove. Raw analog tape saturation and lo-fi compression, with narrow close-mic verses and wider layered choruses.",
                    "musicStyleKor": "(${fullMainLang}) 스타일 설명",
                    "weirdness": 55,
                    "styleInfluence": 80,
                    "sunoSettingsReason": "(${fullMainLang}) 추천값을 선택한 이유"
                }
            ]
        }
        `;

        const { text } = await generateText({
            model: aiModel,
            system: `Create original music concepts from the user's intent. Return valid JSON matching the requested schema so the application can parse it. Prefer ${fullMainLang} for general fields while allowing natural genre terms and loanwords. Give every plan a distinct concept and a production-ready lyricBrief that preserves the user's narrative intent for the later lyric-writing step. Write musicStyle as a polished, paste-ready English Suno style description in natural prose; never expose category labels such as genre:, vocal:, instrumentation:, production:, or tempo:.`,
            prompt: prompt,
            temperature: 0.7
        });

        const parsedData = parseJsonObject(text);
        const inferredTheme = stringValue(parsedData.inferredTheme);
        const plans = Array.isArray(parsedData.plans)
            ? parsedData.plans.filter((plan) => plan && typeof plan === 'object').slice(0, 3).map((plan) => {
                const result = plan as Record<string, unknown>;
                return {
                    ...result,
                    sourceKeyword: creativeKeyword,
                    planningTheme: inferredTheme,
                    concept: stringValue(result.concept),
                    lyricBrief: stringValue(result.lyricBrief),
                    weirdness: creativeSliderValue(result.weirdness, 50),
                    styleInfluence: creativeSliderValue(result.styleInfluence, 80),
                    sunoSettingsReason: stringValue(result.sunoSettingsReason) || '균형 잡힌 창의성과 스타일 재현을 위한 기본 추천값입니다.',
                };
            })
            : [];
        if (plans.length === 0) throw new Error('AI가 유효한 음악 기획안을 반환하지 않았습니다.');

        return NextResponse.json({
            inferredTheme,
            plans,
            usedPrompt: prompt,
        });
    } catch (error: unknown) {
        return errorResponse(error, '음악 기획안 생성에 실패했습니다. API 키와 모델 설정을 확인해주세요.', 'Music plan API');
    }
}
