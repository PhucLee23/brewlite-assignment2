import { Controller, Get, Param } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { ProductsService } from './products.service';

// Menu công khai, không cần đăng nhập (FR-01, FR-03)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll() {
    return this.products.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.products.findOne(id);
  }
}
