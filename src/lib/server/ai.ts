import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { defaultModelFor, isAiProvider, isModelForProvider } from '@/lib/ai-models';
import { optionalString, RequestError, type JsonObject, requiredString } from '@/lib/server/api';

export type AiProvider = 'gemini' | 'groq' | 'openai';

export function createAiModel(body: JsonObject): LanguageModel {
    const provider = requiredString(body, 'provider', 'AI 모델 제공자를 선택해주세요.');
    const apiKey = requiredString(body, 'apiKey', 'API 키가 설정되지 않았습니다.');
    if (!isAiProvider(provider)) throw new RequestError('지원하지 않는 AI 모델 제공자입니다.');
    const requestedModel = optionalString(body, 'model');
    const model = requestedModel || defaultModelFor(provider);
    if (!isModelForProvider(provider, model)) throw new RequestError('선택한 제공자에서 지원하지 않는 모델입니다.');

    if (provider === 'gemini') {
        return createGoogleGenerativeAI({ apiKey })(model);
    }
    if (provider === 'groq') {
        return createOpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' })(model);
    }
    if (provider === 'openai') {
        return createOpenAI({ apiKey })(model);
    }
    throw new RequestError('지원하지 않는 AI 모델 제공자입니다.');
}

export function parseJsonObject(text: string): Record<string, unknown> {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('AI 응답에서 JSON 객체를 찾지 못했습니다.');

    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('AI 응답이 JSON 객체 형식이 아닙니다.');
    }
    return parsed as Record<string, unknown>;
}

export function stringValue(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

export function stringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
