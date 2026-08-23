'use client';
import { useState, FormEvent } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import MusicSearchForm from './music/MusicSearchForm';
import MusicAiResult, { MusicAiPlan } from './music/MusicAiResult';
import AiSettingsModal from './planner/AiSettingsModal';
import { fetchJson } from '@/lib/http';
import { getErrorMessage } from '@/lib/errors';
import { useStoredJson, useStoredString } from '@/lib/storage';
import { defaultModelFor } from '@/lib/ai-models';

const DEFAULT_GENRES = ['K-POP'];
const EMPTY_LANGUAGES: string[] = [];
const EMPTY_MUSIC_PLANS: MusicAiPlan[] = [];

export default function MusicVideoTab() {
    const [keyword, setKeyword] = useStoredString('music_keyword', '');
    const [region, setRegion] = useStoredString('music_region', 'KR');

    const [genre, setGenre] = useStoredJson<string[]>('music_genres', DEFAULT_GENRES);
    const [vocalType, setVocalType] = useStoredString('music_vocal_type', 'Auto');
    const [mainLang, setMainLang] = useStoredString('music_main_language', 'KR');
    const [subLangs, setSubLangs] = useStoredJson<string[]>('music_sub_languages', EMPTY_LANGUAGES);

    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [aiPlans, setAiPlans] = useStoredJson<MusicAiPlan[]>('music_ai_plans', EMPTY_MUSIC_PLANS);
    const [isGeneratingPlans, setIsGeneratingPlans] = useState<boolean>(false);
    const [inferredTheme, setInferredTheme] = useStoredString('music_inferred_theme', '');

    const [planPrompt, setPlanPrompt] = useStoredString('music_plan_prompt', '');

    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [aiProvider, setAiProvider] = useStoredString('ai_provider', 'gemini');
    const [aiModel, setAiModel] = useStoredString('ai_model', defaultModelFor(aiProvider));
    const [apiKey, setApiKey] = useStoredString('ai_api_key', '');

    const handleReset = () => {
        if (window.confirm('현재까지의 모든 기획 및 작업 내역이 초기화됩니다. 처음부터 다시 시작하시겠습니까?')) {
            setKeyword(''); setVideos([]); setError('');
            setAiPlans([]); setInferredTheme(''); setPlanPrompt('');
            setGenre(['K-POP']); setVocalType('Auto'); setMainLang('KR'); setSubLangs([]);
        }
    };

    const handleFetchYoutube = async () => {
        if (!keyword.trim()) return;

        setLoading(true); setError('');
        try {
            const data = await fetchJson<{ rawData?: YouTubeVideo[] }>('/api/planner', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, period: 'month', duration: 'any', region, categoryId: '10' }),
            });
            setVideos(data.rawData || []);
            setAiPlans([]); setInferredTheme(''); setPlanPrompt('');
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError, '검색 중 오류가 발생했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAiPlans = async (youtubeData: YouTubeVideo[] = videos) => {
        if (!keyword.trim()) {
            setError('만들고 싶은 음악의 키워드를 먼저 입력해주세요.');
            return;
        }
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setIsGeneratingPlans(true); setError('');

        const customPrompt = localStorage.getItem('custom_plan_prompt') || '';

        try {
            const data = await fetchJson<{ plans?: MusicAiPlan[]; inferredTheme?: string; usedPrompt?: string }>('/api/music-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, model: aiModel, apiKey, creativeKeyword: keyword.trim(), youtubeData, genre: genre.join(', '), vocalType, mainLang, subLangs, customPrompt }),
            });

            setAiPlans(data.plans || []);
            setInferredTheme(data.inferredTheme || '');
            setPlanPrompt(data.usedPrompt || '');

        } catch (requestError: unknown) {
            setError(`기획안 오류: ${getErrorMessage(requestError)}`);
        } finally {
            setIsGeneratingPlans(false);
        }
    };

    const handleDirectGenerate = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setVideos([]);
        setInferredTheme('');
        void handleGenerateAiPlans([]);
    };

    const handleGenerateLyrics = async (index: number, title: string, musicStyle: string) => {
        if (!apiKey) { setIsSettingsOpen(true); return; }
        setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: true } : plan));

        const customPrompt = localStorage.getItem('custom_lyrics_prompt') || '';

        try {
            const data = await fetchJson<{ lyrics?: string[] | string; scenePrompts?: string[]; usedPrompt?: string }>('/api/music-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: aiProvider, model: aiModel, apiKey, keyword: title, musicStyle, genre: genre.join(', '), vocalType, mainLang, subLangs, customPrompt }),
            });

            const generatedLyrics = Array.isArray(data.lyrics) ? data.lyrics.join('\n') : (data.lyrics || '결과를 받아오지 못했습니다.');
            const scenePrompts = data.scenePrompts || [];

            setAiPlans(prev => prev.map((plan, i) => {
                if (i === index) {
                    const newVersion = { lyrics: generatedLyrics, scenePrompts, usedPrompt: data.usedPrompt };
                    const updatedHistory = [...(plan.history || []), newVersion];
                    return { ...plan, lyrics: generatedLyrics, scenePrompts, history: updatedHistory, isGeneratingLyrics: false };
                }
                return plan;
            }));

        } catch (requestError: unknown) {
            setError(`가사 생성 오류: ${getErrorMessage(requestError)}`);
            setAiPlans(prev => prev.map((plan, i) => i === index ? { ...plan, isGeneratingLyrics: false } : plan));
        }
    };

    return (
        <div className="animate-fadeIn relative pb-20">
            {isSettingsOpen && <AiSettingsModal onClose={() => setIsSettingsOpen(false)} provider={aiProvider} setProvider={setAiProvider} model={aiModel} setModel={setAiModel} apiKey={apiKey} setApiKey={setApiKey} />}

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
                loading={loading} isGeneratingPlans={isGeneratingPlans}
                onDirectGenerate={handleDirectGenerate} onTrendSearch={handleFetchYoutube}
            />

            {error && <div className="p-5 mb-8 bg-red-50 text-red-600 rounded-xl font-medium text-center shadow-sm border border-red-100">⚠️ {error}</div>}

            <MusicAiResult
                aiPlans={aiPlans}
                isGeneratingPlans={isGeneratingPlans}
                inferredTheme={inferredTheme}
                planPrompt={planPrompt}
                genre={genre} setGenre={setGenre}
                vocalType={vocalType} setVocalType={setVocalType}
                mainLang={mainLang} setMainLang={setMainLang}
                subLangs={subLangs} setSubLangs={setSubLangs}
                onGeneratePlans={() => void handleGenerateAiPlans()}
                onGenerateLyrics={handleGenerateLyrics}
            />
        </div>
    );
}
