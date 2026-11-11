const vnd = new Intl.NumberFormat('vi-VN');

/** 45000 → "45.000đ" */
export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}đ`;
}
