import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FeeItemsModule } from './fee-items/fee-items.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { FlutterwaveModule } from './flutterwave/flutterwave.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FeeItemsModule,
    AuthModule,
    StudentsModule,
    InvoicesModule,
    PaymentsModule,
    FlutterwaveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
