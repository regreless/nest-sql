import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCourseDto: CreateCourseDto) {
    return this.prisma.course.create({ data: createCourseDto });
  }

  findAll() {
    return this.prisma.course.findMany({ orderBy: { id: 'asc' } });
  }

  findOne(id: number) {
    return this.prisma.course.findUniqueOrThrow({ where: { id } });
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: updateCourseDto });
  }

  remove(id: number) {
    return this.prisma.course.delete({ where: { id } });
  }

  async findStudents(id: number) {
    const { enrollments, ...course } =
      await this.prisma.course.findUniqueOrThrow({
        where: { id },
        include: {
          enrollments: {
            orderBy: { studentId: 'asc' },
            include: { student: true },
          },
        },
      });

    return {
      ...course,
      total: enrollments.length,
      students: enrollments.map(({ student, enrolledAt }) => ({
        ...student,
        enrolledAt,
      })),
    };
  }
}
