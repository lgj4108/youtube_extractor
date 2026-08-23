'use client';
import { useState } from 'react';
import { copyText } from '@/lib/http';
import MusicProductionSettings from './MusicProductionSettings';
import MusicPlanCards from './MusicPlanCards';
import MusicLyricsPanel from './MusicLyricsPanel';

export interface LyricsVersion {
    lyrics: string;
    scenePrompts: string[];
    usedPrompt?: string;
}

export interface MusicAiPlan {
    title: string;
    musicStyle: string;
    musicStyleKor?: string;
    midjourneyPrompt: string;
    lyrics?: string;
    scenePrompts?: string[];
    history?: LyricsVersion[];
    isGeneratingLyrics?: boolean;
}

interface MusicAiResultProps {
    aiPlans: MusicAiPlan[];
    isGeneratingPlans: boolean;
    inferredTheme: string;
    planPrompt: string;
    genre: string[]; setGenre: (val: string[]) => void;
    vocalType: string; setVocalType: (val: string) => void;
    mainLang: string; setMainLang: (val: string) => void;
    subLangs: string[]; setSubLangs: (val: string[]) => void;
    onGeneratePlans: () => void;
    onGenerateLyrics: (index: number, title: string, musicStyle: string) => void;
}

export default function MusicAiResult({
                                          aiPlans, isGeneratingPlans, inferredTheme, planPrompt,
                                          genre, setGenre, vocalType, setVocalType, mainLang, setMainLang, subLangs, setSubLangs,
                                          onGeneratePlans, onGenerateLyrics
                                      }: MusicAiResultProps) {

    const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [promptModal, setPromptModal] = useState<{isOpen: boolean, title: string, content: string}>({ isOpen: false, title: '', content: '' });

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 2500);
    };

    const openPromptViewer = (title: string, content: string) => {
        setPromptModal({ isOpen: true, title, content });
    };

    const handleGenerateClick = (index: number, title: string, musicStyle: string) => {
        setActiveDetailIndex(index);
        onGenerateLyrics(index, title, musicStyle);
    };

    const activePlan = activeDetailIndex === null ? undefined : aiPlans[activeDetailIndex];

    return (
        <div className="flex flex-col gap-6 animate-fadeIn relative">

            {promptModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                🤖 {promptModal.title}
                            </h3>
                            <button onClick={() => setPromptModal({ ...promptModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">✕</button>
                        </div>
                        <div className="p-5 overflow-y-auto font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950/50 flex-1">
                            {promptModal.content}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                            <button onClick={() => { void copyText(promptModal.content).then(() => showToast('프롬프트가 복사되었습니다.')).catch(() => showToast('프롬프트를 복사하지 못했습니다.')); }} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                프롬프트 복사
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMsg && (
                <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] animate-fadeIn">
                    <div className="bg-slate-800 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2">
                        ✅ {toastMsg}
                    </div>
                </div>
            )}

            {/* 1. 설정 폼 */}
            <MusicProductionSettings
                genre={genre} setGenre={setGenre}
                vocalType={vocalType} setVocalType={setVocalType}
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}
                isGeneratingPlans={isGeneratingPlans}
                onGeneratePlans={onGeneratePlans}
            />

            {inferredTheme && (
                <div className="flex justify-between items-center bg-indigo-50 dark:bg-slate-900/60 p-4 rounded-lg border border-indigo-200 dark:border-slate-700 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">🎯 AI 곡 기획 테마:</span>
                        <span className="text-slate-700 dark:text-slate-300">{inferredTheme}</span>
                    </div>
                    {planPrompt && (
                        <button onClick={() => openPromptViewer('곡 기획안(스타일) 생성 프롬프트', planPrompt)} className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 px-3 py-1.5 rounded-lg font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors shadow-sm shrink-0">
                            👀 프롬프트 보기
                        </button>
                    )}
                </div>
            )}

            {/* 2. 기획 카드 */}
            {aiPlans.length > 0 && (
                <MusicPlanCards
                    aiPlans={aiPlans}
                    activeDetailIndex={activeDetailIndex}
                    onSelect={setActiveDetailIndex}
                    onGenerateClick={handleGenerateClick}
                    showToast={showToast}
                />
            )}

            {/* 3. 하단 가사 패널 */}
            {activePlan && activeDetailIndex !== null && (
                <MusicLyricsPanel
                    key={`${activeDetailIndex}-${activePlan.history?.length ?? 0}`}
                    activePlan={activePlan}
                    showToast={showToast}
                    onOpenPrompt={openPromptViewer}
                />
            )}
        </div>
    );
}
