import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { errorResponse, optionalString, readJsonObject, requiredString, RequestError } from '@/lib/server/api';

function getYouTubeId(input: string): string | null {
    if (/^[\w-]{11}$/.test(input)) return input;

    try {
        const url = new URL(input);
        const hostname = url.hostname.replace(/^www\./, '');
        if (hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? null;
        if (!['youtube.com', 'm.youtube.com'].includes(hostname)) return null;
        if (url.pathname === '/watch') return url.searchParams.get('v');
        const [kind, videoId] = url.pathname.split('/').filter(Boolean);
        return ['shorts', 'embed', 'live'].includes(kind) ? videoId ?? null : null;
    } catch {
        return null;
    }
}

function decodeEntities(text: string) {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
    return text
        .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (entity, code: string) => {
            if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
            if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
            return named[code] ?? entity;
        })
        .replace(/\s+/g, ' ')
        .trim();
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const url = requiredString(body, 'url', '유튜브 URL을 입력해주세요.');
        const language = optionalString(body, 'language', 'auto');
        const videoId = getYouTubeId(url);
        if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
            throw new RequestError('올바른 유튜브 영상 URL이 아닙니다.');
        }

        let transcript;
        try {
            transcript = language === 'auto'
                ? await YoutubeTranscript.fetchTranscript(videoId)
                : await YoutubeTranscript.fetchTranscript(videoId, { lang: language });
        } catch {
            transcript = await YoutubeTranscript.fetchTranscript(videoId);
        }

        const segments = transcript.map((item) => ({
            duration: Number(item.duration) || 0,
            offset: Number(item.offset) || 0,
            text: decodeEntities(item.text),
        })).filter((item) => item.text);
        const text = decodeEntities(segments.map((item) => item.text).join(' '));
        if (!text) throw new RequestError('이 영상에서 사용할 수 있는 자막을 찾지 못했습니다.', 404);

        return NextResponse.json({ text, segments });
    } catch (error: unknown) {
        return errorResponse(error, '자막을 가져오지 못했습니다. 자막이 공개된 영상인지 확인해주세요.', 'Transcript API');
    }
}
