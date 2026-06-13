import { Test, TestingModule } from '@nestjs/testing';
import { FeeItemsService } from './fee-items.service';

describe('FeeItemsService', () => {
  let service: FeeItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeeItemsService],
    }).compile();

    service = module.get<FeeItemsService>(FeeItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
