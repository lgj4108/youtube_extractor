'use client';

import { FormEvent, useState } from 'react';
import { copyText } from '@/lib/http';
import type { LyricCopilotMessage } from './MusicAiResult';

interface LyricsCopilotProps {
    messages: LyricCopilotMessage[];
    currentLyrics: string;
    onSend: (lyrics: string, message: string) => Promise<boolean>;
    onApply: (lyrics: string) => void;
    onClear: () => void;
    showToast: (message: string) => void;
}

const QUICK_REQUESTS = [
    '후렴 훅부터 다시 설계해줘',
    '가장 약한 구간을 진단하고 고쳐줘',
    '한국어 발음과 호흡을 다듬어줘',
    '보컬·코러스·공간감 연출을 보강해줘',
];

export default function LyricsCopilot({ messages, currentLyrics, onSend, onApply, onClear, showToast }: LyricsCopilotProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const submit = async (event?: FormEvent) => {
        event?.preventDefault();
        const request = message.trim();
        if (!request || isSending) return;

        setIsSending(true);
        try {
            if (await onSend(currentLyrics, request)) setMessage('');
        } finally {
            setIsSending(false);
        }
    };

    const copySuggestion = async (lyrics: string) => {
        try {
            await copyText(lyrics);
            showToast('코파일럿의 가사 제안이 복사되었습니다.');
        } catch {
            showToast('복사하지 못했습니다. 브라우저 권한을 확인해주세요.');
        }
    };

    return (
        <section className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20" aria-labelledby="lyrics-copilot-title">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-100 bg-white/70 px-4 py-3 dark:border-violet-900 dark:bg-slate-900/60">
                <div>
                    <h4 id="lyrics-copilot-title" className="text-sm font-bold text-violet-900 dark:text-violet-200">✨ 가사 코파일럿</h4>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-violet-700 dark:text-violet-300">현재 가사와 곡 기획을 기억하며 대화합니다. 마음에 든 제안만 새 버전으로 적용하세요.</p>
                </div>
                {messages.length > 0 && (
                    <button type="button" onClick={onClear} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">대화 비우기</button>
                )}
            </div>

            <div className="max-h-[440px] space-y-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 && (
                    <div className="rounded-lg border border-dashed border-violet-200 bg-white/80 p-4 text-xs leading-relaxed text-slate-600 dark:border-violet-900 dark:bg-slate-900/70 dark:text-slate-300">
                        “이 가사의 화자가 누구인지 먼저 정리해줘”처럼 상의하거나, “2절을 더 냉소적으로 다시 써줘”처럼 바로 작업을 요청할 수 있습니다.
                    </div>
                )}
                {messages.map((item) => (
                    <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[92%] rounded-xl px-3.5 py-3 text-xs leading-relaxed ${item.role === 'user' ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
                            <p className="whitespace-pre-wrap">{item.content}</p>
                            {item.suggestedLyrics && (
                                <div className="mt-3 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                                    <div className="flex items-center justify-between border-b border-emerald-200 px-3 py-2 dark:border-emerald-900">
                                        <span className="font-bold text-emerald-800 dark:text-emerald-300">가사 수정안</span>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">원본은 그대로 유지됩니다</span>
                                    </div>
                                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-3 font-sans text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">{item.suggestedLyrics}</pre>
                                    <div className="flex justify-end gap-2 border-t border-emerald-200 p-2 dark:border-emerald-900">
                                        <button type="button" onClick={() => void copySuggestion(item.suggestedLyrics!)} className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">복사</button>
                                        <button type="button" onClick={() => onApply(item.suggestedLyrics!)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700">새 버전으로 적용</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isSending && (
                    <div className="flex justify-start">
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-xs font-bold text-violet-700 dark:border-violet-900 dark:bg-slate-900 dark:text-violet-300">가사를 함께 다듬는 중…</div>
                    </div>
                )}
            </div>

            <form onSubmit={(event) => void submit(event)} className="border-t border-violet-100 bg-white/80 p-3 dark:border-violet-900 dark:bg-slate-900/60">
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {QUICK_REQUESTS.map((request) => (
                        <button key={request} type="button" onClick={() => setMessage(request)} disabled={isSending} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">{request}</button>
                    ))}
                </div>
                <div className="flex items-end gap-2">
                    <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                void submit();
                            }
                        }}
                        placeholder="가사의 방향을 상의하거나 원하는 수정 내용을 적어주세요"
                        className="min-h-20 min-w-0 flex-1 resize-y rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-violet-900 dark:bg-slate-950 dark:text-slate-100"
                        disabled={isSending}
                        maxLength={3000}
                        aria-label="가사 코파일럿 메시지"
                    />
                    <button type="submit" disabled={!message.trim() || isSending} className="rounded-lg bg-violet-600 px-4 py-3 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">보내기</button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">Enter 전송 · Shift+Enter 줄바꿈 · AI 답변은 적용 전까지 현재 가사를 바꾸지 않습니다.</p>
            </form>
        </section>
    );
}
