import { NextResponse } from 'next/server';
import { google, youtube_v3 } from 'googleapis';
import { errorResponse, optionalString, readJsonObject, RequestError, requiredString } from '@/lib/server/api';
import type { YouTubeVideo } from '@/types/youtube';

const MAX_RESULTS = 10;

function createYouTubeClient() {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) throw new RequestError('서버에 YOUTUBE_API_KEY가 설정되지 않았습니다.', 503);
    return google.youtube({ version: 'v3', auth: apiKey });
}

function getPublishedAfter(period: string) {
    if (period === 'all') return undefined;

    const targetDate = new Date();
    if (period === 'week') targetDate.setDate(targetDate.getDate() - 7);
    else if (period === '3months') targetDate.setMonth(targetDate.getMonth() - 3);
    else targetDate.setMonth(targetDate.getMonth() - 1);
    return targetDate.toISOString();
}

function toCount(value: string | null | undefined) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function getTopComments(youtube: youtube_v3.Youtube, videoId: string) {
    try {
        const response = await youtube.commentThreads.list({
            part: ['snippet'],
            videoId,
            order: 'relevance',
            textFormat: 'plainText',
            maxResults: 3,
        });
        return (response.data.items ?? [])
            .map((item) => item.snippet?.topLevelComment?.snippet?.textOriginal)
            .filter((comment): comment is string => typeof comment === 'string' && Boolean(comment.trim()));
    } catch {
        return [];
    }
}

export async function POST(request: Request) {
    try {
        const body = await readJsonObject(request);
        const keyword = requiredString(body, 'keyword', '검색할 키워드를 입력해주세요.').slice(0, 100);
        const period = optionalString(body, 'period', 'month');
        const duration = optionalString(body, 'duration', 'any');
        const region = optionalString(body, 'region', 'KR');
        const categoryId = optionalString(body, 'categoryId');
        const youtube = createYouTubeClient();

        const searchParams: youtube_v3.Params$Resource$Search$List = {
            part: ['id'],
            q: keyword,
            type: ['video'],
            order: 'viewCount',
            publishedAfter: getPublishedAfter(period),
            maxResults: MAX_RESULTS,
        };
        if (['short', 'medium', 'long'].includes(duration)) searchParams.videoDuration = duration;
        if (region !== 'ALL') searchParams.regionCode = region;
        if (categoryId) searchParams.videoCategoryId = categoryId;

        const searchResponse = await youtube.search.list(searchParams);
        const videoIds = (searchResponse.data.items ?? [])
            .map((item) => item.id?.videoId)
            .filter((videoId): videoId is string => Boolean(videoId));

        if (videoIds.length === 0) return NextResponse.json({ rawData: [] satisfies YouTubeVideo[] });

        const videosResponse = await youtube.videos.list({
            part: ['snippet', 'statistics'],
            id: videoIds,
        });

        const rawData = await Promise.all((videosResponse.data.items ?? []).map(async (video) => {
            const viewCount = toCount(video.statistics?.viewCount);
            const likeCount = toCount(video.statistics?.likeCount);
            const commentCount = toCount(video.statistics?.commentCount);
            const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
            const publishedAt = video.snippet?.publishedAt ?? '';
            const ageInDays = publishedAt
                ? Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / 86_400_000)
                : 1;

            return {
                videoId: video.id ?? '',
                title: video.snippet?.title ?? '제목 없음',
                channelTitle: video.snippet?.channelTitle ?? '채널 정보 없음',
                publishedAt,
                thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url ?? '',
                viewCount: String(viewCount),
                likeCount: String(likeCount),
                commentCount: String(commentCount),
                tags: video.snippet?.tags?.slice(0, 8) ?? [],
                topComments: video.id ? await getTopComments(youtube, video.id) : [],
                engagementRate,
                viewsPerDay: viewCount / ageInDays,
            };
        }));

        const sortedVelocity = rawData.map((video) => video.viewsPerDay).sort((a, b) => a - b);
        const medianVelocity = sortedVelocity[Math.floor(sortedVelocity.length / 2)] ?? 0;
        const normalized: YouTubeVideo[] = rawData.map(({ viewsPerDay, ...video }) => ({
            ...video,
            isHot: viewsPerDay >= medianVelocity * 1.5 && video.engagementRate >= 0.5,
        }));

        return NextResponse.json({ rawData: normalized });
    } catch (error: unknown) {
        return errorResponse(error, '유튜브 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', 'YouTube planner API');
    }
}
