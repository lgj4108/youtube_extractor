'use client';
import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import MusicSearchForm from './MusicSearchForm';
import MusicAiResult, { MusicAiPlan } from './MusicAiResult';
import AiSettingsModal from './planner/AiSettingsModal';

export default function MusicVideoTab() {
    const [keyword, setKeyword] = useState<string>('');
    const [searchedKeyword, setSearchedKeyword] = useState<string>('');
    const [region, setRegion] = useState<string>('KR');

    // 💡 보컬 타입(vocalType) 상태 추가
    const [genre, setGenre] = useState<string>('pop');
    const [vocalType, setVocalType] = useState<string>('Auto');
    const [mainLang, setMainLang] = useState<string>('KR');
    const [subLangs, setSubLangs] = useState<string[]>([]);

    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [aiPlans, setAiPlans] = useState<MusicAiPlan[]>([]);
    const [isGeneratingPlans, setIsGeneratingPlans] = useState<boolean>(false);
    const [inferredTheme, setInferredTheme] = useState<string>('');

    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');
    const [apiKey, setApiKey] = useState<string>('');

    useEffect(() => {
        const savedProvider = localStorage.getItem('ai_provider');
        const savedKey = localStorage.getItem('ai_api_key');
        if (savedProvider) setAiProvider(savedProvider);
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true); setError(''); setAiPlans([]); setInferredTheme(''); setVideos([]);
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
        setIsGeneratingPlans(true); setAiPlans([]);

        try {
            const response = await fetch('/api/music-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                // 💡 API로 vocalType 전송
                body: JSON.stringify({ provider: aiProvider, apiKey, youtubeData: videos, genre, vocalType }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '기획안 생성 실패');

            setAiPlans(data.plans || []);
            setInferredTheme(data.inferredTheme || '');
        } catch (err: any) {
            alert(`기획안 오류: ${err.message}`);
        } finally {
            setIsGeneratingPlans(false);
        }
    };

    const handleGenerateLyrics = async (index: number, title: string, musicStyle: string) => {
        if (!apiKey) { setIsSettingsOpen(true); return; }

        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: true } : plan));

        try {
            const response = await fetch('/api/music-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                // 💡 API로 vocalType 전송
                body: JSON.stringify({ provider: aiProvider, apiKey, keyword: title, musicStyle, genre, vocalType, mainLang, subLangs, youtubeData: videos }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || '가사 생성 실패');

            // 💡 배열로 넘어온 가사를 텍스트로 합쳐줌
            const generatedLyrics = Array.isArray(data.lyrics) ? data.lyrics.join('\n') : (data.lyrics || '결과를 받아오지 못했습니다.');
            const scenePrompts = data.scenePrompts || [];

            setAiPlans(prev => prev.map((plan, i) => i === index ? {
                ...plan,
                lyrics: generatedLyrics,
                scenePrompts: scenePrompts,
                isGeneratingLyrics: false
            } : plan));

        } catch (err: any) {
            alert(`가사 생성 오류: ${err.message}`);
            setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: false } : plan));
        }
    };

    return (
        <div className="animate-fadeIn relative">
            <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />

            <div className="absolute -top-14 right-2 sm:right-6">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-200/50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-300 dark:hover:bg-slate-700">⚙️</button>
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

                genre={genre} setGenre={setGenre}
                vocalType={vocalType} setVocalType={setVocalType} // 💡 상태 전달
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}

                onGeneratePlans={handleGenerateAiPlans}
                onGenerateLyrics={handleGenerateLyrics}
            />
        </div>
    );
}