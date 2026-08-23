'use client';

import { FormEvent, useState } from 'react';
import { copyText, fetchJson } from '@/lib/http';
import { getErrorMessage } from '@/lib/errors';
import { useStoredJson, useStoredString, writeStoredString } from '@/lib/storage';

interface TranscriptSegment {
    duration: number;
    offset: number;
    text: string;
}

const EMPTY_SEGMENTS: TranscriptSegment[] = [];

function formatTimestamp(milliseconds: number, separator = ',') {
    const totalSeconds = Math.max(0, milliseconds / 1_000);
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.floor(milliseconds % 1_000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

function downloadText(filename: string, content: string, type = 'text/plain') {
    const objectUrl = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
}

export default function TranscriptTab() {
    const [url, setUrl] = useStoredString('transcript_url', '');
    const [transcript, setTranscript] = useStoredString('transcript_text', '');
    const [segments, setSegments] = useStoredJson<TranscriptSegment[]>('transcript_segments', EMPTY_SEGMENTS);
    const [language, setLanguage] = useStoredString('transcript_language', 'auto');
    const [includeTimestamps, setIncludeTimestamps] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const displayTranscript = includeTimestamps && segments.length
        ? segments.map((segment) => `[${formatTimestamp(segment.offset, '.')}] ${segment.text}`).join('\n')
        : transcript;

    const handleFetchTranscript = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!url.trim()) return;
        setLoading(true); setError(''); setNotice('');
        try {
            const data = await fetchJson<{ text: string; segments?: TranscriptSegment[] }>('/api/transcript', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, language }),
            });
            setTranscript(data.text);
            setSegments(data.segments || []);
            setNotice('자막을 추출하고 현재 프로젝트에 자동 저장했습니다.');
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, '요청 처리 중 오류가 발생했습니다.'));
        } finally { setLoading(false); }
    };

    const handlePaste = async () => {
        try { setUrl(await navigator.clipboard.readText()); }
        catch (pasteError: unknown) { setError(getErrorMessage(pasteError, '클립보드를 읽지 못했습니다.')); }
    };

    const sendToPlanner = () => {
        writeStoredString('planner_concept', transcript.slice(0, 12_000));
        writeStoredString('creator_active_tab', 'planner');
    };

    const exportSubtitles = (format: 'txt' | 'srt' | 'vtt') => {
        if (format === 'txt' || segments.length === 0) return downloadText('youtube-transcript.txt', displayTranscript);
        const content = segments.map((segment, index) => {
            const start = formatTimestamp(segment.offset, format === 'srt' ? ',' : '.');
            const end = formatTimestamp(segment.offset + segment.duration, format === 'srt' ? ',' : '.');
            return `${format === 'srt' ? `${index + 1}\n` : ''}${start} --> ${end}\n${segment.text}`;
        }).join('\n\n');
        downloadText(`youtube-transcript.${format}`, format === 'vtt' ? `WEBVTT\n\n${content}` : content, format === 'vtt' ? 'text/vtt' : 'application/x-subrip');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-8 animate-fadeIn">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">📹 유튜브 자막 추출</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">링크를 붙여넣고 원하는 언어와 파일 형식을 선택하세요. 결과는 자동 저장됩니다.</p>
            </div>

            <form onSubmit={handleFetchTranscript} className="space-y-3 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input type="url" aria-label="유튜브 영상 주소" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60" />
                    <button type="button" onClick={handlePaste} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">붙여넣기</button>
                    <button type="submit" disabled={loading || !url.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm min-w-[140px]">{loading ? '자막 가져오는 중...' : '자막 추출'}</button>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">우선 언어
                    <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                        <option value="auto">자동 감지</option><option value="ko">한국어</option><option value="en">영어</option><option value="ja">일본어</option>
                    </select>
                </label>
            </form>

            {error && <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium text-center">⚠️ {error} <button onClick={() => setError('')} className="ml-2 underline">닫기</button></div>}
            {notice && <div className="mb-6 rounded-xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700">✓ {notice}</div>}

            {transcript && !loading && (
                <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6">
                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">추출된 자막</h3>
                            <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" checked={includeTimestamps} onChange={(event) => setIncludeTimestamps(event.target.checked)} /> 타임스탬프 표시</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => copyText(displayTranscript).then(() => setNotice('자막을 복사했습니다.')).catch((copyError: unknown) => setError(getErrorMessage(copyError)))} className="text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold">복사</button>
                            {(['txt', 'srt', 'vtt'] as const).map((format) => <button key={format} onClick={() => exportSubtitles(format)} className="text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold">{format.toUpperCase()}</button>)}
                            <button onClick={sendToPlanner} className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold">기획 자료로 보내기</button>
                        </div>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 max-h-[420px] overflow-y-auto text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{displayTranscript}</div>
                </div>
            )}
        </div>
    );
}
