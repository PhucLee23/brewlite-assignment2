import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { RestockDto } from './ingredients.dto';
import { IngredientsService } from './ingredients.service';

// Kho nguyên liệu, chỉ nhân viên quầy (FR-24)
@Controller('ingredients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF')
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  overview() {
    return this.ingredients.overview();
  }

  /** Nhập thêm hàng: chỉ cộng vào tồn kho, không tạo nguyên liệu mới */
  @Post(':id/restock')
  @HttpCode(200)
  restock(@Param('id', ParseIdPipe) id: number, @Body() dto: RestockDto) {
    return this.ingredients.restock(id, dto.amount);
  }
}
