import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(dto: { regNo: string; password: string }) {
    //find student
    const student = await this.prisma.student.findUnique({
      where: { regNo: dto.regNo },
      include: { user: true },
    });

    if (!student || !student.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    //compare password
    const isMatch = await compare(dto.password, student.user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid Password');
    }

    return {
      message: 'Login successful',
      student: {
        id: student.id,
        regNo: student.regNo,
        name: student.firstName + ' ' + student.lastName,
        status: student.status,
      },
    };
  }
}
