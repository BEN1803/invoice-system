import { Test, TestingModule } from '@nestjs/testing';
import { FeeItemsController } from './fee-items.controller';

describe('FeeItemsController', () => {
  let controller: FeeItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeeItemsController],
    }).compile();

    controller = module.get<FeeItemsController>(FeeItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
