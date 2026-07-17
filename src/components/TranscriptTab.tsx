'use client';

import { useState, FormEvent } from 'react';

export default function TranscriptTab() {
    const [url, setUrl] = useState<string>('');
    const [transcript, setTranscript] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleFetchTranscript = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError('');
        setTranscript('');

        try {
            const response = await fetch('/api/transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '오류가 발생했습니다.');

            setTranscript(data.text);
        } catch (err: any) {
            setError(err.message || '요청 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">📹 유튜브 자막 추출</h2>
                <p className="text-slate-500 text-sm">영상 URL을 입력하여 한국어 자막을 한 번에 긁어옵니다.</p>
            </div>

            <form onSubmit={handleFetchTranscript} className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-slate-100"
                />
                <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm min-w-[140px] transition-colors"
                >
                    {loading ? '추출 중...' : '자막 추출하기'}
                </button>
            </form>

            {error && (
                <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium text-center">
                    ⚠️ {error}
                </div>
            )}

            {transcript && !loading && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">추출된 자막 결과</h3>
                        <button
                            onClick={() => navigator.clipboard.writeText(transcript)}
                            className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                        >
                            전체 복사하기
                        </button>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 max-h-[400px] overflow-y-auto text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {transcript}
                    </div>
                </div>
            )}
        </div>
    );
}