import 'server-only';

export const SUNO_LYRICS_STRUCTURE_GUIDE = `[Suno Lyrics 구조화 표준]
- Style of Music과 Lyrics의 역할을 분리해. 장르·전체 템포·전체 악기 구성·믹싱 설명은 Style 필드의 정보이며, Lyrics에는 곡 구조와 해당 순간에 실제로 필요한 섹션별 연출만 넣어.
- 각 섹션은 반드시 별도 줄의 표준 영어 구조 태그로 시작해. 기본 어휘는 [Instrumental Intro], [Intro], [Verse 1], [Verse 2], [Pre-Chorus], [Chorus], [Post-Chorus], [Hook], [Bridge], [Breakdown], [Instrumental Break], [Outro], [End]야. 곡에 필요하지 않은 섹션은 넣지 마.
- 섹션별 수식어가 필요하면 하이픈 나열보다 콜론 구문 [Verse 1: close-mic, muted drums], [Chorus: full band, wide harmonies], [Bridge: stripped down, vulnerable vocal]을 우선해. 구조 이름을 맨 앞에 두고 서로 충돌하지 않는 핵심 수식어 1~3개만 사용해.
- 연주 인트로는 [Intro] 다음 [Instrumental]을 중복해 쌓지 말고 [Instrumental Intro] 또는 [Instrumental Intro: descriptors] 한 줄로 표현해. 중간 연주는 [Instrumental Break], 특정 솔로는 [Guitar Solo], [Piano Solo]처럼 정확한 태그를 사용해.
- 보컬 담당이나 창법이 바뀌는 지점에만 [Female Vocal], [Male Vocal], [Duet], [Rap], [Spoken Word], [Whisper], [Humming], [Choir], [Harmony], [Backing Vocals] 같은 태그를 별도 줄로 배치해. 같은 보컬이 계속되는데 매 줄마다 반복하지 마.
- 대괄호에는 구조·보컬·편곡·다이내믹 지시만 넣고, 실제로 들리는 짧은 응답·애드리브·샘플·메아리는 소괄호로 써. 설명문, 카메라 지시, 줄거리 메모는 어느 괄호에도 넣지 마.
- Verse는 새로운 사건과 이미지를 전개하고, 같은 Chorus가 다시 나올 때는 핵심 훅 가사를 가능한 한 그대로 반복해 멜로디 반복을 유도해. 마지막 후렴은 같은 훅을 유지한 채 [Chorus: reprise, wider harmonies]처럼 레이어나 강도만 발전시킬 수 있어.
- 장르가 허용하면 Verse는 대체로 4~8개의 짧은 가창 줄, Pre-Chorus는 2~4줄, Chorus/Hook은 2~5줄의 기억 가능한 문장으로 압축해. 줄 수를 기계적으로 맞추기보다 장황한 설명문과 10줄 이상 계속되는 단일 섹션을 피하는 기준으로 사용해.
- 곡의 정체성에 도움이 될 때만 짧고 독창적인 반복 모티프 하나를 만들고, intro의 희미한 샘플 → chorus의 backing response → outro의 변형처럼 2~3회 발전시켜. 모든 곡에 효과음이나 샘플을 강제하지 마.
- [Fade In], [Fade Out], [Silence], [Crescendo], [Decrescendo], [Key Change] 같은 독립 태그는 실제 변화가 시작되는 정확한 위치에만 사용해. [End]는 마지막 단독 줄로 두고 뒤에 텍스트를 쓰지 마.
- 섹션 사이에는 빈 줄을 하나 두어 붙여 넣었을 때 구조가 분명하게 보이게 해. 출력 전에 중복 태그, 비표준 복수형 태그, 서로 모순되는 수식어, 불필요하게 반복된 제작 지시를 제거해.`;
