import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        // 💡 categoryId 파라미터 추가
        const { keyword, period, duration, region, categoryId } = await request.json();

        if (!keyword || typeof keyword !== 'string') return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });

        const targetDate = new Date();
        if (period === 'week') targetDate.setDate(targetDate.getDate() - 7);
        else if (period === '3months') targetDate.setMonth(targetDate.getMonth() - 3);
        else if (period === 'all') targetDate.setFullYear(targetDate.getFullYear() - 10);
        else targetDate.setMonth(targetDate.getMonth() - 1);

        const searchParams: any = {
            part: ['id'],
            q: keyword,
            type: ['video'],
            order: 'viewCount',
            publishedAfter: targetDate.toISOString(),
            maxResults: 5,
        };

        if (duration && duration !== 'any') searchParams.videoDuration = duration;
        if (region && region !== 'ALL') searchParams.regionCode = region;

        // 💡 카테고리 필터링 적용 (음악=10, 게임=20 등)
        if (categoryId) searchParams.videoCategoryId = categoryId;

        const searchResponse = await youtube.search.list(searchParams);
        const searchItems = searchResponse.data.items || [];
        const videoIds = searchItems.map((item) => item.id?.videoId).filter(Boolean) as string[];

        if (videoIds.length === 0) return NextResponse.json({ rawData: [] });

        const videosResponse = await youtube.videos.list({
            part: ['snippet', 'statistics'],
            id: videoIds,
        });

        const videos = videosResponse.data.items || [];

        // ... (이하 댓글 수집 및 isHot 계산 등의 기존 로직 동일하게 유지) ...
        // ... [기존 코드 그대로 두시면 됩니다] ...

        const rawData = await Promise.all(videos.map(async (video) => {
            // (기존 로직 생략: 통계 및 댓글 수집)
            return {
                videoId: video.id,
                title: video.snippet?.title,
                channelTitle: video.snippet?.channelTitle,
                publishedAt: video.snippet?.publishedAt,
                thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
                viewCount: video.statistics?.viewCount || '0',
                likeCount: video.statistics?.likeCount || '0',
                commentCount: video.statistics?.commentCount || '0',
                tags: video.snippet?.tags?.slice(0, 5) || [],
                topComments: ['댓글 생략'], // (기존 로직 유지)
                engagementRate: 0,
                isHot: false,
            };
        }));

        return NextResponse.json({ rawData });
    } catch (error: any) {
        return NextResponse.json({ error: '유튜브 데이터를 가져오는데 실패했습니다.' }, { status: 500 });
    }
}