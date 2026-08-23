'use client';
import { useState } from 'react';
import { copyText } from '@/lib/http';
import { MusicAiPlan } from './MusicAiResult';

interface MusicPlanCardsProps {
    aiPlans: MusicAiPlan[];
    activeDetailIndex: number | null;
    onSelect: (index: number) => void;
    onGenerateClick: (index: number, title: string, musicStyle: string) => void;
    showToast: (msg: string) => void;
}

export default function MusicPlanCards({ aiPlans, activeDetailIndex, onSelect, onGenerateClick, showToast }: MusicPlanCardsProps) {
    const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);

    const copyWithToast = async (text: string, successMessage: string) => {
        try {
            await copyText(text);
            showToast(successMessage);
        } catch {
            showToast('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해주세요.');
        }
    };

    const handleCopyTitle = async (e: React.MouseEvent, title: string, index: number) => {
        e.stopPropagation();
        try {
            await copyText(title);
            showToast(`트랙 ${index + 1}의 제목이 복사되었습니다.`);
            setCopiedTitleIndex(index);
            setTimeout(() => setCopiedTitleIndex(null), 2000);
        } catch {
            showToast('제목을 복사하지 못했습니다. 브라우저 권한을 확인해주세요.');
        }
    };

    const handleCopyPlan = async (e: React.MouseEvent, plan: MusicAiPlan, index: number) => {
        e.stopPropagation();
        const packageText = [
            `제목: ${plan.title}`,
            '',
            'Suno Style of Music:',
            plan.musicStyle,
            ...(plan.musicStyleKor ? ['', '스타일 설명:', plan.musicStyleKor] : []),
            '',
            '앨범 커버 / 썸네일 프롬프트:',
            plan.midjourneyPrompt,
        ].join('\n');

        try {
            await copyText(packageText);
            showToast(`트랙 ${index + 1}의 제목과 프롬프트를 한 번에 복사했습니다.`);
        } catch {
            showToast('기획안을 복사하지 못했습니다. 브라우저 권한을 확인해주세요.');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiPlans.map((plan, index) => (
                <div key={index} className={`bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border flex flex-col h-full transition-all ${activeDetailIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-md w-max">트랙 {index + 1}</span>
                        <button
                            onClick={(e) => void handleCopyPlan(e, plan, index)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="제목, Suno 스타일, 커버 프롬프트를 한 번에 복사"
                        >
                            📦 기획 전체 복사
                        </button>
                    </div>

                    <div className="flex justify-between items-start mb-4 gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight break-words flex-1">
                            <button
                                onClick={(e) => void handleCopyTitle(e, plan.title, index)}
                                className="rounded text-left transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300"
                                title="노래 제목을 클릭하여 복사"
                            >
                                {plan.title}
                            </button>
                        </h3>
                        <button
                            onClick={(e) => void handleCopyTitle(e, plan.title, index)}
                            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${copiedTitleIndex === index ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900'}`}
                            title="제목 복사하기"
                        >
                            {copiedTitleIndex === index ? (
                                '✓ 복사됨'
                            ) : (
                                '📋 제목 복사'
                            )}
                        </button>
                    </div>

                    <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-indigo-500">🎸 Suno Style of Music</p>
                            <button onClick={(e) => { e.stopPropagation(); void copyWithToast(plan.musicStyle, `트랙 ${index + 1}의 Suno 스타일 프롬프트가 복사되었습니다.`); }} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded transition-colors font-bold">
                                스타일 복사
                            </button>
                        </div>
                        {plan.musicStyleKor && <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">🇰🇷 {plan.musicStyleKor}</p>}
                        <p onClick={() => { void copyWithToast(plan.musicStyle, `트랙 ${index + 1}의 Suno 스타일 프롬프트가 복사되었습니다.`); }} className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-words cursor-pointer hover:text-indigo-500 transition-colors" title="Suno의 Style of Music 입력란에 붙여넣기">
                            {plan.musicStyle}
                        </p>
                    </div>

                    <div className="mb-4 flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-slate-500">🖼️ 앨범 커버 / 썸네일</p>
                            <button onClick={(e) => { e.stopPropagation(); void copyWithToast(plan.midjourneyPrompt, `트랙 ${index + 1}의 커버 프롬프트가 복사되었습니다.`); }} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 transition-colors font-bold">
                                복사
                            </button>
                        </div>
                        <p onClick={() => { void copyWithToast(plan.midjourneyPrompt, `트랙 ${index + 1}의 커버 프롬프트가 복사되었습니다.`); }} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono break-words cursor-pointer hover:text-indigo-500 transition-colors" title="클릭 복사">
                            {plan.midjourneyPrompt}
                        </p>
                    </div>

                    {plan.history?.length ? (
                        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2">
                            <button onClick={() => onSelect(index)} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                                👀 결과 보기 ({plan.history.length})
                            </button>
                            <button onClick={() => onGenerateClick(index, plan.title, plan.musicStyle)} disabled={plan.isGeneratingLyrics} className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg disabled:opacity-50" title="새 가사 버전 만들기">
                                {plan.isGeneratingLyrics ? '생성 중' : '+ 새 버전'}
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => onGenerateClick(index, plan.title, plan.musicStyle)} disabled={plan.isGeneratingLyrics} className="w-full py-2.5 mt-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                            {plan.isGeneratingLyrics ? '🎶 프로덕션 가동 중...' : '🎶 이 컨셉으로 곡 쓰기'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
