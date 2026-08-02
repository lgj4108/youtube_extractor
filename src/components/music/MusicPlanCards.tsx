'use client';
import { useState } from 'react'; // 💡 useState 추가
import { MusicAiPlan } from './MusicAiResult';

interface MusicPlanCardsProps {
    aiPlans: MusicAiPlan[];
    activeDetailIndex: number | null;
    onGenerateClick: (index: number, title: string, musicStyle: string) => void;
    showToast: (msg: string) => void;
}

export default function MusicPlanCards({ aiPlans, activeDetailIndex, onGenerateClick, showToast }: MusicPlanCardsProps) {
    // 💡 제목 복사 시 시각적 효과를 위한 상태 추가
    const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);

    // 💡 제목 복사 핸들러 함수
    const handleCopyTitle = (e: React.MouseEvent, title: string, index: number) => {
        e.stopPropagation(); // 클릭 이벤트 버블링 방지
        navigator.clipboard.writeText(title);
        showToast(`트랙 ${index + 1}의 제목이 복사되었습니다.`);
        setCopiedTitleIndex(index);
        setTimeout(() => setCopiedTitleIndex(null), 2000);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiPlans.map((plan, index) => (
                <div key={index} className={`bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border flex flex-col h-full transition-all ${activeDetailIndex === index ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-md mb-3 w-max">트랙 {index + 1}</span>

                    {/* 💡 [여기가 수정된 부분입니다!] 제목 옆에 복사 아이콘 추가 */}
                    <div className="flex justify-between items-start mb-4 gap-2 group">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight break-words flex-1">
                            {plan.title}
                        </h3>
                        <button
                            onClick={(e) => handleCopyTitle(e, plan.title, index)}
                            className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="제목 복사하기"
                        >
                            {copiedTitleIndex === index ? (
                                // ✅ 복사 완료 시 체크 아이콘
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                // 📋 기본 복사 아이콘
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* 이하 원본 코드 동일하게 유지 */}
                    <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-indigo-500">🎸 음악 스타일 (Suno/Udio)</p>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(plan.musicStyle); showToast(`트랙 ${index + 1}의 영문 스타일 태그가 복사되었습니다.`); }} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded transition-colors font-bold">
                                영문 복사
                            </button>
                        </div>
                        {plan.musicStyleKor && <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">🇰🇷 {plan.musicStyleKor}</p>}
                        <p onClick={() => { navigator.clipboard.writeText(plan.musicStyle); showToast(`트랙 ${index + 1}의 영문 스타일 태그가 복사되었습니다.`); }} className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-words cursor-pointer hover:text-indigo-500 transition-colors" title="클릭하여 영문 태그 복사">
                            {plan.musicStyle}
                        </p>
                    </div>

                    <div className="mb-4 flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-slate-500">🖼️ 앨범 커버 / 썸네일</p>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(plan.midjourneyPrompt); showToast(`트랙 ${index + 1}의 커버 프롬프트가 복사되었습니다.`); }} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 transition-colors font-bold">
                                복사
                            </button>
                        </div>
                        <p onClick={() => { navigator.clipboard.writeText(plan.midjourneyPrompt); showToast(`트랙 ${index + 1}의 커버 프롬프트가 복사되었습니다.`); }} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono break-words cursor-pointer hover:text-indigo-500 transition-colors" title="클릭 복사">
                            {plan.midjourneyPrompt}
                        </p>
                    </div>

                    <button onClick={() => onGenerateClick(index, plan.title, plan.musicStyle)} disabled={plan.isGeneratingLyrics} className="w-full py-2.5 mt-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                        {plan.isGeneratingLyrics ? '🎶 프로덕션 가동 중...' : (plan.lyrics ? '👀 결과물 확인하기' : '🎶 이 컨셉으로 곡 쓰기')}
                    </button>
                </div>
            ))}
        </div>
    );
}