import 'server-only';

import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';

export type JsonObject = Record<string, unknown>;

export class RequestError extends Error {
    constructor(message: string, readonly status = 400) {
        super(message);
        this.name = 'RequestError';
    }
}

export async function readJsonObject(request: Request): Promise<JsonObject> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new RequestError('요청 본문이 올바른 JSON 형식이 아닙니다.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new RequestError('요청 본문은 JSON 객체여야 합니다.');
    }
    return body as JsonObject;
}

export function requiredString(body: JsonObject, key: string, message: string) {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim()) throw new RequestError(message);
    return value.trim();
}

export function optionalString(body: JsonObject, key: string, fallback = '') {
    const value = body[key];
    return typeof value === 'string' ? value.trim() : fallback;
}

export function optionalStringArray(body: JsonObject, key: string) {
    const value = body[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function errorResponse(error: unknown, fallback: string, logLabel: string) {
    const message = getErrorMessage(error, fallback);
    const isExpected = error instanceof RequestError;
    const status = isExpected ? error.status : 500;

    if (!isExpected) console.error(`${logLabel}:`, error);
    return NextResponse.json({ error: isExpected ? message : fallback }, { status });
}
