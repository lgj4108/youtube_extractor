'use client';

import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import SearchForm from './planner/SearchForm';
import VideoCard from './planner/VideoCard';
import AiSettingsModal from './planner/AiSettingsModal';
import PromptEditor from './planner/PromptEditor';

// 💡 1. 숏츠와 롱폼 상태를 독립적으로 분리하여 동시 관리가 가능하도록 수정
interface AiPlan {
    title: string;
    midjourneyPrompt: string;
    shortScript?: string;
    longScript?: string;
    isGeneratingShort?: boolean;
    isGeneratingLong?: boolean;
}

export default function PlannerTab() {
    const [keyword, setKeyword] = useState<string>('');
    const [period, setPeriod] = useState<string>('month');
    const [duration, setDuration] = useState<string>('any');
    const [region, setRegion] = useState<string>('KR');
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [savedVideos, setSavedVideos] = useState<YouTubeVideo[]>([]);
    const [viewMode, setViewMode] = useState<'search' | 'saved'>('search');

    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');
    const [apiKey, setApiKey] = useState<string>('');
    const [aiPlans, setAiPlans] = useState<AiPlan[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string>('');

    const [concept, setConcept] = useState<string>('');
    const [inferredTheme, setInferredTheme] = useState<string>('');

    const [viewingScript, setViewingScript] = useState<{title: string, script: string, format: string} | null>(null);

    useEffect(() => {
        const localData = localStorage.getItem('yt_scraped_videos');
        if (localData) setSavedVideos(JSON.parse(localData));
        const savedProvider = localStorage.getItem('ai_provider');
        const savedKey = localStorage.getItem('ai_api_key');
        if (savedProvider) setAiProvider(savedProvider);
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleToggleSave = (video: YouTubeVideo) => {
        const updated = savedVideos.some(v => v.videoId === video.videoId)
            ? savedVideos.filter(v => v.videoId !== video.videoId)
            : [...savedVideos, video];
        setSavedVideos(updated);
        localStorage.setItem('yt_scraped_videos', JSON.stringify(updated));
    };

    // 💡 2. 화면 전체 초기화 함수 추가
    const handleResetAll = () => {
        if (!confirm('현재 작업 중인 검색 결과와 기획안이 모두 지워집니다. 초기화하시겠습니까?')) return;
        setKeyword('');
        setVideos([]);
        setAiPlans([]);
        setInferredTheme('');
        setConcept('');
        setError('');
        setAiError('');
        setViewingScript(null);
    };

    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;
        setLoading(true); setError(''); setAiError(''); setVideos([]); setAiPlans([]); setInferredTheme(''); setViewMode('search');
        try {
            const response = await fetch('/api/planner', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, period, duration, region }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '오류 발생');
            setVideos(data.rawData || []);
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const handleGenerateAiPlans = async () => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setIsGenerating(true); setAiError(''); setAiPlans([]); setInferredTheme('');
        try {
            const response = await fetch('/api/generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, concept, youtubeData: viewMode === 'search' ? videos : savedVideos }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setAiPlans(data.plans || []);
            setInferredTheme(data.inferredTheme || '');
        } catch (err: any) { setAiError(err.message); } finally { setIsGenerating(false); }
    };

    // 💡 3. 재작성을 위해 특정 포맷의 상태만 업데이트 하도록 다이나믹 키 적용
    const handleGenerateScript = async (index: number, title: string, format: 'short' | 'long') => {
        if (!apiKey) { setIsSettingsOpen(true); return; }

        const loadingKey = format === 'short' ? 'isGeneratingShort' : 'isGeneratingLong';
        const scriptKey = format === 'short' ? 'shortScript' : 'longScript';

        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, [loadingKey]: true } : plan));

        try {
            const response = await fetch('/api/script', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, title, systemPrompt: inferredTheme || concept, format }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setAiPlans(prev => prev.map((plan, i) => i === index ? {
                ...plan,
                [scriptKey]: data.script,
                [loadingKey]: false
            } : plan));
        } catch (err: any) {
            alert(`대본 생성 실패: ${err.message}`);
            setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, [loadingKey]: false } : plan));
        }
    };

    const currentDisplayData = viewMode === 'search' ? videos : savedVideos;

    return (
        <div className="animate-fadeIn relative">
            <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />

            <SearchForm keyword={keyword} setKeyword={setKeyword} period={period} setPeriod={setPeriod} duration={duration} setDuration={setDuration} region={region} setRegion={setRegion} onSubmit={handleFetchYoutube} loading={loading} />

            {error && <div className="p-5 mb-8 bg-red-50 border-red-200 text-red-600 rounded-xl font-medium text-center">⚠️ {error}</div>}

            {currentDisplayData.length > 0 && !loading && (
                <>
                    <div className="absolute -top-14 right-2 sm:right-6">
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-200/50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">⚙️</button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg">
                            <button onClick={() => setViewMode('search')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'search' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>검색 결과 ({videos.length})</button>
                            <button onClick={() => setViewMode('saved')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'saved' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>⭐️ 스크랩 ({savedVideos.length})</button>
                        </div>

                        <div className="flex gap-2">
                            {/* 💡 4. 전체 초기화 버튼 추가 */}
                            <button onClick={handleResetAll} className="text-xs px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors flex items-center">
                                🔄 전체 초기화
                            </button>
                            <button onClick={handleGenerateAiPlans} disabled={isGenerating} className="text-xs px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white rounded-lg font-bold shadow-md disabled:from-slate-400">
                                {isGenerating ? '✨ 기획안 작성 중...' : '✨ 이 데이터로 AI 기획안 생성'}
                            </button>
                        </div>
                    </div>

                    <PromptEditor concept={concept} setConcept={setConcept} />

                    {aiError && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">⚠️ {aiError}</div>}

                    {aiPlans.length > 0 && (
                        <div className="mb-10 bg-indigo-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">

                            <div className="flex flex-col gap-2 mb-6">
                                <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">✨ AI 수석 기획자의 제안</h2>
                                {inferredTheme && (
                                    <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-indigo-200 dark:border-slate-700 text-sm">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400 mr-2">🎯 AI 자동 기획 방향:</span>
                                        <span className="text-slate-700 dark:text-slate-300">{inferredTheme}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {aiPlans.map((plan, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">

                                        <div className="mb-4">
                                            <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-md mb-2">아이디어 {index + 1}</span>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{plan.title}</h3>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mb-4">
                                            <p className="text-[10px] font-bold text-slate-500 mb-1">썸네일 프롬프트</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 font-mono break-words">{plan.midjourneyPrompt}</p>
                                        </div>

                                        {/* 💡 5. 재작성 버튼과 읽기 버튼의 분리 */}
                                        <div className="mt-auto flex flex-col gap-2">

                                            {/* 숏츠 컨트롤 영역 */}
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    onClick={() => handleGenerateScript(index, plan.title, 'short')}
                                                    disabled={plan.isGeneratingShort}
                                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {plan.isGeneratingShort ? '⚙️ 작성 중...' : (plan.shortScript ? '🔄 숏츠 재작성' : '🎬 1분 숏츠 대본 쓰기')}
                                                </button>
                                                {plan.shortScript && (
                                                    <button
                                                        onClick={() => setViewingScript({ title: plan.title, script: plan.shortScript!, format: 'short' })}
                                                        className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        📜 읽기
                                                    </button>
                                                )}
                                            </div>

                                            {/* 롱폼 컨트롤 영역 */}
                                            <div className="flex gap-2 w-full">
                                                <button
                                                    onClick={() => handleGenerateScript(index, plan.title, 'long')}
                                                    disabled={plan.isGeneratingLong}
                                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {plan.isGeneratingLong ? '⚙️ 작성 중...' : (plan.longScript ? '🔄 롱폼 재작성' : '📈 10분 롱폼 다큐 쓰기')}
                                                </button>
                                                {plan.longScript && (
                                                    <button
                                                        onClick={() => setViewingScript({ title: plan.title, script: plan.longScript!, format: 'long' })}
                                                        className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        📜 읽기
                                                    </button>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {currentDisplayData.map((video, index) => (
                            <VideoCard key={video.videoId} video={video} index={viewMode === 'search' ? index : undefined} isSaved={savedVideos.some(v => v.videoId === video.videoId)} onToggleSave={handleToggleSave} />
                        ))}
                    </div>
                </>
            )}

            {loading && <div className="flex flex-col items-center justify-center py-12"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>}

            {viewingScript && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col animate-fadeIn">

                        <div className="flex justify-between items-start p-5 border-b border-slate-100 dark:border-slate-800">
                            <div>
                <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded-md mb-2 ${viewingScript.format === 'long' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                  {viewingScript.format === 'long' ? '📈 롱폼 기획 스크립트' : '🎬 숏츠 대본'}
                </span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{viewingScript.title}</h3>
                            </div>
                            <button onClick={() => setViewingScript(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto font-sans text-sm text-slate-700 dark:text-slate-300 leading-loose whitespace-pre-wrap">
                            {viewingScript.script}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => { navigator.clipboard.writeText(viewingScript.script); alert('대본이 복사되었습니다.'); }}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                            >
                                대본 복사하기
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}