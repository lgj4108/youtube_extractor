import { getErrorMessage } from '@/lib/errors';

interface ErrorPayload {
    error?: unknown;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    const contentType = response.headers.get('content-type') ?? '';
    const payload: unknown = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'error' in payload
            ? (payload as ErrorPayload).error
            : payload;
        throw new Error(typeof message === 'string' && message.trim()
            ? message
            : `요청을 처리하지 못했습니다. (${response.status})`);
    }

    return payload as T;
}

export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        throw new Error(getErrorMessage(error, '클립보드 복사에 실패했습니다.'));
    }
}
