'use client';
import { MusicAiPlan } from './MusicAiResult';

interface MusicLyricsPanelProps {
    activePlan: MusicAiPlan;
}

export default function MusicLyricsPanel({ activePlan }: MusicLyricsPanelProps) {
    if (activePlan.isGeneratingLyrics) {
        return (
            <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 animate-pulse">상업용 가사와 씬(Scene) 프롬프트를 창작 중입니다...</p>
            </div>
        );
    }

    if (!activePlan.lyrics) return null;

    return (
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn">
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-[3]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">🎧 {activePlan.title}</h3>
                        <button onClick={() => {navigator.clipboard.writeText(activePlan.lyrics!); alert('가사가 복사되었습니다.');}} className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold transition-colors">
                            📋 가사 전체 복사
                        </button>
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700">
                        {activePlan.lyrics}
                    </div>
                </div>

                <div className="flex-[2] flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎸 AI 음악 스타일 (Suno/Udio)</h4>
                            <button onClick={() => {navigator.clipboard.writeText(activePlan.musicStyle); alert('영문 태그가 복사되었습니다.');}} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">영문 복사</button>
                        </div>
                        <div className="p-4 bg-indigo-50/60 dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 flex flex-col gap-3">
                            {activePlan.musicStyleKor && <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">🇰🇷 {activePlan.musicStyleKor}</p>}
                            <div className="text-xs font-mono text-indigo-900 dark:text-indigo-300 select-all cursor-pointer hover:text-indigo-600 transition-colors pt-2 border-t border-indigo-100 dark:border-slate-700" onClick={() => {navigator.clipboard.writeText(activePlan.musicStyle); alert('영문 복사 완료');}} title="클릭하여 복사">
                                {activePlan.musicStyle}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎬 뮤비 씬(Scene) 프롬프트</h4>
                            <button onClick={() => {const all = activePlan.scenePrompts?.join('\n\n') || ''; navigator.clipboard.writeText(all); alert('전체 씬이 복사되었습니다.');}} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">일괄 복사</button>
                        </div>
                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                            {activePlan.scenePrompts?.map((p, idx) => (
                                <div key={idx} onClick={() => {navigator.clipboard.writeText(p); alert(`Scene ${idx + 1} 복사됨`);}} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 break-words select-all hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors cursor-pointer" title="클릭 복사">
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