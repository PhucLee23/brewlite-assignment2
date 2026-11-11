import { amountForSize, cupNeeds, RecipeLine, servingsLeft, stockMap } from './inventory';

const line = (ingredientId: number, amount: number, stock: number, scalesWithSize = true): RecipeLine => ({
  ingredientId,
  amount,
  ingredient: { name: `NL${ingredientId}`, stock, scalesWithSize },
});

// UT-05: số ly còn bán được tính từ nguyên liệu theo công thức (BR-09)
describe('UT-05 tồn kho nguyên liệu', () => {
  const coldBrew = [line(1, 200, 1000), line(2, 1, 500, false)];

  it('size M dùng 125%, size L dùng 150% công thức size S, làm tròn lên', () => {
    expect(amountForSize(line(1, 18, 0), 'S')).toBe(18);
    expect(amountForSize(line(1, 18, 0), 'M')).toBe(23);
    expect(amountForSize(line(1, 18, 0), 'L')).toBe(27);
  });

  it('ly nhựa luôn 1 cái mỗi ly bất kể size', () => {
    expect(amountForSize(line(2, 1, 0, false), 'L')).toBe(1);
  });

  it('nguyên liệu hết trước quyết định số ly: Cold brew 1.000 ml còn 5 ly S, 4 ly M, 3 ly L', () => {
    const stock = stockMap(coldBrew);
    expect(servingsLeft(cupNeeds(coldBrew, 'S'), stock)).toBe(5);
    expect(servingsLeft(cupNeeds(coldBrew, 'M'), stock)).toBe(4);
    expect(servingsLeft(cupNeeds(coldBrew, 'L'), stock)).toBe(3);
  });

  it('topping cộng thêm nguyên liệu vào ly; dùng chung nguyên liệu với món thì cộng dồn', () => {
    const latte = [line(3, 18, 100), line(4, 200, 10000)];
    const shot = [line(3, 18, 100)];
    expect(cupNeeds(latte, 'S', [shot]).get(3)).toBe(36);
    expect(servingsLeft(cupNeeds(latte, 'S', [shot]), stockMap(latte, shot))).toBe(2);
  });

  it('món chưa có công thức thì không bán được', () => {
    expect(servingsLeft(cupNeeds([], 'S'), new Map())).toBe(0);
  });
});
