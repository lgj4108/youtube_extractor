'use client';
import { useState } from 'react';
import { MusicAiPlan } from './MusicAiResult';

interface MusicLyricsPanelProps {
    activePlan: MusicAiPlan;
    showToast: (msg: string) => void;
    onOpenPrompt: (title: string, content: string) => void;
}

export default function MusicLyricsPanel({ activePlan, showToast, onOpenPrompt }: MusicLyricsPanelProps) {
    const history = activePlan?.history || [];
    const [viewIndex, setViewIndex] = useState<number>(Math.max(0, history.length - 1));

    if (activePlan?.isGeneratingLyrics) {
        return (
            <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 animate-pulse">상업용 가사와 씬(Scene) 프롬프트를 창작 중입니다...</p>
            </div>
        );
    }

    if (history.length === 0) return null;

    const safeIndex = Math.min(viewIndex, history.length - 1);
    const currentView = history[safeIndex];

    if (!currentView) return null;

    const downloadPackage = () => {
        const content = [
            `# ${activePlan.title}`,
            '',
            '## Music style',
            activePlan.musicStyle,
            '',
            '## Lyrics',
            currentView.lyrics,
            '',
            '## Scene prompts',
            ...(currentView.scenePrompts || []).map((scene, index) => `${index + 1}. ${scene}`),
        ].join('\n');
        const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${activePlan.title.replace(/[\\/:*?"<>|]/g, '_') || 'music-plan'}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
        showToast('가사와 스타일, 씬 프롬프트를 파일로 저장했습니다.');
    };

    return (
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn flex flex-col h-full">

            {history.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                    <span className="text-xs font-bold text-slate-500 py-1.5 mr-2">🗂️ 버전 기록:</span>
                    {history.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setViewIndex(idx)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${safeIndex === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            버전 {idx + 1} {idx === history.length - 1 && '(최신)'}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-stretch h-full">

                <div className="flex-1 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">🎧 {activePlan.title} <span className="text-sm text-indigo-500 font-normal ml-2">- 버전 {safeIndex + 1}</span></h3>
                        <div className="flex gap-2">
                            {currentView.usedPrompt && (
                                <button onClick={() => onOpenPrompt(`${activePlan.title} (버전 ${safeIndex + 1}) 가사 프롬프트`, currentView.usedPrompt!)} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg font-bold transition-colors">
                                    👀 프롬프트 보기
                                </button>
                            )}
                            <button onClick={() => {navigator.clipboard.writeText(currentView.lyrics); showToast(`버전 ${safeIndex + 1} 가사가 복사되었습니다.`);}} className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold transition-colors">
                                📋 현재 가사 복사
                            </button>
                            <button onClick={downloadPackage} className="rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                ↓ 결과 묶음 저장
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 h-full overflow-y-auto">
                        {currentView.lyrics}
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 h-full">
                    <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎸 Suno Style of Music</h4>
                            <button onClick={() => {navigator.clipboard.writeText(activePlan.musicStyle); showToast('Suno 스타일 프롬프트가 복사되었습니다.');}} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">스타일 복사</button>
                        </div>
                        <div className="p-4 bg-indigo-50/60 dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 flex flex-col gap-3">
                            {activePlan.musicStyleKor && <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">🇰🇷 {activePlan.musicStyleKor}</p>}
                            <div className="text-xs font-mono text-indigo-900 dark:text-indigo-300 select-all cursor-pointer hover:text-indigo-600 transition-colors pt-2 border-t border-indigo-100 dark:border-slate-700" onClick={() => {navigator.clipboard.writeText(activePlan.musicStyle); showToast('Suno 스타일 프롬프트가 복사되었습니다.');}} title="Suno의 Style of Music 입력란에 붙여넣기">
                                {activePlan.musicStyle}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-h-[400px]">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 shrink-0">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎬 뮤비 씬(Scene) 프롬프트</h4>
                            <button onClick={() => {const all = currentView.scenePrompts?.join('\n\n') || ''; navigator.clipboard.writeText(all); showToast(`버전 ${safeIndex + 1} 씬이 일괄 복사되었습니다.`);}} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">일괄 복사</button>
                        </div>
                        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
                            {currentView.scenePrompts?.map((p, idx) => (
                                <div key={idx} onClick={() => {navigator.clipboard.writeText(p); showToast(`Scene ${idx + 1} 프롬프트가 복사되었습니다.`);}} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 break-words select-all hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer" title="클릭 복사">
                                    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px] mb-1">Scene {idx + 1}</span><br/>{p}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
