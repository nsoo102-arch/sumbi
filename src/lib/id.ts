/** insecure context(HTTP LAN)에서도 동작하는 ID 생성 */
export function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // http://172.x.x.x 처럼 secure context가 아니면 실패할 수 있음
    }
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
