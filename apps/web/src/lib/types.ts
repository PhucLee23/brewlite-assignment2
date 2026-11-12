// Kiểu dữ liệu trả về từ API (khớp docs/diagrams/class-domain.puml)

export type Size = 'S' | 'M' | 'L';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

// `stock` của size và topping là số ly / số phần còn làm được, tính từ nguyên liệu (BR-09)
export interface ProductDetail extends Product {
  sizes: { size: Size; surcharge: number; price: number; stock: number }[];
  toppings: (Topping & { stock: number })[];
}
