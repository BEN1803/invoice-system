export class CreatePaymentDto {
  invoiceId: number;
  amount: number;
  method: 'BANK' | 'MOBILE_MONEY';
  reference: string;
}
