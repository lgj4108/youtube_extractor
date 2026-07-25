'use client';
import { useState } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import MusicProductionSettings from './MusicProductionSettings';
import MusicPlanCards from './MusicPlanCards';
import MusicLyricsPanel from './MusicLyricsPanel';

// 💡 새롭게 추가된 버전 히스토리 타입
export interface LyricsVersion {
    lyrics: string;
    scenePrompts: string[];
}

export interface MusicAiPlan {
    title: string;
    musicStyle: string;
    musicStyleKor?: string;
    midjourneyPrompt: string;
    lyrics?: string; // (하위 호환용으로 남겨둠)
    scenePrompts?: string[]; // (하위 호환용으로 남겨둠)
    history?: LyricsVersion[]; // 💡 여러 번 생성한 결과를 배열로 저장!
    isGeneratingLyrics?: boolean;
}

interface MusicAiResultProps {
    searchedKeyword: string;
    videos: YouTubeVideo[];
    aiPlans: MusicAiPlan[];
    isGeneratingPlans: boolean;
    inferredTheme: string;
    genre: string; setGenre: (val: string) => void;
    vocalType: string; setVocalType: (val: string) => void;
    mainLang: string; setMainLang: (val: string) => void;
    subLangs: string[]; setSubLangs: (val: string[]) => void;
    onGeneratePlans: () => void;
    onGenerateLyrics: (index: number, title: string, musicStyle: string) => void;
}

export default function MusicAiResult({
                                          searchedKeyword, videos, aiPlans, isGeneratingPlans, inferredTheme,
                                          genre, setGenre, vocalType, setVocalType, mainLang, setMainLang, subLangs, setSubLangs,
                                          onGeneratePlans, onGenerateLyrics
                                      }: MusicAiResultProps) {

    const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);

    if (videos.length === 0) return null;

    const handleGenerateClick = (index: number, title: string, musicStyle: string) => {
        setActiveDetailIndex(index);
        onGenerateLyrics(index, title, musicStyle);
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn relative">

            {/* 검색 피드백 */}
            <div className="bg-slate-200/50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    ✅ <span className="text-indigo-600 dark:text-indigo-400 text-base">'{searchedKeyword}'</span> 관련 유튜브 데이터 {videos.length}개 확보 완료
                </span>
            </div>

            {/* 1. 언어/장르 설정 폼 & 모달 (분리된 컴포넌트) */}
            <MusicProductionSettings
                genre={genre} setGenre={setGenre}
                vocalType={vocalType} setVocalType={setVocalType}
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}
                isGeneratingPlans={isGeneratingPlans}
                onGeneratePlans={onGeneratePlans}
            />

            {/* 기획 테마 표시 */}
            {inferredTheme && (
                <div className="bg-indigo-50 dark:bg-slate-900/60 p-4 rounded-lg border border-indigo-200 dark:border-slate-700 text-sm flex items-center gap-2">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">🎯 AI 곡 기획 테마:</span>
                    <span className="text-slate-700 dark:text-slate-300">{inferredTheme}</span>
                </div>
            )}

            {aiPlans.length > 0 && (
                <>
                    {/* 2. 기획안 3개 카드 (분리된 컴포넌트) */}
                    <MusicPlanCards
                        aiPlans={aiPlans}
                        activeDetailIndex={activeDetailIndex}
                        onGenerateClick={handleGenerateClick}
                    />

                    {/* 3. 하단 가사/씬 디스플레이 패널 (분리된 컴포넌트) */}
                    {activeDetailIndex !== null && (
                        <MusicLyricsPanel activePlan={aiPlans[activeDetailIndex]} />
                    )}
                </>
            )}
        </div>
    );
}