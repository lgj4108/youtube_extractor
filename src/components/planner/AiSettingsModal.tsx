'use client';

import { useState, useEffect } from 'react';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string;
    setProvider: (val: string) => void;
    apiKey: string;
    setApiKey: (val: string) => void;
}

export default function AiSettingsModal({ isOpen, onClose, provider, setProvider, apiKey, setApiKey }: AiSettingsModalProps) {
    const [tempProvider, setTempProvider] = useState(provider);
    const [tempKey, setTempKey] = useState(apiKey);

    useEffect(() => {
        setTempProvider(provider);
        setTempKey(apiKey);
    }, [provider, apiKey, isOpen]);

    const handleSave = () => {
        setProvider(tempProvider);
        setApiKey(tempKey);
        localStorage.setItem('ai_provider', tempProvider);
        localStorage.setItem('ai_api_key', tempKey);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">⚙️ AI 모델 설정</h3>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">AI 프로바이더 선택</label>
                        <select
                            value={tempProvider}
                            onChange={(e) => setTempProvider(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white">
                            <option value="gemini">Google Gemini (무료)</option>
                            <option value="groq">Groq Llama-3 (초고속 무료/강력 추천)</option>
                            <option value="openai">OpenAI ChatGPT</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">API Key 입력</label>
                        <input
                            type="password"
                            placeholder="sk-... 또는 AIza..."
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            * 입력된 키는 브라우저(로컬)에만 안전하게 저장됩니다.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600">
                        취소
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                        설정 저장
                    </button>
                </div>
            </div>
        </div>
    );
}