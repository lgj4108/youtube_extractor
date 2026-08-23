import { NextResponse } from 'next/server';
import { google, youtube_v3 } from 'googleapis';
import { errorResponse, RequestError } from '@/lib/server/api';

const IGNORED_WORDS = new Set(['official', 'video', 'youtube', 'shorts', 'music', 'the', 'and', 'feat']);

function createYouTubeClient() {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) throw new RequestError('서버에 YOUTUBE_API_KEY가 설정되지 않았습니다.', 503);
    return google.youtube({ version: 'v3', auth: apiKey });
}

function normalizeKeyword(keyword: string) {
    return keyword.replace(/^#+/, '').replace(/\s+/g, ' ').trim();
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId')?.trim();
        const region = searchParams.get('region')?.trim() || 'KR';
        const params: youtube_v3.Params$Resource$Videos$List = {
            part: ['snippet'],
            chart: 'mostPopular',
            regionCode: region,
            maxResults: 50,
        };
        if (categoryId) params.videoCategoryId = categoryId;

        const response = await createYouTubeClient().videos.list(params);
        const tagCounts = new Map<string, number>();

        for (const video of response.data.items ?? []) {
            const tags = video.snippet?.tags ?? [];
            const titleWords = (video.snippet?.title ?? '').match(/[가-힣]{2,}|[A-Za-z]{3,}/g) ?? [];
            for (const rawKeyword of [...tags, ...titleWords]) {
                const keyword = normalizeKeyword(rawKeyword);
                if (!keyword || IGNORED_WORDS.has(keyword.toLowerCase())) continue;
                tagCounts.set(keyword, (tagCounts.get(keyword) ?? 0) + 1);
            }
        }

        const keywords = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
            .slice(0, 12)
            .map(([keyword]) => keyword);

        return NextResponse.json({ keywords });
    } catch (error: unknown) {
        return errorResponse(error, '트렌드 키워드를 가져오지 못했습니다.', 'YouTube trends API');
    }
}
