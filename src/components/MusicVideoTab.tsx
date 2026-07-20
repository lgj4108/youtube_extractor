'use client';
import { useState, FormEvent, useEffect } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import MusicSearchForm from './MusicSearchForm';
import MusicAiResult, { MusicAiPlan } from './MusicAiResult';
import AiSettingsModal from './planner/AiSettingsModal';

export default function MusicVideoTab() {
    // 검색 관련 상태
    const [keyword, setKeyword] = useState<string>('');
    const [searchedKeyword, setSearchedKeyword] = useState<string>(''); // 💡 검색된 키워드 피드백용
    const [region, setRegion] = useState<string>('KR');

    // 가사 설정 관련 상태
    const [genre, setGenre] = useState<string>('pop');
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

    // 트렌드 검색
    const handleFetchYoutube = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!keyword.trim()) return;
        setLoading(true); setError(''); setAiPlans([]); setInferredTheme(''); setVideos([]);

        // 💡 폼에 입력된 값을 실제로 '검색 완료된 키워드'로 저장
        setSearchedKeyword(keyword);

        try {
            const response = await fetch('/api/planner', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, period: 'month', duration: 'any', region }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '오류 발생');
            setVideos(data.rawData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // AI 기획안 생성 (MusicVideoTab.tsx 내부)
    const handleGenerateAiPlans = async () => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setIsGeneratingPlans(true); setAiPlans([]);

        try {
            // 💡 기존 '/api/generate' 에서 '/api/music-plan' 으로 변경!!
            const response = await fetch('/api/music-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, apiKey, youtubeData: videos }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setAiPlans(data.plans || []);
            setInferredTheme(data.inferredTheme || '');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsGeneratingPlans(false);
        }
    };

    // 가사 생성 로직 (musicStyle 인자 추가)
    const handleGenerateLyrics = async (index: number, title: string, musicStyle: string) => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: true } : plan));

        try {
            const response = await fetch('/api/music-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                // 💡 musicStyle을 백엔드로 함께 전송하여 가사가 해당 무드에 더 어울리게 만듦
                body: JSON.stringify({ provider: aiProvider, apiKey, keyword: title, musicStyle, genre, mainLang, subLangs, youtubeData: videos }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            const generatedLyrics = data.lyrics || '결과를 받아오지 못했습니다.';
            const scenePrompts = data.scenePrompts || [];

            setAiPlans(prev => prev.map((plan, i) => i === index ? {
                ...plan,
                lyrics: generatedLyrics,
                scenePrompts: scenePrompts,
                isGeneratingLyrics: false
            } : plan));
        } catch (err: any) {
            alert(`가사 생성 실패: ${err.message}`);
            setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: false } : plan));
        }
    };

    return (
        <div className="animate-fadeIn relative">
            <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} apiKey={apiKey} setApiKey={setApiKey} />

            <div className="absolute -top-14 right-2 sm:right-6">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-slate-200/50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">⚙️</button>
            </div>

            {/* 1단계: 깔끔해진 검색 폼 */}
            <MusicSearchForm
                keyword={keyword} setKeyword={setKeyword}
                region={region} setRegion={setRegion}
                loading={loading} onSubmit={handleFetchYoutube}
            />

            {error && <div className="p-5 mb-8 bg-red-50 text-red-600 rounded-xl font-medium text-center">⚠️ {error}</div>}

            {/* 2~3단계: 검색 결과 피드백 + 기획안 + 가사 세팅 및 출력 */}
            <MusicAiResult
                searchedKeyword={searchedKeyword}
                videos={videos}
                aiPlans={aiPlans}
                isGeneratingPlans={isGeneratingPlans}
                inferredTheme={inferredTheme}

                // 가사 설정을 위한 상태값 넘겨주기
                genre={genre} setGenre={setGenre}
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}

                onGeneratePlans={handleGenerateAiPlans}
                onGenerateLyrics={handleGenerateLyrics}
            />
        </div>
    );
}