'use client';
import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import MusicSearchForm from './music/MusicSearchForm';
import MusicAiResult, { MusicAiPlan } from './music/MusicAiResult';
import AiSettingsModal from './planner/AiSettingsModal';

export default function MusicVideoTab() {
    const [keyword, setKeyword] = useState<string>('');
    const [searchedKeyword, setSearchedKeyword] = useState<string>('');
    const [region, setRegion] = useState<string>('KR');

    const [genre, setGenre] = useState<string[]>(['K-POP']);
    const [vocalType, setVocalType] = useState<string>('Auto');
    const [mainLang, setMainLang] = useState<string>('KR');
    const [subLangs, setSubLangs] = useState<string[]>([]);

    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [aiPlans, setAiPlans] = useState<MusicAiPlan[]>([]);
    const [isGeneratingPlans, setIsGeneratingPlans] = useState<boolean>(false);
    const [inferredTheme, setInferredTheme] = useState<string>('');

    // 💡 기획안 생성 시 사용된 프롬프트를 저장하는 상태
    const [planPrompt, setPlanPrompt] = useState<string>('');

    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');
    const [apiKey, setApiKey] = useState<string>('');

    useEffect(() => {
        const savedProvider = localStorage.getItem('ai_provider');
        const savedKey = localStorage.getItem('ai_api_key');
        if (savedProvider) setAiProvider(savedProvider);
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleReset = () => {
        if (window.confirm('현재까지의 모든 기획 및 작업 내역이 초기화됩니다. 처음부터 다시 시작하시겠습니까?')) {
            setKeyword(''); setSearchedKeyword(''); setVideos([]); setError('');
            setAiPlans([]); setInferredTheme(''); setPlanPrompt('');
            setGenre(['K-POP']); setVocalType('Auto'); setMainLang('KR'); setSubLangs([]);
        }
    };

    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true); setError(''); setAiPlans([]); setInferredTheme(''); setPlanPrompt(''); setVideos([]);
        setSearchedKeyword(keyword);

        try {
            const response = await fetch('/api/planner', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, period: 'month', duration: 'any', region, categoryId: '10' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '검색 중 오류가 발생했습니다.');
            setVideos(data.rawData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAiPlans = async () => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setIsGeneratingPlans(true); setAiPlans([]); setPlanPrompt('');

        // 💡 로컬 스토리지에서 커스텀 프롬프트 읽어오기
        const customPrompt = localStorage.getItem('custom_plan_prompt') || '';

        try {
            const response = await fetch('/api/music-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, youtubeData: videos, genre: genre.join(', '), vocalType, mainLang, subLangs, customPrompt }), // 💡 customPrompt 추가
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || '기획안 생성 실패');

            setAiPlans(data.plans || []);
            setInferredTheme(data.inferredTheme || '');
            setPlanPrompt(data.usedPrompt || ''); // 💡 사용된 프롬프트 저장

        } catch (err: any) {
            alert(`기획안 오류: ${err.message}`);
        } finally {
            setIsGeneratingPlans(false);
        }
    };

    const handleGenerateLyrics = async (index: number, title: string, musicStyle: string) => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: true } : plan));

        // 💡 로컬 스토리지에서 커스텀 프롬프트 읽어오기
        const customPrompt = localStorage.getItem('custom_lyrics_prompt') || '';

        try {
            const response = await fetch('/api/music-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, keyword: title, musicStyle, genre: genre.join(', '), vocalType, mainLang, subLangs, youtubeData: videos, customPrompt }), // 💡 customPrompt 추가
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || '가사 생성 실패');

            const generatedLyrics = Array.isArray(data.lyrics) ? data.lyrics.join('\n') : (data.lyrics || '결과를 받아오지 못했습니다.');
            const scenePrompts = data.scenePrompts || [];

            setAiPlans(prev => prev.map((plan, i) => {
                if (i === index) {
                    // 💡 버전에 사용된 프롬프트도 함께 저장
                    const newVersion = { lyrics: generatedLyrics, scenePrompts, usedPrompt: data.usedPrompt };
                    const updatedHistory = [...(plan.history || []), newVersion];
                    return { ...plan, lyrics: generatedLyrics, scenePrompts, history: updatedHistory, isGeneratingLyrics: false };
                }
                return plan;
            }));

        } catch (err: any) {
            alert(`가사 생성 오류: ${err.message}`);
            setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: false } : plan));
        }
    };

    return (
        <div className="animate-fadeIn relative pb-20">
            <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />

            {/* 💡 플로팅 액션 버튼 (우측 하단에 고정되어 스크롤을 따라다닙니다) */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
                <button
                    onClick={handleReset}
                    className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center text-2xl transition-all hover:scale-110 border border-slate-200 dark:border-slate-700 group relative"
                >
                    🔄
                    <span className="absolute right-16 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold shadow-lg pointer-events-none">
                        전체 초기화
                    </span>
                </button>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-14 h-14 bg-slate-900 dark:bg-slate-100 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center text-2xl transition-all hover:scale-110 group relative"
                >
                    ⚙️
                    <span className="absolute right-16 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold shadow-lg pointer-events-none">
                        API 설정
                    </span>
                </button>
            </div>

            <MusicSearchForm
                keyword={keyword} setKeyword={setKeyword}
                region={region} setRegion={setRegion}
                loading={loading} onSubmit={handleFetchYoutube}
            />

            {error && <div className="p-5 mb-8 bg-red-50 text-red-600 rounded-xl font-medium text-center shadow-sm border border-red-100">⚠️ {error}</div>}

            <MusicAiResult
                searchedKeyword={searchedKeyword}
                videos={videos}
                aiPlans={aiPlans}
                isGeneratingPlans={isGeneratingPlans}
                inferredTheme={inferredTheme}
                planPrompt={planPrompt} // 💡 프롬프트 전달
                genre={genre} setGenre={setGenre}
                vocalType={vocalType} setVocalType={setVocalType}
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}
                onGeneratePlans={handleGenerateAiPlans}
                onGenerateLyrics={handleGenerateLyrics}
            />
        </div>
    );
}