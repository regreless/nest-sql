import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.studentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIdPipe) id: number) {
    await this.studentService.remove(id);
  }

  @Get(':id/courses')
  findCourses(@Param('id', ParseIdPipe) id: number) {
    return this.studentService.findCourses(id);
  }

  @Post(':id/courses')
  enroll(@Param('id', ParseIdPipe) id: number, @Body() dto: EnrollCourseDto) {
    return this.studentService.enroll(id, dto.courseId);
  }

  @Delete(':id/courses/:courseId')
  @HttpCode(204)
  async withdraw(
    @Param('id', ParseIdPipe) id: number,
    @Param('courseId', ParseIdPipe) courseId: number,
  ) {
    await this.studentService.withdraw(id, courseId);
  }
}
