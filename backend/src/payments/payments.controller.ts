import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InitializeCardPaymentDto } from 'src/flutterwave/dto/initialize-payment.dto';
import { WebhookEventDto } from 'src/flutterwave/dto/webhook-event.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post('initialize')
  initializeCardPayment(@Body() dto: InitializeCardPaymentDto) {
    return this.paymentsService.initializeCardPayment(dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() event: WebhookEventDto) {
    return this.paymentsService.handleWebhook(event);
  }

  @Get('invoice/:id')
  findByInvoice(@Param('id') id: string) {
    return this.paymentsService.findByInvoice(Number(id));
  }

  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.paymentsService.findByReference(reference);
  }
}
