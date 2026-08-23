'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/http';

interface TrendResponse {
    keywords?: string[];
}

function shuffle<T>(items: T[]) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
}

export function useTrendKeywords(categoryId?: string) {
    const [recommendedWords, setRecommendedWords] = useState<string[]>([]);
    const [displayWords, setDisplayWords] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;
        const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';

        fetchJson<TrendResponse>(`/api/trends${query}`, { signal: controller.signal })
            .then((data) => {
                if (!isCurrent) return;
                const keywords = Array.isArray(data.keywords) ? data.keywords : [];
                setRecommendedWords(keywords);
                setDisplayWords(keywords.slice(0, 6));
            })
            .catch((error: unknown) => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('트렌드 키워드를 불러오지 못했습니다.', error);
                }
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });

        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [categoryId]);

    const refresh = useCallback(() => {
        setDisplayWords(shuffle(recommendedWords).slice(0, 6));
    }, [recommendedWords]);

    return { displayWords, hasKeywords: recommendedWords.length > 0, isLoading, refresh };
}
