import { IsInt, Max, Min } from 'class-validator';

export class EnrollCourseDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  courseId: number;
}
