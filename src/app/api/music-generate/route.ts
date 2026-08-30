import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAiModel, parseJsonObject, stringArray } from '@/lib/server/ai';
import { errorResponse, optionalString, optionalStringArray, readJsonObject, requiredString } from '@/lib/server/api';
import { LYRICS_WRITING_QUALITY_GUIDE, SUNO_LYRICS_STRUCTURE_GUIDE } from '@/lib/server/suno-lyrics';

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const aiModel = createAiModel(body);
        const keyword = requiredString(body, 'keyword', '곡 제목 또는 주제를 입력해주세요.');
        const creativeKeyword = optionalString(body, 'creativeKeyword').slice(0, 500);
        const inferredTheme = optionalString(body, 'inferredTheme').slice(0, 2_000);
        const concept = optionalString(body, 'concept').slice(0, 4_000);
        const lyricBrief = optionalString(body, 'lyricBrief').slice(0, 12_000);
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

        const vocalDirections: Record<string, string> = {
            'Female Solo': `여성 솔로가 필수다. 첫 노래 파트와 창법이 바뀌는 지점에 [Female Vocal]을 명시하고, 필요한 구간에서만 [Whisper], [Humming], [Rap], [Harmony], [Backing Vocals] 중 하나를 보조 태그로 추가해. [Male Vocal]이나 [Duet]을 사용하지 마.`,
            'Male Solo': `남성 솔로가 필수다. 첫 노래 파트와 창법이 바뀌는 지점에 [Male Vocal]을 명시하고, 필요한 구간에서만 [Whisper], [Humming], [Rap], [Harmony], [Backing Vocals] 중 하나를 보조 태그로 추가해. [Female Vocal]이나 [Duet]을 사용하지 마.`,
            'Duet': `혼성 듀엣이 필수다. 솔로 파트는 [Female Vocal]과 [Male Vocal]로 명확히 나누고, 함께 부르는 후렴이나 엔딩에는 [Duet]을 명시해. 두 화자의 관점과 가사를 구분하고 최소 한 구간씩 공평하게 배정해.`,
            'Idol Group': `아이돌 그룹 보컬이 필수다. 곡에 맞는 그룹 성별 구성을 먼저 결정한 뒤 [Lead Vocal], [Group Vocals], [Rap], [Backing Vocals]로 파트를 분담해. 후렴에는 [Group Vocals]을 명시하고, 한 명의 솔로처럼만 구성하지 마.`,
            'Auto': `장르, 음악 스타일, 서사에 가장 맞는 솔로·듀엣·그룹 구성을 하나 결정해. 첫 노래 파트부터 [Female Vocal], [Male Vocal], [Duet], [Lead Vocal], [Group Vocals] 중 실제 선택 결과를 명시하고, [Auto]나 [AI Vocal]이라는 태그는 출력하지 마.`,
        };
        const vocalDirection = vocalDirections[vocalType] || vocalDirections.Auto;

        const lyricsExamples: Record<string, string[]> = {
            'Female Solo': ['[Intro: filtered hook preview, distant]', '[Female Vocal]', '(short hook fragment)', '', '[Verse 1: close-mic, narrow stereo]', 'short scene-setting lyric line', '', '[Chorus: wide stereo, layered harmonies]', '[Backing Vocals]', 'repeatable hook line', '(short backing response)', '', '[Bridge: stripped down, long reverb]', '[Whisper]', 'a new decision or realization', '', '[Chorus: reprise, wider harmonies]', '[Female Vocal] [Backing Vocals]', 'repeatable hook with changed resolution', '', '[Outro: distant vocal, fade out]', 'closing lyric line', '[End]'],
            'Male Solo': ['[Intro: close-mic, vinyl crackle]', '[Male Vocal] [Spoken Word]', 'one concise scene-setting line', '', '[Verse 1: dry vocal, muted rhythm section]', '[Rap]', 'short lyric that advances the event', '', '[Chorus: full band, wide harmonies]', '[Male Vocal] [Backing Vocals]', 'clear conversational hook line', '(short backing response)', '', '[Bridge: stripped down, long reverb]', 'a new choice or realization', '', '[Chorus: reprise, wider harmonies]', '[Backing Vocals]', 'same hook with changed resolution', '', '[End]'],
            'Duet': ['[Intro: overlapping whispers, split stereo]', '[Female Vocal]', 'first voice question', '[Male Vocal]', 'second voice answer', '', '[Verse 1: left channel, close-mic]', '[Female Vocal]', 'first perspective lyric line', '', '[Verse 2: right channel, close-mic]', '[Male Vocal]', 'second perspective lyric line', '', '[Chorus: wide stereo, call and response]', '[Duet] [Backing Vocals]', 'shared repeatable hook line', '', '[Bridge: stripped down, alternating voices]', 'a decision that changes both perspectives', '', '[End]'],
            'Idol Group': ['[Instrumental Intro: chopped vocal loop, wide stereo]', '', '[Verse 1: tight mono, close-mic]', '[Lead Vocal]', 'lead lyric line', '', '[Pre-Chorus: building energy, adding layers]', '[Rap] [Backing Vocals]', 'short rap line', '', '[Chorus: full production, layered harmonies]', '[Group Vocals] [Backing Vocals]', 'shared repeatable hook line', '', '[Chorus: reprise, wider harmonies]', '[Group Vocals] [Harmony]', 'shared repeatable hook line', '', '[Outro: chopped hook, fade out]', 'closing lyric line', '[End]'],
            'Auto': ['[Verse 1: cold open, close-mic]', '[Female Vocal]', 'begin directly with a concrete action or line of dialogue', '', '[Hook: wider vocal, minimal beat]', '[Backing Vocals]', 'short repeatable emotional statement', '', '[Verse 2: fuller groove]', 'new action that changes the situation', '', '[Bridge: stripped down, vulnerable vocal]', 'a choice or realization', '', '[Hook: reprise, full harmony]', 'same hook with changed emotional meaning', '', '[End]'],
        };
        const responseExample = JSON.stringify({
            lyrics: lyricsExamples[vocalType] || lyricsExamples.Auto,
        }, null, 4);

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
        - 사용자가 처음 입력한 창작 키워드(영감용, 가사 내 직접 사용은 선택): ${creativeKeyword || '별도 정보 없음'}
        - 전체 기획 테마: ${inferredTheme || '별도 정보 없음'}
        - 이 곡의 콘셉트: ${concept || '제목과 스타일에서 자연스럽게 추론'}
        - 음악 스타일: ${musicStyle || '지정되지 않음'}
        - 장르: ${genre}
        - 사용자가 선택한 보컬 구성(필수 적용): ${vocalType}

        [가사 기획 브리프 — 핵심 연결 정보]
        ${lyricBrief || '별도의 가사 브리프가 없으므로 제목과 곡 콘셉트에서 자연스러운 인간적 상황을 자유롭게 설계해. 창작 키워드는 영감으로만 사용해도 돼.'}
        - 위 브리프는 기획 단계에서 선택된 이 곡의 서사 설계야. 화자, 청자, 배경, 감정선, 후렴 메시지, 이미지와 결말을 가사에 실제로 반영해.
        - 브리프를 설명문처럼 가사에 복사하지 말고 각 섹션의 사건, 구체적 이미지, 훅과 감정 변화로 변환해.
        - 사용자의 현재 특별 연출 지시가 브리프와 충돌하면 사용자의 현재 지시를 우선하고, 나머지 브리프는 최대한 유지해.

        [보컬 설계 — 필수]
        - ${vocalDirection}
        - 선택된 보컬 구성은 단순 참고값이 아니라 필수 제약이야. 특별 지시로 음색·창법을 더 구체화할 수는 있지만 선택된 성별·인원 구성과 모순되게 바꾸지 마.
        - 첫 노래 파트와 보컬 담당·창법이 바뀌는 지점에는 구조 태그 다음 줄에 담당 보컬 태그를 넣어, 누가 부르는지 명확하게 만들어. 같은 보컬이 이어질 때는 태그를 기계적으로 반복하지 마.

        ${SUNO_LYRICS_STRUCTURE_GUIDE}

        ${LYRICS_WRITING_QUALITY_GUIDE}

        [공간감·코러스·사운드 연출]
        - 곡의 콘셉트와 음악 스타일에 도움이 될 때는 가사뿐 아니라 청자가 실제로 듣게 될 공간과 음향의 변화를 시간 순서로 설계해. 모든 곡에 아래 요소를 전부 강제로 넣지는 마.
        - 섹션 태그는 [Verse 1: close-mic, narrow stereo], [Chorus: wide stereo, layered harmonies], [Bridge: no percussion, long reverb]처럼 표준 구조 이름을 맨 앞에 두고, 콜론 뒤에 해당 구간의 핵심 음향 지시를 짧은 영어로 덧붙여.
        - 공간 지시는 left channel, right channel, centered, foreground, distant, close-mic, narrow stereo, wide stereo, empty room, long reverb, short delay처럼 실제 청감으로 확인 가능한 표현을 사용해.
        - [Chorus]는 반복되는 후렴 구간이고, [Choir], [Backing Vocals], [Layered Vocals], [Group Vocals], [Unison], [Call and Response]는 보컬 레이어 연출이야. 둘을 혼동하지 말고 후렴의 폭과 화음이 필요할 때 적절히 결합해.
        - 곡의 정체성을 만드는 짧고 독창적인 보컬 샘플이나 애드리브를 하나 정했다면 괄호 안에 표시하고, 섹션이 진행될수록 volume, pan, pitch, filtering, chopping, looping 중 필요한 변화를 주어 반복 모티프로 발전시킬 수 있어.
        - [Abrupt Silence], [Loop Cuts on Beat], [Pitch Shifted Down], [Sample Grows Louder], [Heartbeat Slows], [Percussion Drops Out]처럼 전환 지시는 정확한 발생 지점에 독립된 줄로 배치해. 같은 효과를 습관적으로 반복하지 마.
        - 벌스는 가까운 단일 보컬과 좁은 공간, 후렴은 넓은 스테레오와 겹친 코러스, 브리지는 악기를 덜어낸 대비, 마지막 후렴은 확장된 레이어, 아웃트로는 멀어지는 잔향처럼 공간의 대비를 만들 수 있어. 단, 장르와 서사에 맞는 경우에만 선택해.
        - 일반 가사는 꾸밈 없이 한 줄씩 쓰고, 실제로 들릴 샘플·대사·애드리브만 괄호 안에 써. 대괄호 안의 영어는 노래로 부를 문장이 아니라 Suno가 해석할 음향·퍼포먼스 지시여야 해.
        - 참고 작품의 문장, 샘플 문구, 고유한 비유를 복사하지 말고 구조적 기법과 음향 설계 방식만 학습해 완전히 새로운 가사와 반복 모티프를 만들어.
        
        [창작 방향]
        - 곡 콘셉트, 가사 기획 브리프, 제목과 특별 지시를 하나의 이해 가능한 사건으로 연결해. 창작 키워드는 정확한 단어를 가사에 넣는 것보다 정서와 방향을 살리는 것이 우선이며, 부자연스러우면 직접 사용하지 마.
        - 가사는 ${fullMainLang}를 중심으로 작성하고${fullSubLangs.length ? ` ${fullSubLangs.join(', ')}를 자연스럽게 섞을 수 있어` : ' 장르상 자연스러운 외래어와 훅은 허용해'}.
        ${koreanPronunciationGuide}
        - 위 음악 스타일은 Suno의 "Style of Music" 정보이고 가사와 분리해. 스타일 문구를 lyrics 안에 되풀이하지 마.
        - 기본적으로 유튜브용 완곡에 어울리는 3~5분 분량을 목표로 하되, 곡 구조와 길이, 반복, 화음, 연주 구간은 장르와 서사에 맞게 자유롭게 판단해. Intro–Verse–Pre-Chorus–Chorus–Verse–Bridge 틀을 매번 복제하지 말고 곡에 필요한 섹션만 선택해.
        - 각 가사 블록의 첫 줄에는 [Instrumental Intro], [Verse 1], [Pre-Chorus], [Chorus], [Hook], [Bridge], [Breakdown], [Instrumental Break], [Outro]처럼 Suno가 해석하기 쉬운 표준 영어 대괄호 태그를 배치해.
        - [Verse]는 이야기를 전개하고, [Chorus]는 가장 기억에 남는 핵심 가사를 같은 형태로 반복해. [Bridge]는 후렴과 다른 가사 톤으로 전환하며, [Outro]는 감정을 정리해.
        - 곡을 명확히 끝내야 할 때는 마지막에 [End]를 단독 줄로 넣어. 자연스럽게 잦아드는 엔딩에만 [Outro] 뒤 [Fade Out]을 사용하고 그 다음 [End]로 마쳐.
        - 보컬 태그는 [Female Vocal], [Male Vocal], [Duet], [Lead Vocal], [Group Vocals]을 기본으로 하고, 필요한 순간에만 [Rap], [Whisper], [Humming], [Choir], [Harmony], [Backing Vocals] 같은 연출 태그를 하나 더 결합해.
        - 가사가 없는 [Intro], [Instrumental], [Guitar Solo], [Piano Solo]는 연주 구간으로 사용해. 같은 태그 아래 가사를 두면 보컬 구간으로 해석될 수 있으므로 의도에 맞춰 구분해.
        - [Crescendo], [Decrescendo], [Accelerando] 같은 다이내믹 태그와 [Rain SFX], [Thunder SFX], [Applause] 같은 효과음 태그는 실제로 그 변화나 소리가 시작될 정확한 위치에만 넣어. 음악적으로 불필요하면 사용하지 마.
        - 한 위치에 메타태그를 과도하게 쌓지 말고 구조 태그와 핵심 연출 태그를 합쳐 2~3개 이내로 사용해. 메타태그는 제어 힌트일 뿐이므로 곡에 불필요한 태그를 억지로 넣지 마.
        - (whispered), (spoken), (belting), (humming)처럼 실제로 부를 애드리브나 미세한 퍼포먼스 지시는 영어 소괄호로 표시해. 음악적 지시가 아닌 줄거리, 카메라 지시, 시각적 장면 묘사는 가사 태그에 넣지 마.
        - 각 가사 줄은 한 번에 부르기 좋은 짧은 구절로 써서 자막으로도 읽기 쉽게 하고, 지나치게 긴 문장과 설명문을 피해야 해. 후렴과 훅은 곡의 정체성을 위해 자연스럽게 반복할 수 있어.
        - 추상적인 감정만 나열하지 말고 장소, 사물, 빛과 색, 움직임처럼 장면이 떠오르는 구체적인 이미지를 가사에 자연스럽게 활용해.
        - 특정 소재나 악기를 임의로 금지하지 마. 사용자 특별 지시가 위 기본 원칙과 충돌하면 사용자의 지시를 우선해.
        - 영상, 앨범 커버, 이미지 제작용 프롬프트는 생성하지 마.
        - 파싱을 위해 lyrics가 문자열 배열인 아래 JSON 구조를 유지해.

        아래 예시는 현재 보컬 구성(${vocalType})을 반영한 형식 예시야. 예시의 가사 문구는 복사하지 말고 실제 곡에 맞게 새로 작성해.
        ${responseExample}
        `;

        const { text } = await generateText({
            model: aiModel,
            system: `Write original, emotionally intelligible, naturally singable, structured Suno-ready lyrics as valid JSON. The selected vocal configuration (${vocalType}) is mandatory. Treat keywords as optional creative seeds, never as words that must be repeated. Prioritize a coherent human situation, natural phrasing, concrete actions, a conversational hook, and meaningful emotional progression. Choose the intro form intentionally instead of defaulting to an instrumental. Use canonical section tags without clutter. Silently revise tautologies, translation-like phrasing, filler rhymes, forced English, and abstract concept summaries before returning lyrics. Return lyrics only and never copy lyrics or distinctive phrases from a reference work.`,
            prompt,
            temperature: 0.65,
        });
        const parsedData = parseJsonObject(text);
        const lyrics = stringArray(parsedData.lyrics);
        if (lyrics.length === 0) throw new Error('AI가 유효한 가사를 반환하지 않았습니다.');

        return NextResponse.json({
            lyrics,
            usedPrompt: prompt
        });

    } catch (error: unknown) {
        return errorResponse(error, '가사 생성에 실패했습니다. API 키와 모델 설정을 확인해주세요.', 'Music generation API');
    }
}
