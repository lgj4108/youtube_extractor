'use client';
import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
// 💡 경로 에러 수정: 같은 폴더(components)에 있는 파일들을 정상적으로 불러옵니다.
import MusicSearchForm from './MusicSearchForm';
import MusicAiResult, { MusicAiPlan } from './MusicAiResult';
import AiSettingsModal from './planner/AiSettingsModal';

export default function MusicVideoTab() {
    // 1. 검색 관련 상태
    const [keyword, setKeyword] = useState<string>('');
    const [searchedKeyword, setSearchedKeyword] = useState<string>('');
    const [region, setRegion] = useState<string>('KR');

    // 2. 가사 및 프로덕션 설정 상태
    const [genre, setGenre] = useState<string>('pop');
    const [mainLang, setMainLang] = useState<string>('KR');
    const [subLangs, setSubLangs] = useState<string[]>([]);

    // 3. 데이터 및 로딩 상태
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [aiPlans, setAiPlans] = useState<MusicAiPlan[]>([]);
    const [isGeneratingPlans, setIsGeneratingPlans] = useState<boolean>(false);
    const [inferredTheme, setInferredTheme] = useState<string>('');

    // 4. AI 설정 상태
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useState<string>('gemini');
    const [apiKey, setApiKey] = useState<string>('');

    useEffect(() => {
        const savedProvider = localStorage.getItem('ai_provider');
        const savedKey = localStorage.getItem('ai_api_key');
        if (savedProvider) setAiProvider(savedProvider);
        if (savedKey) setApiKey(savedKey);
    }, []);

    // 🚀 [1단계] 유튜브 트렌드 검색 (음악 카테고리 고정)
    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);
        setError('');
        setAiPlans([]);
        setInferredTheme('');
        setVideos([]);

        setSearchedKeyword(keyword);

        try {
            const response = await fetch('/api/planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    // 🚀 [2단계] AI 곡 기획안 3개 추출
    const handleGenerateAiPlans = async () => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setIsGeneratingPlans(true);
        setAiPlans([]);

        try {
            const response = await fetch('/api/music-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, youtubeData: videos, genre }),
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

    // 🚀 [3단계] 선택한 컨셉으로 가사 및 씬 프롬프트 생성
    const handleGenerateLyrics = async (index: number, title: string, musicStyle: string) => {
        if (!apiKey) { setIsSettingsOpen(true); return; }

        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: true } : plan));

        try {
            const response = await fetch('/api/music-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, keyword: title, musicStyle, genre, mainLang, subLangs, youtubeData: videos }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || '가사 생성 실패');

            const generatedLyrics = data.lyrics || '결과를 받아오지 못했습니다.';
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
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}

                onGeneratePlans={handleGenerateAiPlans}
                onGenerateLyrics={handleGenerateLyrics}
            />
        </div>
    );
}