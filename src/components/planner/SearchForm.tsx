'use client';

import { FormEvent, useEffect, useState } from 'react';

// 💡 categoryId 프롭스(선택 사항) 추가
interface SearchFormProps {
    keyword: string;
    setKeyword: (val: string) => void;
    period: string;
    setPeriod: (val: string) => void;
    duration: string;
    setDuration: (val: string) => void;
    region: string;
    setRegion: (val: string) => void;
    categoryId?: string;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    loading: boolean;
}

export default function SearchForm({ keyword, setKeyword, period, setPeriod, duration, setDuration, region, setRegion, categoryId, onSubmit, loading }: SearchFormProps) {
    const [recommendedWords, setRecommendedWords] = useState<string[]>([]);
    const [trendLoading, setTrendLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                // 💡 categoryId가 있으면 주소 뒤에 쿼리 스트링으로 붙여서 API 호출
                const url = categoryId ? `/api/trends?categoryId=${categoryId}` : '/api/trends';
                const response = await fetch(url);
                const data = await response.json();
                if (data.keywords && data.keywords.length > 0) setRecommendedWords(data.keywords);
            } catch (error) {
                console.error('트렌드 키워드 에러', error);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchTrends();
    }, [categoryId]); // 💡 카테고리가 바뀔 때마다 트렌드를 다시 불러옴

    return (
        <div className="mb-6">
            <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-2.5 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-3 transition-colors">

                <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={loading}
                    className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-60"
                >
                    <option value="KR">🇰🇷 한국</option>
                    <option value="US">🇺🇸 미국</option>
                    <option value="JP">🇯🇵 일본</option>
                    <option value="ALL">🌐 글로벌전체</option>
                </select>

                <input
                    type="text"
                    placeholder="타겟 키워드 입력"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={loading}
                    className="flex-[2] px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 disabled:opacity-60"
                />

                <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-60"
                >
                    <option value="any">포맷 전체</option>
                    <option value="short">숏츠형 수집</option>
                    <option value="long">롱폼형 수집</option>
                </select>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-60"
                >
                    <option value="week">최근 1주</option>
                    <option value="month">최근 1달</option>
                    <option value="3months">최근 3달</option>
                    <option value="all">전체 기간</option>
                </select>

                <button
                    type="submit"
                    disabled={loading || !keyword.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white text-sm font-bold rounded-xl transition-colors shadow-md whitespace-nowrap"
                >
                    {loading ? '분석 중...' : '트렌드 분석'}
                </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 px-2 min-h-[32px]">
                <span className="text-sm font-semibold text-slate-500 mr-1">🔥 지금 뜨는 키워드:</span>
                {trendLoading ? (
                    <span className="text-xs text-slate-400 animate-pulse">분석 중...</span>
                ) : (
                    recommendedWords.map((word) => (
                        <button key={word} type="button" onClick={() => setKeyword(word)} disabled={loading}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                        >
                            {word}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}