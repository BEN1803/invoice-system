import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { InitializeCardPaymentDto } from 'src/flutterwave/dto/initialize-payment.dto';
import { WebhookEventDto } from 'src/flutterwave/dto/webhook-event.dto';
import { InvoiceStatus } from 'src/generated/prisma/enums';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private flw: FlutterwaveService,
    private config: ConfigService<Record<string, string>>,
  ) {}

  async create(dto: {
    invoiceId: number;
    amount: number;
    method: 'BANK' | 'MOBILE_MONEY';
    reference: string;
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { feeItem: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        status: 'SUCCESS',
      },
    });

    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newBalance = invoice.amount - newPaidAmount;

    let status: InvoiceStatus = InvoiceStatus.PENDING;
    if (newPaidAmount >= invoice.amount) {
      status = InvoiceStatus.PAID;
    } else if (newPaidAmount > 0) {
      status = InvoiceStatus.PARTIAL;
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status,
      },
    });

    return {
      message: 'Payment successful',
      payment,
      updatedInvoice: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status,
      },
    };
  }

  async initializeCardPayment(dto: InitializeCardPaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { feeItem: true, student: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (dto.amount > invoice.balance) {
      throw new BadRequestException(
        `Amount exceeds outstanding balance of ${invoice.balance}`,
      );
    }

    const reference = `inv-${invoice.invoiceNumber}-${Date.now()}`;

    // 1. Create or find customer
    const customerRes = await this.flw.createCustomer({
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
    });
    const customerId = customerRes.data.id;

    // 2. Encrypt card details
    const nonce = this.flw.generateNonce();
    const { number, expiry_month, expiry_year, cvv } = dto.card;

    const paymentMethodRes = await this.flw.createPaymentMethod({
      type: 'card',
      card: {
        encrypted_card_number: this.flw.encrypt(number, nonce),
        encrypted_expiry_month: this.flw.encrypt(expiry_month, nonce),
        encrypted_expiry_year: this.flw.encrypt(expiry_year, nonce),
        encrypted_cvv: this.flw.encrypt(cvv, nonce),
        nonce,
      },
    });
    const paymentMethodId = paymentMethodRes.data.id;

    // 3. Create charge
    const chargeRes = await this.flw.createCharge({
      reference,
      currency: 'NGN',
      amount: dto.amount,
      customer_id: customerId,
      payment_method_id: paymentMethodId,
      redirect_url: dto.redirect_url,
      meta: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        student_name: `${invoice.student.firstName} ${invoice.student.lastName}`,
      },
    });

    // 4. Store pending payment
    await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: dto.amount,
        reference,
        method: 'CARD',
        flwChargeId: chargeRes.data.id,
        status: 'PENDING',
      },
    });

    return {
      message: 'Payment initialized',
      charge_id: chargeRes.data.id,
      reference,
      next_action: chargeRes.data.next_action,
      authorization_url: chargeRes.data.next_action?.redirect_url?.url ?? null,
    };
  }

  async handleWebhook(event: WebhookEventDto) {
    if (event.type === 'charge.completed') {
      const { id: flwChargeId, status, reference } = event.data;

      const payment = await this.prisma.payment.findFirst({
        where: { flwChargeId },
        include: { invoice: true },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for charge ${flwChargeId}`);
        return { message: 'Payment not found' };
      }

      if (payment.status === 'SUCCESS') {
        return { message: 'Payment already processed' };
      }

      if (status === 'succeeded') {
        // Update payment status
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS' },
        });

        // Update invoice
        const invoice = payment.invoice;
        const newPaidAmount = invoice.paidAmount + payment.amount;
        const newBalance = invoice.amount - newPaidAmount;

        let invoiceStatus: InvoiceStatus = InvoiceStatus.PENDING;
        if (newPaidAmount >= invoice.amount) {
          invoiceStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          invoiceStatus = InvoiceStatus.PARTIAL;
        }

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: invoiceStatus,
          },
        });

        this.logger.log(
          `Payment ${reference} succeeded. Invoice ${invoice.invoiceNumber} updated.`,
        );

        return {
          message: 'Payment processed',
          invoice_status: invoiceStatus,
          paid_amount: newPaidAmount,
          balance: newBalance,
        };
      }

      if (status === 'failed') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        return { message: 'Payment failed' };
      }
    }

    return { message: 'Event ignored' };
  }

  async findByInvoice(invoiceId: number) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReference(reference: string) {
    return this.prisma.payment.findFirst({
      where: { reference },
      include: { invoice: true },
    });
  }
}
