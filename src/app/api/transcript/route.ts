import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// 유튜브 URL에서 11자리 Video ID를 추출하는 헬퍼 함수
function getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = body?.url;

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: '유튜브 URL을 입력해주세요.' },
                { status: 400 }
            );
        }

        const videoId = getYouTubeId(url);
        if (!videoId) {
            return NextResponse.json(
                { error: '올바른 유튜브 URL 형식이 아닙니다.' },
                { status: 400 }
            );
        }

        // 한국어 자막 우선 가져오기
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });

        // 시간대별 쪼개진 텍스트를 하나의 문장으로 병합 및 HTML 엔티티 치환
        const fullText = transcriptArray
            .map((item) => item.text)
            .join(' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        return NextResponse.json({ text: fullText });
    } catch (error) {
        console.error('Transcript Fetch Error:', error);
        return NextResponse.json(
            { error: '자막을 가져오는데 실패했습니다. 자막이 없거나 지원하지 않는 영상일 수 있습니다.' },
            { status: 500 }
        );
    }
}