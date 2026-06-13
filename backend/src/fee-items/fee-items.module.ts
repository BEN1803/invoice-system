import { Module } from '@nestjs/common';
import { FeeItemsController } from './fee-items.controller';
import { FeeItemsService } from './fee-items.service';
import { FeeItemsService } from './fee-items.service';
import { FeeItemsController } from './fee-items.controller';

@Module({
  controllers: [FeeItemsController],
  providers: [FeeItemsService]
})
export class FeeItemsModule {}
