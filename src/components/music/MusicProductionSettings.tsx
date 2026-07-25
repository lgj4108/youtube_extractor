'use client';
import { useState } from 'react';

interface MusicProductionSettingsProps {
    genre: string; setGenre: (val: string) => void;
    vocalType: string; setVocalType: (val: string) => void;
    mainLang: string; setMainLang: (val: string) => void;
    subLangs: string[]; setSubLangs: (val: string[]) => void;
    isGeneratingPlans: boolean;
    onGeneratePlans: () => void;
}

export default function MusicProductionSettings({
                                                    genre, setGenre, vocalType, setVocalType, mainLang, setMainLang, subLangs, setSubLangs, isGeneratingPlans, onGeneratePlans
                                                }: MusicProductionSettingsProps) {

    const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);

    const handleSubLangChange = (lang: string) => {
        setSubLangs(subLangs.includes(lang) ? subLangs.filter(l => l !== lang) : [...subLangs, lang]);
    };

    return (
        <>
            {/* 언어 설정 모달 */}
            {isLangModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">🌐 가사 언어 상세 설정</h3>
                            <button onClick={() => setIsLangModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">✕</button>
                        </div>

                        <div className="mb-5">
                            <label className="text-xs font-bold text-slate-500 block mb-2">메인 언어 (1개 선택)</label>
                            <div className="flex gap-2">
                                {['KR', 'EN', 'JP'].map(lang => (
                                    <button key={lang} type="button" onClick={() => { setMainLang(lang); setSubLangs([]); }} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${mainLang === lang ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{lang}</button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 block mb-2">보조 언어 믹스 (다중 선택)</label>
                            <div className="flex gap-2">
                                {['EN', 'JP', 'KR'].filter(l => l !== mainLang).map(lang => (
                                    <button key={lang} type="button" onClick={() => handleSubLangChange(lang)} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${subLangs.includes(lang) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>+ {lang}</button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setIsLangModalOpen(false)} className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold rounded-xl transition-transform active:scale-95">
                            설정 완료
                        </button>
                    </div>
                </div>
            )}

            {/* 설정 폼 */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">🎶 2단계: 프로덕션 세부 설정</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">음악 장르</label>
                        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                            <option value="pop">🎵 K-POP / 댄스</option>
                            <option value="hiphop">🎤 힙합 / 랩</option>
                            <option value="ballad">🎹 발라드 / 감성</option>
                            <option value="lofi">☕️ 로파이 / Chill</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">보컬 구성 (선택)</label>
                        <select value={vocalType} onChange={(e) => setVocalType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                            <option value="Auto">🤖 AI 자동 추천</option>
                            <option value="Female Solo">👩 여성 솔로</option>
                            <option value="Male Solo">👨 남성 솔로</option>
                            <option value="Duet">👫 혼성 듀엣</option>
                            <option value="Idol Group">👨‍👩‍👧‍👦 아이돌 / 그룹</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">가사 언어 설정</label>
                        <button onClick={() => setIsLangModalOpen(true)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="font-semibold flex items-center">
                                🌐 {mainLang}
                                {subLangs.length > 0 && <span className="text-purple-600 dark:text-purple-400 ml-1.5 text-xs bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded-md">+ {subLangs.join(', ')}</span>}
                            </span>
                            <span className="text-xs text-slate-400">변경 ⚙️</span>
                        </button>
                    </div>
                </div>

                <button onClick={onGeneratePlans} disabled={isGeneratingPlans} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white text-sm rounded-xl font-bold shadow-md disabled:opacity-50 transition-transform active:scale-[0.98]">
                    {isGeneratingPlans ? '✨ AI 곡 기획안 추출 중...' : '✨ 3단계: 이 설정으로 AI 기획안 3개 추출'}
                </button>
            </div>
        </>
    );
}