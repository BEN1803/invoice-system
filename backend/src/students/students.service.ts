import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    regNo: string;
    password: string;
    firstName: string;
    lastName: string;
    className: string;
  }) {
    //Check if student exists
    const existing = await this.prisma.student.findUnique({
      where: { regNo: dto.regNo },
    });

    if (existing) {
      throw new BadRequestException(
        'Student with this registration number already exists',
      );
    }

    //hash password
    const hashedPassword = await hash(dto.password, 10);

    //create user and student
    const user = await this.prisma.user.create({
      data: {
        userId: dto.regNo,
        password: hashedPassword,
        role: 'STUDENT',
      },
    });

    const student = await this.prisma.student.create({
      data: {
        regNo: dto.regNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        className: dto.className,
        userId: user.id,
      },
    });

    return {
      message: 'Student created successfully',
      student,
    };
  }
}
