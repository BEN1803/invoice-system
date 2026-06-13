import { Module } from '@nestjs/common';
import { FeeItemsController } from './fee-items.controller';
import { FeeItemsService } from './fee-items.service';

@Module({
  controllers: [FeeItemsController],
  providers: [FeeItemsService]
})
export class FeeItemsModule {}
