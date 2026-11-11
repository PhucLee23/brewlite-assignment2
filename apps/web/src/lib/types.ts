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

export interface ProductDetail extends Product {
  sizes: { size: Size; surcharge: number; price: number }[];
  toppings: Topping[];
}
