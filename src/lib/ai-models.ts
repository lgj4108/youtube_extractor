export const AI_MODELS = {
    gemini: [
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', badge: '추천', description: '속도와 품질의 균형이 좋은 최신 안정 모델' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', badge: '고품질', description: '복잡한 기획과 긴 가사 생성에 적합' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', badge: '경제적', description: '빠르고 가벼운 반복 생성에 적합' },
    ],
    openai: [
        { id: 'gpt-5-mini', name: 'GPT-5 mini', badge: '추천', description: '품질과 비용의 균형이 좋은 범용 모델' },
        { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', badge: '빠른 응답', description: '지시를 잘 따르는 빠른 비추론 모델' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini', badge: '경제적', description: '간단한 초안과 반복 작업에 적합' },
    ],
    groq: [
        { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', badge: '추천', description: '복잡한 기획에 적합한 고품질 오픈 모델' },
        { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', badge: '최고 속도', description: '빠른 초안과 반복 생성에 적합' },
        { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B', badge: '대안', description: '다국어 콘텐츠 생성에 활용하기 좋은 모델' },
    ],
} as const;

export type AiProviderId = keyof typeof AI_MODELS;

export function isAiProvider(value: string): value is AiProviderId {
    return value in AI_MODELS;
}

export function defaultModelFor(provider: string) {
    return isAiProvider(provider) ? AI_MODELS[provider][0].id : AI_MODELS.gemini[0].id;
}

export function isModelForProvider(provider: string, model: string) {
    return isAiProvider(provider) && AI_MODELS[provider].some((item) => item.id === model);
}

export function modelName(provider: string, model: string) {
    if (!isAiProvider(provider)) return model;
    return AI_MODELS[provider].find((item) => item.id === model)?.name ?? model;
}
