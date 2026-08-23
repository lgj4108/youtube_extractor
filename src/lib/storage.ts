'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_EVENT = 'creator-studio-storage';

function emitStorageChange(key: string) {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
}

function subscribe(key: string, onStoreChange: () => void) {
    const handleStorage = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
    };
    const handleLocalStorage = (event: Event) => {
        if (event instanceof CustomEvent && event.detail === key) onStoreChange();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(STORAGE_EVENT, handleLocalStorage);
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(STORAGE_EVENT, handleLocalStorage);
    };
}

export function useStoredString(key: string, fallback: string) {
    const value = useSyncExternalStore(
        useCallback((onStoreChange) => subscribe(key, onStoreChange), [key]),
        useCallback(() => window.localStorage.getItem(key) ?? fallback, [fallback, key]),
        useCallback(() => fallback, [fallback]),
    );

    const setValue = useCallback((nextValue: string) => {
        window.localStorage.setItem(key, nextValue);
        emitStorageChange(key);
    }, [key]);

    return [value, setValue] as const;
}

export function useStoredJson<T>(key: string, fallback: T) {
    const serializedFallback = useMemo(() => JSON.stringify(fallback), [fallback]);
    const [rawValue, setRawValue] = useStoredString(key, serializedFallback);

    const value = useMemo(() => {
        try {
            return JSON.parse(rawValue) as T;
        } catch {
            return fallback;
        }
    }, [fallback, rawValue]);

    const setValue = useCallback((nextValue: T) => {
        setRawValue(JSON.stringify(nextValue));
    }, [setRawValue]);

    return [value, setValue] as const;
}
