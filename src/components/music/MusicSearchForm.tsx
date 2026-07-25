'use client';

import { FormEvent, useEffect, useState } from 'react';

interface MusicSearchFormProps {
    keyword: string; setKeyword: (val: string) => void;
    region: string; setRegion: (val: string) => void;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    loading: boolean;
}

export default function MusicSearchForm({ keyword, setKeyword, region, setRegion, onSubmit, loading }: MusicSearchFormProps) {
    const [recommendedWords, setRecommendedWords] = useState<string[]>([]);
    const [displayWords, setDisplayWords] = useState<string[]>([]);
    const [trendLoading, setTrendLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const response = await fetch('/api/trends?categoryId=10');
                const data = await response.json();
                if (data.keywords && data.keywords.length > 0) {
                    setRecommendedWords(data.keywords);
                    setDisplayWords(data.keywords.slice(0, 6));
                }
            } catch (error) {
                console.error('트렌드 키워드 에러', error);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchTrends();
    }, []);

    const handleRefresh = () => {
        if (recommendedWords.length === 0) return;
        setIsRefreshing(true);
        setTimeout(() => {
            const shuffled = [...recommendedWords].sort(() => 0.5 - Math.random());
            setDisplayWords(shuffled.slice(0, 6));
            setIsRefreshing(false);
        }, 300);
    };

    return (
        <div className="mb-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">🎵 1단계: 뮤직비디오 트렌드 검색</h2>

                <div className="flex flex-col md:flex-row gap-3">
                    <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <option value="KR">🇰🇷 한국</option>
                        <option value="US">🇺🇸 미국</option>
                        <option value="JP">🇯🇵 일본</option>
                        <option value="ALL">🌐 글로벌전체</option>
                    </select>
                    <input type="text" placeholder="타겟 키워드 입력 (예: 코딩, 이별, AI)" value={keyword} onChange={(e) => setKeyword(e.target.value)} disabled={loading} className="flex-[2] px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100" />
                    <button type="submit" disabled={loading || !keyword.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors shadow-md whitespace-nowrap">
                        {loading ? '데이터 수집 중...' : '유튜브 트렌드 검색'}
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-slate-500 mr-1">🔥 실시간 추천 키워드:</span>
                    {!trendLoading && (
                        <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors">
                            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                    {displayWords.map((word, idx) => (
                        <button key={idx} type="button" onClick={() => setKeyword(word)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-colors">
                            {word}
                        </button>
                    ))}
                </div>
            </form>
        </div>
    );
}