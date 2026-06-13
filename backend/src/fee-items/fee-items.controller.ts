import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { FeeItemsService } from './fee-items.service';
import { CreateFeeItemDto } from './dto/create-fee-item.dto';

@Controller('fee-items')
export class FeeItemsController {
  constructor(private feeItemsService: FeeItemsService) {}

  @Post()
  create(@Body() dto: CreateFeeItemDto) {
    return this.feeItemsService.create(dto);
  }

  @Get()
  findAll() {
    return this.feeItemsService.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.feeItemsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feeItemsService.remove(Number(id));
  }
}
