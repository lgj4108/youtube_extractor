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
            : `너는 트렌디한 글로벌 K-Pop 프로듀서이자 뮤직비디오 감독이야.`;

        const strictLangRule = (fullSubLangs.length === 0 && fullMainLang === 'Korean')
            ? `\n           - [초강력 경고] 보조 언어가 선택되지 않았습니다. 가사 원문에 **영단어나 영어 문장을 단 한 글자도 섞어 쓰지 마세요.** 랩이나 훅 부분도 오직 100% 순수 한국어(Korean)로만 작사하세요. (단, [Chorus] 같은 파트 구분 태그는 예외로 영어 대괄호 유지)`
            : '';

        const prompt = `
        ${roleAndCustom}
        
        [시스템 제공 데이터 및 곡 정보]
        - 곡 제목/주제: "${keyword}"
        - 음악 스타일: ${musicStyle || '지정되지 않음'}
        - 장르: ${genre}
        - 타겟 보컬 타입: ${vocalType}
        
        [⚠️ 작사 및 기획 시스템 코어 규칙]
        1. 🌐 언어 통제 및 오디오 지시어 영어 강제 (매우 중요):
           - 실제 부르는 '노래 가사 본문'과 '() 안의 화음/더블링 가사'는 메인 언어(${fullMainLang})${fullSubLangs.length > 0 ? '와 보조 언어(' + fullSubLangs.join(', ') + ')' : ''}만 사용해.${strictLangRule}
           - 🚨 [오디오 태그 영어 강제] 단, 대괄호 '[]' 안의 파트, 보컬, 악기, 분위기, 시각적 장소 묘사, 효과음(SFX) 지시어는 반드시 **100% 영어(English)**로만 작성해라. 타겟 보컬 타입(${vocalType}) 역시 영문으로 번역하여 적용해라.
           - [경고] 중국어(한자), 러시아어 등 지정되지 않은 언어는 단 한 글자도 출력하지 마.
        2. 🎵 시네마틱 사운드 디렉팅 및 완전한 창조적 자유 (최대 자율성 부여):
           - 당신은 천재적인 작사가이자 '사운드 디렉터'다. 어떠한 고정된 룰에도 얽매이지 말고, 2분 30초 ~ 3분 30초의 입체적인 곡을 자유롭게 기획해라.
           - 🎬 **[입체적 사운드 및 장소/분위기 묘사 허용]** 곡의 몰입도를 높이기 위해 악기, 보컬 샘플, 공간음(SFX)뿐만 아니라 **시각적/공간적 분위기 묘사도 메타태그 '[]' 안에 자유롭게 넣어라.** (예: '[Intro – Neon lit street, heavy rain, distant sirens]', '(-click. click. click-) [footsteps in an empty hall]')
           - 🌬️ **[배치의 완전한 자유]** 인트로(Intro)나 아웃트로(Outro)에 가사가 들어가도 전혀 상관없다. 보컬이 쉬어가는 구간을 두든, 처음부터 끝까지 가사로 채우든 곡의 흐름에 맞춰 자유롭게 배치해라. 화음 '()' 역시 넣고 싶은 곳에 센스 있게 사용해라.
           - **[서사적 변형]** 반복되는 파트(Chorus 등)의 가사를 똑같이 유지(복붙)해도 좋고, 감정선에 맞춰 변형해도 좋다. 곡의 느낌에 따라 자연스럽게 결정해라.
           - 1차원적인 사극 단어('해금', '조선' 등)는 절대 금지한다.
        3. 🎬 씬 동기화 (눈으로 보는 시각 정보):
           - 당신이 기획한 가사의 모든 파트마다 1:1 대응되는 씬 프롬프트를 작성하라 (100% 영어, 끝에 --ar 16:9 포함).
           - 시각적인 장소, 인물의 행동, 조명, 카메라 앵글, 영상 분위기는 오직 이 항목(scenePrompts)에만 묘사해야 한다.
        4. 🛡️ JSON 출력: 가사(lyrics)는 줄바꿈(\n) 없는 문자열 배열이어야 함. 파트 사이의 띄어쓰기는 빈 문자열("")로 넣어.
        
        반드시 아래 JSON 형식으로만 응답해. (아래 구조는 단순 예시일 뿐, 공간 묘사, 인트로 가사 유무, 화음 배치 등 모든 요소를 곡의 흐름에 맞춰 완전히 자유롭게 구성할 것)
        {
            "lyrics": [
                "[Intro: Neon lit street, heavy rain, distant sirens, ${genre} beat fades in]",
                "[Whispered background sample in an allowed lyric language]",
                "[Footsteps in an empty hall echoing]",
                "",
                "[Verse 1 - ${vocalType}, calm and restrained tone]",
                "거울 속에 비친 내 눈빛은 차가워",
                "가짜들의 속삭임은 전부 다 치워",
                "",
                "[Chorus - ${vocalType}, powerful emotional vocal]",
                "이건 나를 향한 혼잣말 (혼잣말)",
                "세상에 던지는 내 단 하나의 답",
                "",
                "[Beat Drop / Instrumental Break - Aggressive synth, shattered glass sound]",
                "(...이후 곡의 감정선과 흐름에 따라 화음, 공간/분위기 묘사, 가사를 완전히 자유롭게 구성할 것...)",
                "",
                "[Outro: Fading beat, echoing footsteps moving away]",
                "[Door closes with a heavy thud, silence]"
            ],
            "scenePrompts": [
                "Scene 1 (Intro): A neon-lit street at night, heavy rain pouring down, cinematic lighting --ar 16:9",
                "Scene 2 (당신이 기획한 첫 번째 파트): ... --ar 16:9",
                "...(가사 파트 개수에 맞춰 1:1로 씬 추가)..."
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
