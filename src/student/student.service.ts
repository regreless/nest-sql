import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  create(createStudentDto: CreateStudentDto) {
    return this.prisma.student.create({ data: createStudentDto });
  }

  findAll() {
    return this.prisma.student.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.student.findUniqueOrThrow({ where: { id } });
  }

  update(id: number, updateStudentDto: UpdateStudentDto) {
    return this.prisma.student.update({
      where: { id },
      data: updateStudentDto,
    });
  }

  remove(id: number) {
    return this.prisma.student.delete({ where: { id } });
  }

  async findCourses(id: number) {
    const { enrollments, ...student } =
      await this.prisma.student.findUniqueOrThrow({
        where: { id },
        include: {
          enrollments: {
            orderBy: { courseId: 'asc' },
            include: { course: true },
          },
        },
      });

    return {
      ...student,
      total: enrollments.length,
      courses: enrollments.map(({ course, enrolledAt }) => ({
        ...course,
        enrolledAt,
      })),
    };
  }

  enroll(studentId: number, courseId: number) {
    // 外键保证学生和课程存在，联合主键保证并发请求也不会重复选课。
    return this.prisma.enrollment.create({ data: { studentId, courseId } });
  }

  withdraw(studentId: number, courseId: number) {
    return this.prisma.enrollment.delete({
      where: { studentId_courseId: { studentId, courseId } },
    });
  }
}
