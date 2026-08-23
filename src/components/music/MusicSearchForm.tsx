'use client';

import { FormEvent, useState } from 'react';
import { useTrendKeywords } from '@/hooks/useTrendKeywords';

interface MusicSearchFormProps {
    keyword: string; setKeyword: (val: string) => void;
    region: string; setRegion: (val: string) => void;
    onDirectGenerate: (e: FormEvent<HTMLFormElement>) => void;
    onTrendSearch: () => void;
    loading: boolean;
    isGeneratingPlans: boolean;
}

export default function MusicSearchForm({ keyword, setKeyword, region, setRegion, onDirectGenerate, onTrendSearch, loading, isGeneratingPlans }: MusicSearchFormProps) {
    const { displayWords, hasKeywords, isLoading: trendLoading, refresh } = useTrendKeywords('10');
    const [showTrendOptions, setShowTrendOptions] = useState(false);
    const isBusy = loading || isGeneratingPlans;

    return (
        <div className="mb-6">
            <form onSubmit={onDirectGenerate} className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">🎵 만들고 싶은 음악을 적어주세요</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">트렌드 검색 없이 분위기, 소재, 장면을 키워드로 입력하면 바로 곡 기획안을 만듭니다.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <input type="text" aria-label="음악 키워드" placeholder="예: 비 오는 새벽 드라이브, 몽환적인 이별, 신나는 여름 바다" value={keyword} onChange={(e) => setKeyword(e.target.value)} disabled={isBusy} className="flex-1 px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100" />
                    <button type="submit" disabled={isBusy || !keyword.trim()} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md whitespace-nowrap">
                        {isGeneratingPlans ? '✨ 기획안 만드는 중...' : '✨ 키워드로 바로 기획'}
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500 mr-1">💡 추천 키워드:</span>
                    {!trendLoading && hasKeywords && (
                        <button type="button" onClick={refresh} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" aria-label="추천 키워드 섞기">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    )}
                    {trendLoading
                        ? <span className="text-xs text-slate-400 animate-pulse">분석 중...</span>
                        : displayWords.map((word) => (
                            <button key={word} type="button" onClick={() => setKeyword(word)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-colors">
                                {word}
                            </button>
                        ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                    <button type="button" onClick={() => setShowTrendOptions((current) => !current)} aria-expanded={showTrendOptions} className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {showTrendOptions ? '▾' : '▸'} 유튜브 음악 트렌드도 참고하기 (선택)
                    </button>
                    {showTrendOptions && (
                        <div className="flex flex-col md:flex-row gap-3 mt-3 animate-fadeIn">
                            <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={isBusy} aria-label="트렌드 검색 지역" className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <option value="KR">🇰🇷 한국</option>
                                <option value="US">🇺🇸 미국</option>
                                <option value="JP">🇯🇵 일본</option>
                                <option value="ALL">🌐 글로벌 전체</option>
                            </select>
                            <button type="button" onClick={onTrendSearch} disabled={isBusy || !keyword.trim()} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white disabled:opacity-50 text-white dark:text-slate-900 text-sm font-bold rounded-xl transition-colors whitespace-nowrap">
                                {loading ? '트렌드 수집 중...' : '트렌드 검색'}
                            </button>
                            <p className="self-center text-xs text-slate-400">검색 후 아래 설정에서 AI 기획안을 만들 수 있습니다.</p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
