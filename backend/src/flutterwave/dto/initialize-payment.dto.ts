export class InitializeCardPaymentDto {
  invoiceId: number;
  amount: number;
  email: string;
  card: {
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
  };
  name: {
    first: string;
    last: string;
  };
  phone?: {
    country_code: string;
    number: string;
  };
  redirect_url?: string;
}
