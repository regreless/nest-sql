import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// 固定编号便于重复执行，也方便后续通过接口查询。
const students = [
  { studentNo: 'S001', name: '小明', courseCodes: ['C001', 'C002', 'C003'] },
  { studentNo: 'S002', name: '小红', courseCodes: ['C001', 'C004'] },
  { studentNo: 'S003', name: '小刚', courseCodes: ['C001', 'C002', 'C005'] },
  { studentNo: 'S004', name: '小丽', courseCodes: ['C001', 'C006'] },
  { studentNo: 'S005', name: '小华', courseCodes: ['C001', 'C007'] },
  { studentNo: 'S006', name: '小芳', courseCodes: ['C003', 'C008'] },
  { studentNo: 'S007', name: '小强', courseCodes: ['C002', 'C009'] },
  { studentNo: 'S008', name: '小雨', courseCodes: ['C004', 'C006'] },
  { studentNo: 'S009', name: '小林', courseCodes: ['C005', 'C008'] },
  { studentNo: 'S010', name: '小雪', courseCodes: [] },
];

const courses = [
  { code: 'C001', name: '影视' },
  { code: 'C002', name: '数学' },
  { code: 'C003', name: '英语' },
  { code: 'C004', name: '音乐' },
  { code: 'C005', name: '体育' },
  { code: 'C006', name: '美术' },
  { code: 'C007', name: '编程' },
  { code: 'C008', name: '历史' },
  { code: 'C009', name: '物理' },
  { code: 'C010', name: '摄影' },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure it in .env.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // 全部成功才提交；已存在的学生、课程和选课记录保持原样。
    await prisma.$transaction(async (tx) => {
      const courseIds = new Map<string, number>();
      for (const course of courses) {
        const saved = await tx.course.upsert({
          where: { code: course.code },
          update: {},
          create: course,
        });
        courseIds.set(course.code, saved.id);
      }

      for (const { courseCodes, ...student } of students) {
        const saved = await tx.student.upsert({
          where: { studentNo: student.studentNo },
          update: {},
          create: student,
        });

        for (const code of courseCodes) {
          const courseId = courseIds.get(code);
          if (courseId === undefined) {
            throw new Error(`Unknown course code: ${code}`);
          }
          await tx.enrollment.upsert({
            where: { studentId_courseId: { studentId: saved.id, courseId } },
            update: {},
            create: { studentId: saved.id, courseId },
          });
        }
      }
    });

    const [studentCount, courseCount, enrollmentCount] = await Promise.all([
      prisma.student.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
    ]);
    console.log('Seed 完成，数据库当前总数：', {
      students: studentCount,
      courses: courseCount,
      enrollments: enrollmentCount,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed 失败：', error);
  process.exitCode = 1;
});
