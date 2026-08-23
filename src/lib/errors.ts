export function getErrorMessage(error: unknown, fallback = '알 수 없는 오류가 발생했습니다.') {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
}
