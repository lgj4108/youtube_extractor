'use client';
import { useRef, useState } from 'react';
import { copyText } from '@/lib/http';
import { MusicAiPlan } from './MusicAiResult';
import SunoCreativeSettings, { formatSunoCreativeSettings } from './SunoCreativeSettings';

interface MusicLyricsPanelProps {
    activePlan: MusicAiPlan;
    showToast: (msg: string) => void;
    onOpenPrompt: (title: string, content: string) => void;
    onSaveLyrics: (sourceVersionIndex: number, lyrics: string, editMethod: 'manual' | 'ai') => void;
    onReviseLyrics: (lyrics: string, instruction: string, selectedText: string) => Promise<string | null>;
}

const AI_REVISION_EXAMPLES = ['후렴을 더 중독성 있게', '한국어 발음을 더 자연스럽게', '보컬·코러스 태그 정리', '공간감과 다이내믹 강화'];

export default function MusicLyricsPanel({ activePlan, showToast, onOpenPrompt, onSaveLyrics, onReviseLyrics }: MusicLyricsPanelProps) {
    const history = activePlan?.history || [];
    const [viewIndex, setViewIndex] = useState<number>(Math.max(0, history.length - 1));
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState('');
    const [aiInstruction, setAiInstruction] = useState('');
    const [isAiRevising, setIsAiRevising] = useState(false);
    const [selectedCharacterCount, setSelectedCharacterCount] = useState(0);
    const [editMethod, setEditMethod] = useState<'manual' | 'ai'>('manual');
    const lyricsEditorRef = useRef<HTMLTextAreaElement>(null);

    const copyWithToast = async (text: string, successMessage: string) => {
        try {
            await copyText(text);
            showToast(successMessage);
        } catch {
            showToast('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해주세요.');
        }
    };

    if (activePlan?.isGeneratingLyrics && history.length === 0) {
        return (
            <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 animate-pulse">Suno용 가사를 창작 중입니다...</p>
            </div>
        );
    }

    if (history.length === 0) return null;

    const safeIndex = Math.min(viewIndex, history.length - 1);
    const currentView = history[safeIndex];

    if (!currentView) return null;

    const startEditing = () => {
        setEditDraft(currentView.lyrics);
        setAiInstruction('');
        setSelectedCharacterCount(0);
        setEditMethod('manual');
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setEditDraft('');
        setAiInstruction('');
        setSelectedCharacterCount(0);
        setIsEditing(false);
    };

    const reviseWithAi = async () => {
        if (!aiInstruction.trim()) {
            showToast('AI에게 요청할 수정 방향을 입력해주세요.');
            return;
        }

        const editor = lyricsEditorRef.current;
        const selectionStart = editor?.selectionStart ?? 0;
        const selectionEnd = editor?.selectionEnd ?? 0;
        const selectedText = selectionEnd > selectionStart ? editDraft.slice(selectionStart, selectionEnd) : '';
        const hasSelection = selectedText.trim().length > 0;

        setIsAiRevising(true);
        try {
            const revision = await onReviseLyrics(editDraft, aiInstruction.trim(), hasSelection ? selectedText : '');
            if (!revision) return;

            if (hasSelection) {
                const revisedDraft = `${editDraft.slice(0, selectionStart)}${revision}${editDraft.slice(selectionEnd)}`;
                setEditDraft(revisedDraft);
            } else {
                setEditDraft(revision);
            }
            setEditMethod('ai');
            setSelectedCharacterCount(0);
            showToast(hasSelection ? '선택한 부분에 AI 수정안을 반영했습니다.' : '요청에 맞는 구간에 AI 수정안을 반영했습니다.');
        } finally {
            setIsAiRevising(false);
        }
    };

    const saveEditing = () => {
        if (!editDraft.trim()) {
            showToast('가사는 비워둘 수 없습니다.');
            return;
        }
        if (editDraft === currentView.lyrics) {
            showToast('수정된 내용이 없습니다.');
            return;
        }
        onSaveLyrics(safeIndex, editDraft, editMethod);
        setIsEditing(false);
        showToast(`버전 ${safeIndex + 1}을 바탕으로 수정본을 저장했습니다.`);
    };

    const selectVersion = (index: number) => {
        if (isEditing && editDraft !== currentView.lyrics && !window.confirm('저장하지 않은 수정 내용이 있습니다. 버전을 이동하면 변경사항이 사라집니다. 이동하시겠습니까?')) return;
        setIsEditing(false);
        setEditDraft('');
        setAiInstruction('');
        setSelectedCharacterCount(0);
        setViewIndex(index);
    };

    const downloadPackage = () => {
        const content = [
            `# ${activePlan.title}`,
            '',
            '## Music style',
            activePlan.musicStyle,
            '',
            '## Suno Creative Sliders',
            formatSunoCreativeSettings({ weirdness: activePlan.weirdness, styleInfluence: activePlan.styleInfluence, reason: activePlan.sunoSettingsReason }),
            '',
            '## Lyrics',
            currentView.lyrics,
        ].join('\n');
        const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${activePlan.title.replace(/[\\/:*?"<>|]/g, '_') || 'music-plan'}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
        showToast('가사와 스타일을 파일로 저장했습니다.');
    };

    return (
        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-lg border border-indigo-200 dark:border-indigo-900/50 animate-fadeIn flex flex-col h-full">

            {activePlan.isGeneratingLyrics && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200" role="status" aria-live="polite">
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" aria-hidden="true"></span>
                    <div>
                        <p className="font-bold">새 가사 버전을 생성하고 있습니다.</p>
                        <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-300">기다리는 동안 아래에서 기존 가사와 이전 버전을 계속 확인·복사할 수 있습니다.</p>
                    </div>
                </div>
            )}

            {history.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                    <span className="text-xs font-bold text-slate-500 py-1.5 mr-2">🗂️ 버전 기록:</span>
                    {history.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => selectVersion(idx)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${safeIndex === idx ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            버전 {idx + 1} {history[idx]?.editedFromVersion ? `(${history[idx]?.editMethod === 'ai' ? 'AI' : '수동'} 수정본${idx === history.length - 1 ? ' · 최신' : ''})` : idx === history.length - 1 ? '(최신)' : ''}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-stretch h-full">

                <div className="flex-1 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            🎧{' '}
                            <button
                                onClick={() => void copyWithToast(activePlan.title, '노래 제목이 복사되었습니다.')}
                                className="rounded text-left transition-colors hover:text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300"
                                title="노래 제목을 클릭하여 복사"
                            >
                                {activePlan.title}
                            </button>
                            <span className="text-sm text-indigo-500 font-normal ml-2">- 버전 {safeIndex + 1}</span>
                        </h3>
                        <div className="flex flex-wrap justify-end gap-2">
                            {currentView.usedPrompt && (
                                <button onClick={() => onOpenPrompt(`${activePlan.title} (버전 ${safeIndex + 1}) 가사 프롬프트`, currentView.usedPrompt!)} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg font-bold transition-colors">
                                    👀 프롬프트 보기
                                </button>
                            )}
                            <button onClick={() => {void copyWithToast(currentView.lyrics, `버전 ${safeIndex + 1} 가사가 복사되었습니다.`);}} className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-bold transition-colors">
                                📋 현재 가사 복사
                            </button>
                            {!isEditing && (
                                <button onClick={startEditing} className="rounded-lg bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300">
                                    ✏️ 일부 수정
                                </button>
                            )}
                            <button onClick={downloadPackage} className="rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                ↓ 결과 묶음 저장
                            </button>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="flex flex-1 flex-col gap-3">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                직접 필요한 줄을 고치거나 AI 수정 요청을 사용할 수 있습니다. 저장하면 원본을 유지한 채 새로운 수정본 버전이 만들어집니다.
                            </div>
                            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-bold text-violet-900 dark:text-violet-200">✨ AI로 일부 자동 수정</p>
                                        <p className="mt-0.5 text-[11px] text-violet-700 dark:text-violet-300">가사에서 문장을 드래그하면 선택 영역만, 선택하지 않으면 요청과 관련된 최소 구간만 수정합니다.</p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300">
                                        {selectedCharacterCount > 0 ? `${selectedCharacterCount}자 선택됨` : 'AI 자동 범위 선택'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        value={aiInstruction}
                                        onChange={(event) => setAiInstruction(event.target.value)}
                                        onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void reviseWithAi(); } }}
                                        placeholder="예: 이 후렴을 더 짧고 중독적으로 바꿔줘"
                                        className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-violet-900 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-900"
                                        disabled={isAiRevising}
                                        aria-label="AI 가사 수정 요청"
                                    />
                                    <button onClick={() => void reviseWithAi()} disabled={isAiRevising} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">
                                        {isAiRevising ? '수정 중...' : 'AI 수정안 적용'}
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {AI_REVISION_EXAMPLES.map((example) => (
                                        <button key={example} onClick={() => setAiInstruction(example)} disabled={isAiRevising} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-950">
                                            {example}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                ref={lyricsEditorRef}
                                value={editDraft}
                                onChange={(event) => { setEditDraft(event.target.value); setSelectedCharacterCount(0); }}
                                onSelect={(event) => setSelectedCharacterCount(Math.max(0, event.currentTarget.selectionEnd - event.currentTarget.selectionStart))}
                                className="min-h-[520px] flex-1 resize-y rounded-xl border border-amber-300 bg-white p-6 font-sans text-sm leading-loose text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-amber-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-900"
                                aria-label={`버전 ${safeIndex + 1} 가사 수정`}
                                spellCheck={false}
                                disabled={isAiRevising}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={cancelEditing} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                    취소
                                </button>
                                <button onClick={saveEditing} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600">
                                    수정본 저장
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-loose bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 h-full overflow-y-auto">
                            {currentView.lyrics}
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-5 h-full">
                    <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">🎸 Suno Style of Music</h4>
                            <button onClick={() => {void copyWithToast(activePlan.musicStyle, 'Suno 스타일 프롬프트가 복사되었습니다.');}} className="text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">스타일 복사</button>
                        </div>
                        <div className="p-4 bg-indigo-50/60 dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 flex flex-col gap-3">
                            {activePlan.musicStyleKor && <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">🇰🇷 {activePlan.musicStyleKor}</p>}
                            <div className="text-xs font-mono text-indigo-900 dark:text-indigo-300 select-all cursor-pointer hover:text-indigo-600 transition-colors pt-2 border-t border-indigo-100 dark:border-slate-700" onClick={() => {void copyWithToast(activePlan.musicStyle, 'Suno 스타일 프롬프트가 복사되었습니다.');}} title="Suno의 Style of Music 입력란에 붙여넣기">
                                {activePlan.musicStyle}
                            </div>
                            <SunoCreativeSettings
                                weirdness={activePlan.weirdness}
                                styleInfluence={activePlan.styleInfluence}
                                reason={activePlan.sunoSettingsReason}
                                showToast={showToast}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
