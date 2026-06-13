export class CreateFeeItemDto {
  name: string;
  description: string;
  amount: number;
  type: 'SCHOOL_FEES' | 'OTHER_FEES';
}
