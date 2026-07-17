'use client';

import { YouTubeVideo } from '@/types/youtube';

interface VideoCardProps {
    video: YouTubeVideo;
    index?: number;
    isSaved: boolean;
    onToggleSave: (video: YouTubeVideo) => void;
}

export default function VideoCard({ video, index, isSaved, onToggleSave }: VideoCardProps) {
    const formatNumber = (numStr: string) => Intl.NumberFormat('ko-KR').format(Number(numStr));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all flex flex-col sm:flex-row relative">

            {/* 스크랩(북마크) 버튼 */}
            <button
                onClick={() => onToggleSave(video)}
                className="absolute top-3 right-3 z-20 text-xl drop-shadow-md hover:scale-110 transition-transform"
                title={isSaved ? "스크랩 취소" : "기획 레퍼런스 스크랩"}
            >
                {isSaved ? '⭐️' : '☆'}
            </button>

            <div className="relative sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-slate-100 dark:bg-slate-900">
                {index !== undefined && (
                    <div className="absolute top-2 left-2 w-7 h-7 bg-slate-800/80 text-white text-xs rounded-md flex items-center justify-center font-bold shadow-md z-10">
                        {index + 1}
                    </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={video.thumbnailUrl || '/api/placeholder/320/180'} alt={video.title} className="w-full h-full object-cover" />
            </div>

            <div className="p-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start gap-3 mb-1 pr-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {video.isHot && <span className="inline-block mr-1.5 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded border border-red-200 align-text-bottom">🚀 알고리즘 픽</span>}
                        {video.title}
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">📺 {video.channelTitle}</span>
                    <span>👁️ {formatNumber(video.viewCount)}</span>
                    <span className="text-indigo-500 font-semibold">🔥 반응률 {video.engagementRate.toFixed(1)}%</span>
                </div>

                {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {video.tags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-medium rounded-md">
                #{tag}
              </span>
                        ))}
                    </div>
                )}

                <details className="group mt-1">
                    <summary className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 cursor-pointer list-none flex items-center gap-1 select-none">
                        💬 시청자 반응 보기 <span className="group-open:rotate-180 transition-transform duration-200">▼</span>
                    </summary>
                    <ul className="mt-2 space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        {video.topComments.map((comment, i) => (
                            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2" dangerouslySetInnerHTML={{ __html: `"${comment}"` }} />
                        ))}
                    </ul>
                </details>

                <div className="mt-2 flex justify-end">
                    <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-bold transition-colors">
                        유튜브로 보기 ↗
                    </a>
                </div>
            </div>
        </div>
    );
}