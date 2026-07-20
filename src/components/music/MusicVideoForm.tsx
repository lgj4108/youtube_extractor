'use client';

import { useState, useEffect } from 'react';

interface MusicVideoFormProps {
    keyword: string;
    setKeyword: (val: string) => void;
    genre: string;
    setGenre: (val: string) => void;
    mainLang: string;
    setMainLang: (val: string) => void;
    subLangs: string[];
    setSubLangs: (val: string[]) => void;
    loading: boolean;
    onGenerate: () => void;
}

export default function MusicVideoForm({
                                           keyword, setKeyword, genre, setGenre,
                                           mainLang, setMainLang, subLangs, setSubLangs,
                                           loading, onGenerate
                                       }: MusicVideoFormProps) {

    // 트렌드 키워드 전용 로컬 상태
    const [recommendedWords, setRecommendedWords] = useState<string[]>([]);
    const [displayWords, setDisplayWords] = useState<string[]>([]);
    const [trendLoading, setTrendLoading] = useState<boolean>(true);
    const [isRefreshingKeywords, setIsRefreshingKeywords] = useState<boolean>(false);

    // 컴포넌트 로드 시 음악 트렌드(categoryId: 10) 가져오기
    useEffect(() => {
        const fetchMusicTrends = async () => {
            try {
                const response = await fetch('/api/trends?categoryId=10');
                const data = await response.json();
                if (data.keywords && data.keywords.length > 0) {
                    setRecommendedWords(data.keywords);
                    setDisplayWords(data.keywords.slice(0, 6));
                }
            } catch (error) {
                console.error('음악 트렌드 키워드 에러', error);
            } finally {
                setTrendLoading(false);
            }
        };
        fetchMusicTrends();
    }, []);

    const handleRefreshKeywords = () => {
        if (recommendedWords.length === 0) return;
        setIsRefreshingKeywords(true);
        setTimeout(() => {
            const shuffled = [...recommendedWords].sort(() => 0.5 - Math.random());
            setDisplayWords(shuffled.slice(0, 6));
            setIsRefreshingKeywords(false);
        }, 300);
    };

    const handleSubLangChange = (lang: string) => {
        setSubLangs(subLangs.includes(lang) ? subLangs.filter(l => l !== lang) : [...subLangs, lang]);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 lg:sticky lg:top-4 transition-colors">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">🎵 뮤직비디오 프로덕션 폼</h2>

            <div className="flex flex-col gap-4">
                {/* 1. 타겟 주제 */}
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">타겟 핵심 주제 / 키워드</label>
                    <input type="text" placeholder="예: 밤새 코딩, 이별, 가상 세계" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* 2. 트렌드 칩 영역 */}
                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">🔥 지금 뜨는 음악 키워드:</span>
                        {!trendLoading && recommendedWords.length > 0 && (
                            <button type="button" onClick={handleRefreshKeywords} disabled={isRefreshingKeywords} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors rounded-full">
                                <svg className={`w-3.5 h-3.5 ${isRefreshingKeywords ? 'animate-spin text-indigo-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                        {trendLoading ? (
                            <span className="text-[11px] text-slate-400 animate-pulse">차트 분석 중...</span>
                        ) : (
                            displayWords.map((word, idx) => (
                                <button key={`${word}-${idx}`} type="button" onClick={() => setKeyword(word)} className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-md transition-colors border border-slate-200 dark:border-slate-700">
                                    {word}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* 3. 장르 선택 */}
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">음악 장르</label>
                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500">
                        <option value="pop">🎵 K-POP / 댄스</option>
                        <option value="hiphop">🎤 힙합 / 랩</option>
                        <option value="ballad">🎹 발라드 / 감성</option>
                        <option value="lofi">☕️ 로파이 / Chill</option>
                    </select>
                </div>

                {/* 4. 메인 언어 */}
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">가사 메인 언어</label>
                    <div className="flex gap-2">
                        {['KR', 'EN', 'JP'].map(lang => (
                            <button key={lang} onClick={() => mainLang !== lang && (setMainLang(lang), setSubLangs([]))} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${mainLang === lang ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>{lang === 'KR' ? '🇰🇷 KR' : lang === 'EN' ? '🇺🇸 EN' : '🇯🇵 JP'}</button>
                        ))}
                    </div>
                </div>

                {/* 5. 보조 언어 */}
                <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">글로벌 믹스 언어 (다중 선택)</label>
                    <div className="flex gap-2">
                        {['EN', 'JP', 'KR'].filter(l => l !== mainLang).map(lang => (
                            <button key={lang} onClick={() => handleSubLangChange(lang)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${subLangs.includes(lang) ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>{lang === 'EN' ? '🇺🇸 믹스 EN' : lang === 'JP' ? '🇯🇵 믹스 JP' : '🇰🇷 믹스 KR'}</button>
                        ))}
                    </div>
                </div>

                {/* 생성 버튼 */}
                <button onClick={onGenerate} disabled={loading || !keyword.trim()} className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm">
                    {loading ? '✨ 맞춤형 다중 가사 빌드 중...' : '🎶 가사 및 연출 대안 생성'}
                </button>
            </div>
        </div>
    );
}