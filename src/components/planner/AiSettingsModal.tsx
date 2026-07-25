'use client';
import { useState, useEffect } from 'react';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string; setProvider: (val: string) => void;
    apiKey: string; setApiKey: (val: string) => void;
}

export default function AiSettingsModal({ isOpen, onClose, provider, setProvider, apiKey, setApiKey }: AiSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'api' | 'prompt'>('api');
    const [planPrompt, setPlanPrompt] = useState<string>('');
    const [lyricsPrompt, setLyricsPrompt] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setPlanPrompt(localStorage.getItem('custom_plan_prompt') || '');
            setLyricsPrompt(localStorage.getItem('custom_lyrics_prompt') || '');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('ai_api_key', apiKey);
        localStorage.setItem('custom_plan_prompt', planPrompt);
        localStorage.setItem('custom_lyrics_prompt', lyricsPrompt);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">⚙️ AI 환경 설정</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl">✕</button>
                </div>

                <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <button onClick={() => setActiveTab('api')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'api' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🔑 API 키 설정</button>
                    <button onClick={() => setActiveTab('prompt')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'prompt' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>📝 프롬프트 튜닝</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'api' ? (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">AI 모델 제공자</label>
                                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                    <option value="gemini">Google Gemini (추천)</option>
                                    <option value="openai">OpenAI (ChatGPT)</option>
                                    <option value="groq">Groq (Llama 3)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">API Key 입력</label>
                                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                <p className="mt-2 text-xs text-slate-500">* 입력하신 키는 서버에 저장되지 않고 현재 브라우저(로컬)에만 안전하게 보관됩니다.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold leading-relaxed">
                                    💡 팁: 시스템이 강제하는 포맷(JSON 규칙, 씬 분할 등)과 선택된 장르/언어 변수는 백엔드에서 자동으로 주입됩니다. 이곳에는 <span className="text-blue-600 dark:text-blue-400 font-bold">'감독으로서 AI에게 지시하고 싶은 연출 방향, 톤앤매너'</span>만 자유롭게 적어주세요. (비워두면 기본값이 사용됩니다.)
                                </p>
                            </div>
                            <div>
                                <label className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span>🎵 1. 곡 기획 프롬프트 (Style & Concept)</span>
                                    <button onClick={() => setPlanPrompt('')} className="text-xs text-slate-400 hover:text-indigo-500">기본값 복구</button>
                                </label>
                                <textarea value={planPrompt} onChange={(e) => setPlanPrompt(e.target.value)} placeholder="예: 시적이고 은유적인 표현을 많이 사용해 줘. 사이버펑크 느낌을 강조해 줘..." className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-28 resize-none" />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span>📝 2. 가사 및 씬(Scene) 생성 프롬프트</span>
                                    <button onClick={() => setLyricsPrompt('')} className="text-xs text-slate-400 hover:text-indigo-500">기본값 복구</button>
                                </label>
                                <textarea value={lyricsPrompt} onChange={(e) => setLyricsPrompt(e.target.value)} placeholder="예: 펀치라인을 강렬하게 써줘. 뮤비 씬은 다크하고 차가운 느낌의 조명을 메인으로 연출해 줘..." className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-28 resize-none" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors">취소</button>
                    <button onClick={handleSave} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md">설정 저장</button>
                </div>
            </div>
        </div>
    );
}