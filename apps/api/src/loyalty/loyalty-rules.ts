/** BR-05: 1 điểm cho mỗi 1.000đ của tổng tiền đơn, làm tròn xuống */
export function pointsFor(total: number): number {
  return Math.max(0, Math.floor(total / 1000));
}
