'use client';

import { useState } from 'react';
import { fetchJson } from '@/lib/http';
import { getErrorMessage } from '@/lib/errors';

interface AiSettingsModalProps {
    onClose: () => void;
    provider: string;
    setProvider: (val: string) => void;
    apiKey: string;
    setApiKey: (val: string) => void;
}

const PROVIDERS = [
    {
        id: 'gemini',
        name: 'Google Gemini',
        badge: '추천',
        description: '처음 시작하기 쉽고 긴 자료 분석에 적합',
        keyUrl: 'https://ai.google.dev/aistudio',
        keyHint: 'Google AI Studio에서 Gemini API 키를 생성하세요.',
    },
    {
        id: 'openai',
        name: 'OpenAI',
        badge: '균형',
        description: '기획과 한국어 문장 생성에 안정적인 선택',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyHint: 'OpenAI Platform의 API Keys 메뉴에서 생성하세요.',
    },
    {
        id: 'groq',
        name: 'Groq',
        badge: '빠른 속도',
        description: '빠른 응답이 중요한 반복 작업에 적합',
        keyUrl: 'https://console.groq.com/keys',
        keyHint: 'Groq Console의 API Keys 메뉴에서 생성하세요.',
    },
] as const;

type ConnectionStatus = { type: 'idle' | 'testing' | 'success' | 'error'; message: string };

function keyLooksPlausible(provider: string, value: string) {
    const key = value.trim();
    if (key.length < 20 || /\s/.test(key)) return false;
    if (provider === 'openai') return key.startsWith('sk-');
    if (provider === 'groq') return key.startsWith('gsk_');
    return true;
}

export default function AiSettingsModal({ onClose, provider, setProvider, apiKey, setApiKey }: AiSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'api' | 'prompt'>('api');
    const [draftProvider, setDraftProvider] = useState(provider);
    const [draftApiKey, setDraftApiKey] = useState(apiKey);
    const [planPrompt, setPlanPrompt] = useState(() => localStorage.getItem('custom_plan_prompt') ?? '');
    const [lyricsPrompt, setLyricsPrompt] = useState(() => localStorage.getItem('custom_lyrics_prompt') ?? '');
    const [showApiKey, setShowApiKey] = useState(false);
    const [connection, setConnection] = useState<ConnectionStatus>({ type: 'idle', message: '' });
    const selectedProvider = PROVIDERS.find((item) => item.id === draftProvider) ?? PROVIDERS[0];
    const hasKey = draftApiKey.trim().length > 0;
    const plausibleKey = keyLooksPlausible(draftProvider, draftApiKey);

    const updateProvider = (nextProvider: string) => {
        setDraftProvider(nextProvider);
        setConnection({ type: 'idle', message: '' });
    };

    const updateApiKey = (nextKey: string) => {
        setDraftApiKey(nextKey);
        setConnection({ type: 'idle', message: '' });
    };

    const handlePaste = async () => {
        try { updateApiKey(await navigator.clipboard.readText()); }
        catch (error: unknown) { setConnection({ type: 'error', message: getErrorMessage(error, '클립보드를 읽지 못했습니다.') }); }
    };

    const handleTest = async () => {
        if (!hasKey) return;
        setConnection({ type: 'testing', message: '선택한 AI에 연결하는 중입니다...' });
        try {
            await fetchJson<{ ok: boolean }>('/api/ai-test', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: draftProvider, apiKey: draftApiKey.trim() }),
            });
            setConnection({ type: 'success', message: `${selectedProvider.name} 연결에 성공했습니다.` });
        } catch (error: unknown) {
            setConnection({ type: 'error', message: getErrorMessage(error, '연결에 실패했습니다.') });
        }
    };

    const handleDeleteKey = () => {
        if (!window.confirm('이 브라우저에 저장된 AI API 키를 삭제하시겠습니까?')) return;
        setApiKey('');
        setDraftApiKey('');
        setConnection({ type: 'idle', message: '저장된 키를 삭제했습니다.' });
    };

    const handleSave = () => {
        setProvider(draftProvider);
        setApiKey(draftApiKey.trim());
        localStorage.setItem('custom_plan_prompt', planPrompt);
        localStorage.setItem('custom_lyrics_prompt', lyricsPrompt);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h2 id="ai-settings-title" className="text-lg font-bold text-slate-900 dark:text-white">AI 연결 및 설정</h2>
                        <p className="mt-1 text-xs text-slate-500">한 번 저장하면 영상 기획과 음악 제작에서 함께 사용합니다.</p>
                    </div>
                    <button onClick={onClose} className="text-xl font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="설정 닫기">✕</button>
                </div>

                <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="AI 설정 구분">
                    <button role="tab" aria-selected={activeTab === 'api'} onClick={() => setActiveTab('api')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'api' ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-900/20' : 'text-slate-500'}`}>1. AI 연결</button>
                    <button role="tab" aria-selected={activeTab === 'prompt'} onClick={() => setActiveTab('prompt')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'prompt' ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-900/20' : 'text-slate-500'}`}>2. 창작 취향 설정</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                    {activeTab === 'api' ? (
                        <div className="space-y-6 animate-fadeIn">
                            <fieldset>
                                <legend className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">사용할 AI를 선택하세요</legend>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {PROVIDERS.map((item) => (
                                        <label key={item.id} className={`cursor-pointer rounded-2xl border p-4 transition ${draftProvider === item.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/40 dark:ring-indigo-900' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}>
                                            <input type="radio" name="ai-provider" value={item.id} checked={draftProvider === item.id} onChange={() => updateProvider(item.id)} className="sr-only" />
                                            <span className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-900 dark:text-white">{item.name}</strong><span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-indigo-600 shadow-sm dark:bg-slate-800">{item.badge}</span></span>
                                            <span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="api-key-label">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div><h3 id="api-key-label" className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedProvider.name} API 키</h3><p className="mt-1 text-xs text-slate-500">{selectedProvider.keyHint}</p></div>
                                    <a href={selectedProvider.keyUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">공식 키 발급 페이지 ↗</a>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input aria-labelledby="api-key-label" type={showApiKey ? 'text' : 'password'} value={draftApiKey} onChange={(event) => updateApiKey(event.target.value)} placeholder="발급받은 API 키 붙여넣기" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={handlePaste} className="flex-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">붙여넣기</button>
                                        <button type="button" onClick={() => setShowApiKey((visible) => !visible)} className="flex-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-pressed={showApiKey}>{showApiKey ? '숨기기' : '보기'}</button>
                                    </div>
                                </div>
                                {hasKey && !plausibleKey && <p className="mt-2 text-xs font-semibold text-amber-600">키 형식이 일반적인 {selectedProvider.name} 키와 다릅니다. 오탈자가 없는지 확인해주세요.</p>}
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-[11px] leading-relaxed text-slate-500">키는 서버 DB가 아닌 현재 브라우저에만 저장됩니다. 공용 기기에서는 작업 후 삭제하세요.</p>
                                    <div className="flex shrink-0 gap-2">
                                        {apiKey && <button type="button" onClick={handleDeleteKey} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">저장된 키 삭제</button>}
                                        <button type="button" onClick={handleTest} disabled={!hasKey || connection.type === 'testing'} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900">{connection.type === 'testing' ? '연결 중...' : '연결 테스트'}</button>
                                    </div>
                                </div>
                                {connection.message && <div role="status" className={`mt-3 rounded-xl p-3 text-xs font-bold ${connection.type === 'success' ? 'bg-emerald-50 text-emerald-700' : connection.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>{connection.type === 'success' ? '✓ ' : connection.type === 'error' ? '⚠️ ' : ''}{connection.message}</div>}
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs font-semibold leading-relaxed text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">원하는 분위기와 표현 방식을 적어두면 음악 기획과 가사 생성에 우선 반영됩니다. 비워두면 사용자 키워드와 장르에 맞춰 자유롭게 생성합니다.</div>
                            <div>
                                <label className="mb-2 flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300"><span>곡 기획 취향</span><button onClick={() => setPlanPrompt('')} className="text-xs text-slate-400 hover:text-indigo-500">비우기</button></label>
                                <textarea value={planPrompt} onChange={(event) => setPlanPrompt(event.target.value)} placeholder="예: 제목은 짧게, 사이버펑크보다 따뜻한 아날로그 질감을 선호해..." className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="mb-2 flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300"><span>가사와 뮤직비디오 취향</span><button onClick={() => setLyricsPrompt('')} className="text-xs text-slate-400 hover:text-indigo-500">비우기</button></label>
                                <textarea value={lyricsPrompt} onChange={(event) => setLyricsPrompt(event.target.value)} placeholder="예: 은유적인 가사, 현실적인 장소, 자연광 중심의 뮤직비디오를 선호해..." className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                    <span className="hidden text-xs text-slate-400 sm:block">설정은 모든 AI 기능에 공통 적용됩니다.</span>
                    <div className="ml-auto flex gap-2"><button onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-300">취소</button><button onClick={handleSave} disabled={activeTab === 'api' && !hasKey} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">설정 저장</button></div>
                </div>
            </div>
        </div>
    );
}
