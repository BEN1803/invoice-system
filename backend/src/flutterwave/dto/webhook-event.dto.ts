export class WebhookEventDto {
  webhook_id: string;
  timestamp: number;
  type: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    customer: {
      id: string;
      email: string;
    };
    processor_response?: {
      type: string;
      code: string;
    };
  };
}
