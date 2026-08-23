'use client';
import { useState } from 'react';

interface MusicProductionSettingsProps {
    genre: string[]; setGenre: (val: string[]) => void;
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
    const [selectionMessage, setSelectionMessage] = useState('');

    const handleSubLangChange = (lang: string) => {
        setSubLangs(subLangs.includes(lang) ? subLangs.filter(l => l !== lang) : [...subLangs, lang]);
    };

    const handleGenreToggle = (val: string) => {
        if (genre.includes(val)) {
            if (genre.length > 1) {
                setGenre(genre.filter(g => g !== val));
                setSelectionMessage('');
            } else {
                setSelectionMessage('최소 1개의 장르는 선택해야 합니다.');
            }
        } else {
            if (genre.length >= 3) {
                setSelectionMessage('장르는 최대 3개까지만 믹스할 수 있습니다.');
            } else {
                setGenre([...genre, val]);
                setSelectionMessage('');
            }
        }
    };

    // 장르 옵션 리스트 (트렌디한 장르 추가)
    const genreOptions = [
        { value: 'K-POP', label: '🎵 K-POP' },
        { value: '힙합/랩', label: '🎤 힙합' },
        { value: 'R&B/소울', label: '🎷 R&B' },
        { value: '발라드', label: '🎹 발라드' },
        { value: '밴드/락', label: '🎸 밴드/락' },
        { value: '로파이', label: '☕️ 로파이' }
    ];

    return (
        <>
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

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">🎛️ 프로덕션 세부 설정 <span className="text-xs font-normal text-slate-400">(선택)</span></h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">음악 장르 믹스 <span className="text-[10px] text-indigo-400 font-normal">(최대 3개)</span></label>
                        <div className="flex flex-wrap gap-1.5">
                            {genreOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleGenreToggle(opt.value)}
                                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex-1 min-w-[30%] ${genre.includes(opt.value) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {selectionMessage && <p className="mt-2 text-[11px] font-semibold text-rose-500" role="status">{selectionMessage}</p>}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">보컬 구성 (선택)</label>
                        <select value={vocalType} onChange={(e) => setVocalType(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer h-[42px] mt-0.5">
                            <option value="Auto">🤖 AI 자동 추천</option>
                            <option value="Female Solo">👩 여성 솔로</option>
                            <option value="Male Solo">👨 남성 솔로</option>
                            <option value="Duet">👫 혼성 듀엣</option>
                            <option value="Idol Group">👨‍👩‍👧‍👦 아이돌 / 그룹</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">가사 언어 설정</label>
                        <button onClick={() => setIsLangModalOpen(true)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 h-[42px] mt-0.5">
                            <span className="font-semibold flex items-center">
                                🌐 {mainLang}
                                {subLangs.length > 0 && <span className="text-purple-600 dark:text-purple-400 ml-1.5 text-xs bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded-md">+ {subLangs.join(', ')}</span>}
                            </span>
                            <span className="text-xs text-slate-400">변경 ⚙️</span>
                        </button>
                    </div>
                </div>

                <button onClick={onGeneratePlans} disabled={isGeneratingPlans} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white text-sm rounded-xl font-bold shadow-md disabled:opacity-50 transition-transform active:scale-[0.98]">
                    {isGeneratingPlans ? '✨ AI 곡 기획안 생성 중...' : '✨ 이 설정으로 기획안 3개 다시 만들기'}
                </button>
            </div>
        </>
    );
}
