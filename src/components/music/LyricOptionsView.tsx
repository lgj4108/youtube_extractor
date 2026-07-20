'use client';

// 가사 옵션 인터페이스 (부모 컴포넌트와 공유)
export interface LyricOption {
    version: string;
    style: string;
    title: string;
    lyrics: string;
    midjourneyPrompts: string[];
}

interface LyricOptionsViewProps {
    loading: boolean;
    lyricOptions: LyricOption[];
    activeOptionIndex: number;
    setActiveOptionIndex: (index: number) => void;
}

export default function LyricOptionsView({ loading, lyricOptions, activeOptionIndex, setActiveOptionIndex }: LyricOptionsViewProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 animate-pulse">각기 다른 감성의 가사 버전들을 추출하고 있습니다...</p>
            </div>
        );
    }

    if (lyricOptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <p className="text-3xl mb-2">🎵</p>
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">좌측 프로덕션 폼을 입력하고<br/>비교 가능한 다중 AI 기획안을 받아보세요.</p>
            </div>
        );
    }

    const activeOption = lyricOptions[activeOptionIndex];

    return (
        <div className="flex flex-col gap-4">
            {/* 결과 대안 탭 스위칭 */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full gap-2">
                {lyricOptions.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveOptionIndex(idx)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeOptionIndex === idx ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        ✨ {option.version} ({option.title})
                    </button>
                ))}
            </div>

            {/* 활성화된 가사 디테일 카드 */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors animate-fadeIn">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                    <div>
                        <span className="inline-block px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[11px] font-bold rounded-md mb-1.5">{activeOption.style}</span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">🎧 곡 제목: {activeOption.title}</h3>
                    </div>
                    <button
                        onClick={() => { navigator.clipboard.writeText(activeOption.lyrics); alert('해당 버전의 가사가 복사되었습니다.'); }}
                        className="text-xs px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                    >
                        📋 가사 일괄 복사
                    </button>
                </div>

                {/* 가사 본문 */}
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl font-sans text-sm text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap max-h-[450px] overflow-y-auto border border-slate-100 dark:border-slate-800">
                    {activeOption.lyrics}
                </div>

                {/* 미드저니 프롬프트 카드 */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">🎬 이 버전에 추천하는 AI 이미지 프롬프트</h4>
                    <div className="flex flex-col gap-2">
                        {activeOption.midjourneyPrompts.map((p, i) => (
                            <div key={i} className="bg-indigo-50/40 dark:bg-slate-900 p-3 rounded-lg text-xs font-mono border border-indigo-50/60 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 break-words select-all cursor-pointer" title="클릭하여 복사">
                                {p}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}