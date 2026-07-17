import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

export async function GET(request: NextRequest) {
    try {
        // 💡 URL에서 categoryId를 파싱해옵니다.
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');

        const requestParams: any = {
            part: ['snippet'],
            chart: 'mostPopular',
            regionCode: 'KR', // 기본 한국 트렌드
            maxResults: 15,
        };

        // 💡 categoryId가 전달되었다면 파라미터에 추가 (예: 음악 = 10)
        if (categoryId) {
            requestParams.videoCategoryId = categoryId;
        }

        const response = await youtube.videos.list(requestParams);
        const items = response.data.items || [];

        const tagCounts: { [key: string]: number } = {};
        items.forEach((video) => {
            const tags = video.snippet?.tags || [];
            tags.forEach((tag) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0])
            .slice(0, 5);

        return NextResponse.json({ keywords: sortedTags });
    } catch (error: any) {
        console.error('Trends API Error:', error.message);
        return NextResponse.json({ error: '트렌드를 가져오는데 실패했습니다.' }, { status: 500 });
    }
}