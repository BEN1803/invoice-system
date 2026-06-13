import { Module } from '@nestjs/common';
import { FeeItemsController } from './fee-items.controller';
import { FeeItemsService } from './fee-items.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeeItemsController],
  providers: [FeeItemsService]
})
export class FeeItemsModule {}
