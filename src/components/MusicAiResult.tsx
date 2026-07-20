'use client';
import { useState } from 'react';
import { YouTubeVideo } from '@/types/youtube';

export interface MusicAiPlan {
    title: string;
    midjourneyPrompt: string;
    lyrics?: string;
    scenePrompts?: string[];
    isGeneratingLyrics?: boolean;
}

interface MusicAiResultProps {
    searchedKeyword: string;
    videos: YouTubeVideo[];
    aiPlans: MusicAiPlan[];
    isGeneratingPlans: boolean;
    inferredTheme: string;
    genre: string; setGenre: (val: string) => void;
    mainLang: string; setMainLang: (val: string) => void;
    subLangs: string[]; setSubLangs: (val: string[]) => void;
    onGeneratePlans: () => void;
    onGenerateLyrics: (index: number, title: string) => void;
}

export default function MusicAiResult({
                                          searchedKeyword, videos, aiPlans, isGeneratingPlans, inferredTheme,
                                          genre, setGenre, mainLang, setMainLang, subLangs, setSubLangs,
                                          onGeneratePlans, onGenerateLyrics
                                      }: MusicAiResultProps) {

    // 💡 선택된 가사를 하단 넓은 패널에 보여주기 위한 상태
    const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);

    if (videos.length === 0) return null;

    const handleSubLangChange = (lang: string) => {
        setSubLangs(subLangs.includes(lang) ? subLangs.filter(l => l !== lang) : [...subLangs, lang]);
    };

    const handleGenerateClick = (index: number, title: string) => {
        setActiveDetailIndex(index);
        onGenerateLyrics(index, title);
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">

            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-200/50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    ✅ <span className="text-indigo-600 dark:text-indigo-400 text-base">'{searchedKeyword}'</span> 관련 유튜브 데이터 {videos.length}개 확보 완료
                </span>
                <button onClick={onGeneratePlans} disabled={isGeneratingPlans} className="mt-3 sm:mt-0 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white text-sm rounded-lg font-bold shadow-md disabled:opacity-50 transition-all">
                    {isGeneratingPlans ? '✨ AI 곡 기획안 추출 중...' : '✨ 2단계: AI 곡 기획안 3개 추출'}
                </button>
            </div>

            {inferredTheme && (
                <div className="bg-indigo-50 dark:bg-slate-900/60 p-4 rounded-lg border border-indigo-200 dark:border-slate-700 text-sm flex items-center gap-2">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">🎯 AI 곡 기획 테마:</span>
                    <span className="text-slate-700 dark:text-slate-300">{inferredTheme}</span>
                </div>
            )}

            {aiPlans.length > 0 && (
                <>
                    {/* 가사 설정 폼 */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">🎶 3단계: 가사 프로덕션 세부 설정</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 block mb-1.5">음악 장르</label>
                                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-none text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200">
                                    <option value="pop">🎵 K-POP / 댄스</option>
                                    <option value="hiphop">🎤 힙합 / 랩</option>
                                    <option value="ballad">🎹 발라드 / 감성</option>
                                    <option value="lofi">☕️ 로파이 / Chill</option>
                                </select>
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-xs font-bold text-slate-500 block mb-1.5">메인 언어</label>
                                <div className="flex gap-2">
                                    {['KR', 'EN', 'JP'].map(lang => (
                                        <button key={lang} type="button" onClick={() => { setMainLang(lang); setSubLangs([]); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${mainLang === lang ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>{lang}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-[1.5]">
                                <label className="text-xs font-bold text-slate-500 block mb-1.5">보조 언어 믹스</label>
                                <div className="flex gap-2">
                                    {['EN', 'JP', 'KR'].filter(l => l !== mainLang).map(lang => (
                                        <button key={lang} type="button" onClick={() => handleSubLangChange(lang)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${subLangs.includes(lang) ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>+ {lang}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 기획안 3개 렌더링 (카드는 깔끔하게 유지) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aiPlans.map((plan, index) => (
                            <div key={index} className={`bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border flex flex-col h-full transition-all ${activeDetailIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-slate-200 dark:border-slate-700'}`}>
                                <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-md mb-3 w-max">트랙 {index + 1}</span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 leading-tight">{plan.title}</h3>

                                <div className="mb-4 flex-1">
                                    <p className="text-[10px] font-bold text-slate-500 mb-1">앨범 커버 / 썸네일 컨셉</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 font-mono break-words">{plan.midjourneyPrompt}</p>
                                </div>

                                <button onClick={() => handleGenerateClick(index, plan.title)} disabled={plan.isGeneratingLyrics} className="w-full py-2.5 mt-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                                    {plan.isGeneratingLyrics ? '🎶 프로덕션 가동 중...' : (plan.lyrics ? '👀 결과물 확인하기' : '🎶 이 컨셉으로 곡 쓰기')}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 💡 하단 와이드 디스플레이 패널 (선택된 곡만 큼지막하게 보여줌) */}
                    {activeDetailIndex !== null && (
                        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn relative">
                            {aiPlans[activeDetailIndex].isGeneratingLyrics ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 animate-pulse">3분 분량의 상업용 가사와 씬(Scene) 프롬프트를 창작 중입니다...</p>
                                </div>
                            ) : (
                                aiPlans[activeDetailIndex].lyrics && (
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* 좌측: 가사 영역 */}
                                        <div className="flex-[3]">
                                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">🎧 {aiPlans[activeDetailIndex].title}</h3>
                                                <button onClick={() => {navigator.clipboard.writeText(aiPlans[activeDetailIndex].lyrics!); alert('가사가 복사되었습니다.');}} className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold transition-colors">
                                                    📋 가사 전체 복사
                                                </button>
                                            </div>
                                            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
                                                {aiPlans[activeDetailIndex].lyrics}
                                            </div>
                                        </div>

                                        {/* 우측: 씬별 프롬프트 영역 */}
                                        <div className="flex-[2] flex flex-col gap-3">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
                                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎬 뮤비 씬(Scene) 프롬프트</h4>

                                                <button
                                                    onClick={() => {
                                                        const allPrompts = aiPlans[activeDetailIndex].scenePrompts?.join('\n\n') || '';
                                                        navigator.clipboard.writeText(allPrompts);
                                                        alert('전체 씬 프롬프트가 복사되었습니다.');
                                                    }}
                                                    className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors"
                                                >
                                                    일괄 복사
                                                </button>
                                            </div>

                                            {aiPlans[activeDetailIndex].scenePrompts?.map((p, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(p);
                                                        alert(`Scene ${idx + 1} 프롬프트가 복사되었습니다.`);
                                                    }}
                                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 break-words select-all hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer"
                                                    title="클릭하여 복사"
                                                >
                                                    {/* 💡 개별 복사 onClick 이벤트용 주석을 안전하게 div 안으로 이동했습니다 */}
                                                    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px] mb-2">Scene {idx + 1}</span><br/>
                                                    {p}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}