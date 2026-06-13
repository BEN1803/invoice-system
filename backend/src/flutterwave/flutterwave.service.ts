import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface FlwErrorResponse {
  error?: {
    message?: string;
  };
}

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly encryptionKey: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService<Record<string, string>>) {
    this.clientId = this.config.get('FLW_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get('FLW_CLIENT_SECRET') ?? '';
    this.encryptionKey = this.config.get('FLW_ENCRYPTION_KEY') ?? '';
    this.baseUrl =
      this.config.get(
        'FLW_BASE_URL',
        'https://developersandbox-api.flutterwave.com',
      ) ?? 'https://developersandbox-api.flutterwave.com';
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    const url =
      'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Token refresh failed: ${res.status} ${text}`);
      throw new Error('Failed to obtain Flutterwave access token');
    }

    const data: TokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    this.logger.log('Flutterwave access token refreshed');
    return this.accessToken;
  }

  encrypt(plaintext: string, nonce: string): string {
    const keyBytes = Buffer.from(this.encryptionKey, 'base64');
    const iv = Buffer.from(nonce, 'utf8');
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv, {
      authTagLength: 16,
    });
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([encrypted, tag]).toString('base64');
  }

  generateNonce(length = 12): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.randomBytes(length))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Trace-Id': crypto.randomUUID(),
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: T & FlwErrorResponse = await res.json();
    if (!res.ok) {
      this.logger.error(`Flutterwave API error: ${res.status}`, data);
      throw new Error(data?.error?.message || 'Flutterwave API request failed');
    }
    return data;
  }

  async createCustomer(params: {
    email: string;
    name: { first: string; last: string };
    phone?: { country_code: string; number: string };
  }) {
    return this.request<{
      status: string;
      data: { id: string; email: string };
    }>('POST', '/customers', params);
  }

  async createPaymentMethod(params: {
    type: 'card';
    card: {
      encrypted_card_number: string;
      encrypted_expiry_month: string;
      encrypted_expiry_year: string;
      encrypted_cvv: string;
      nonce: string;
    };
  }) {
    return this.request<{
      status: string;
      data: { id: string; type: string };
    }>('POST', '/payment-methods', params);
  }

  async createCharge(params: {
    reference: string;
    currency: string;
    amount: number;
    customer_id: string;
    payment_method_id: string;
    redirect_url?: string;
    meta?: Record<string, unknown>;
  }) {
    return this.request<{
      status: string;
      data: {
        id: string;
        status: string;
        next_action?: {
          type: string;
          authorization?: { type: string };
          redirect_url?: { url: string };
        };
      };
    }>('POST', '/charges', params);
  }

  async updateCharge(
    chargeId: string,
    params: {
      authorization: {
        type: string;
        pin?: { nonce: string; encrypted_pin: string };
      };
    },
  ) {
    return this.request<{
      status: string;
      data: {
        id: string;
        status: string;
        next_action?: {
          type: string;
          redirect_url?: { url: string };
        };
      };
    }>('PUT', `/charges/${chargeId}`, params);
  }

  async getCharge(chargeId: string) {
    return this.request<{
      status: string;
      data: { id: string; status: string };
    }>('GET', `/charges/${chargeId}`);
  }

  verifyWebhookSignature(
    signature: string,
    body: string,
    secret: string,
  ): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return signature === expected;
  }
}
