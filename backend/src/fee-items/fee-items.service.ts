import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FeeItemsService {
  constructor(private prisma: PrismaService) {}

  //create fee item
  async create(dto: any) {
    const existing = await this.prisma.feeItem.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Fee item already exists');
    }

    return this.prisma.feeItem.create({
      data: dto,
    });
  }

  //GET ALL ACTIVE FEE ITEMS
  async findAll() {
    return this.prisma.feeItem.findMany({
      where: { isActive: true },
    });
  }

  //UPDATE FEE ITEM
  async update(id: number, dto: any) {
    return this.prisma.feeItem.update({
      where: { id },
      data: dto,
    });
  }

  //Deactivate Fee Item
  async remove(id: number) {
    return this.prisma.feeItem.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
