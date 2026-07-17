export interface YouTubeVideo {
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnailUrl: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
    tags: string[];
    topComments: string[];
    engagementRate: number; // 추가: 참여도 비율
    isHot: boolean;         // 추가: 떡상 영상 뱃지 여부
}