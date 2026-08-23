'use client';

import { FormEvent, useState } from 'react';
import { useTrendKeywords } from '@/hooks/useTrendKeywords';

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
    const { displayWords, hasKeywords, isLoading: trendLoading, refresh } = useTrendKeywords(categoryId);
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="mb-6">
            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 mb-3">
                <div className="flex flex-col gap-2.5 md:flex-row">
                    <input
                        type="text"
                        aria-label="분석할 키워드"
                        placeholder="분석할 주제 또는 키워드 입력"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        disabled={loading}
                        className="flex-1 px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 disabled:opacity-60"
                    />
                    <button type="submit" disabled={loading || !keyword.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white text-sm font-bold rounded-xl transition-colors shadow-md whitespace-nowrap">
                        {loading ? '자료 수집 중...' : '트렌드 분석'}
                    </button>
                </div>

                <button type="button" onClick={() => setShowFilters((current) => !current)} aria-expanded={showFilters} className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                    {showFilters ? '▾' : '▸'} 검색 범위 설정 · {region} · {duration === 'any' ? '전체 포맷' : duration === 'short' ? '숏츠' : '롱폼'} · {period === 'month' ? '최근 1달' : period === 'week' ? '최근 1주' : period === '3months' ? '최근 3달' : '전체 기간'}
                </button>

                {showFilters && (
                    <div className="grid gap-2.5 animate-fadeIn sm:grid-cols-3">
                        <label className="text-xs font-bold text-slate-500">지역
                            <select aria-label="검색 지역" value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading} className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <option value="KR">🇰🇷 한국</option><option value="US">🇺🇸 미국</option><option value="JP">🇯🇵 일본</option><option value="ALL">🌐 글로벌 전체</option>
                            </select>
                        </label>
                        <label className="text-xs font-bold text-slate-500">영상 포맷
                            <select aria-label="영상 포맷" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={loading} className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <option value="any">포맷 전체</option><option value="short">숏츠형 수집</option><option value="long">롱폼형 수집</option>
                            </select>
                        </label>
                        <label className="text-xs font-bold text-slate-500">게시 기간
                            <select aria-label="게시 기간" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={loading} className="mt-1 w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <option value="week">최근 1주</option><option value="month">최근 1달</option><option value="3months">최근 3달</option><option value="all">전체 기간</option>
                            </select>
                        </label>
                    </div>
                )}
            </form>

            <div className="flex flex-wrap items-center gap-2 px-2 min-h-[32px]">
                <span className="text-sm font-semibold text-slate-500 mr-1">🔥 지금 뜨는 키워드:</span>

                {!trendLoading && hasKeywords && (
                    <button
                        type="button"
                        onClick={refresh}
                        className="p-1 mr-1 text-slate-400 hover:text-indigo-500 transition-colors rounded-full hover:bg-indigo-50"
                        title="다른 키워드 보기"
                        aria-label="추천 키워드 섞기"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}

                {trendLoading ? (
                    <span className="text-xs text-slate-400 animate-pulse">분석 중...</span>
                ) : (
                    displayWords.map((word, index) => (
                        <button key={`${word}-${index}`} type="button" onClick={() => setKeyword(word)} disabled={loading}
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
