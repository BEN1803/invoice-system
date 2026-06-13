import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prismaService: PrismaService) {}

  //Create Invoice
  async create(dto: any) {
    //Get Student
    const Student = await this.prismaService.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!Student) {
      throw new BadRequestException('Student not found');
    }

    //get fee item
    const feeItem = await this.prismaService.feeItem.findUnique({
      where: { id: dto.feeiItemId },
    });

    if (!feeItem || !feeItem.isActive) {
      throw new BadRequestException('Fee item not found');
    }

    //Generate Control Number
    const controlNumber = 'CN' + Date.now();

    const invoice = await this.prismaService.invoice.create({
      data: {
        invoiceNumber: 'INV' + Date.now(),
        studentId: Student.id,
        feeItemId: feeItem.id,
        amount: feeItem.amount,
        paidAmount: 0,
        balance: feeItem.amount,
        controlNumber,
        status: 'PENDING',
      },
    });

    return {
      message: ' Invoice Created successfully',
      invoice,
    };
  }

  //GET STUDENT INVOICES
  async findByStudent(studentId: number) {
    return this.prismaService.invoice.findMany({
      where: { studentId },
      include: {
        feeItem: true,
        payments: true,
      },
    });
  }
}
