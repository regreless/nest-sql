import { randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { Course, Student } from '../src/generated/prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('学生选课接口（真实数据库）', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let prefix: string;
  let student: Student;
  let course: Course;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    prefix = `test_${randomBytes(6).toString('hex')}_`;
    student = await prisma.student.create({
      data: { studentNo: `${prefix}S1`, name: '测试学生' },
    });
    course = await prisma.course.create({
      data: { code: `${prefix}C1`, name: '测试课程' },
    });
  });

  afterEach(async () => {
    if (!prisma || !prefix) return;
    // 仅清理本次测试创建的数据，选课记录由外键级联删除。
    await prisma.student.deleteMany({
      where: { studentNo: { startsWith: prefix } },
    });
    await prisma.course.deleteMany({ where: { code: { startsWith: prefix } } });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('空关系返回空数组和 total: 0', async () => {
    const a = await request(app.getHttpServer())
      .get(`/student/${student.id}/courses`)
      .expect(200);
    expect(a.body).toMatchObject({ id: student.id, total: 0, courses: [] });
    const b = await request(app.getHttpServer())
      .get(`/course/${course.id}/students`)
      .expect(200);
    expect(b.body).toMatchObject({ id: course.id, total: 0, students: [] });
  });

  it('选课、双向查询、重复选课、退课完整流程', async () => {
    const url = `/student/${student.id}/courses`;
    const enrolled = await request(app.getHttpServer())
      .post(url)
      .send({ courseId: course.id })
      .expect(201);
    expect(enrolled.body).toMatchObject({
      studentId: student.id,
      courseId: course.id,
      enrolledAt: expect.any(String) as string,
    });
    await request(app.getHttpServer())
      .post(url)
      .send({ courseId: course.id })
      .expect(409);
    const courses = await request(app.getHttpServer()).get(url).expect(200);
    expect(courses.body).toMatchObject({
      total: 1,
      courses: [expect.objectContaining({ id: course.id, name: course.name })],
    });
    const students = await request(app.getHttpServer())
      .get(`/course/${course.id}/students`)
      .expect(200);
    expect(students.body).toMatchObject({
      total: 1,
      students: [
        expect.objectContaining({ id: student.id, name: student.name }),
      ],
    });
    await request(app.getHttpServer())
      .delete(`${url}/${course.id}`)
      .expect(204);
    const empty = await request(app.getHttpServer()).get(url).expect(200);
    expect(empty.body).toMatchObject({ total: 0, courses: [] });
    await request(app.getHttpServer())
      .delete(`${url}/${course.id}`)
      .expect(404);
  });

  it('并发重复选课仅成功一次', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(`/student/${student.id}/courses`)
          .send({ courseId: course.id }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.enrollment.count({ where: { studentId: student.id } }),
    ).toBe(1);
  });

  it('一名学生可选多门课，一门课可被多名学生选择', async () => {
    const otherStudent = await prisma.student.create({
      data: { studentNo: `${prefix}S2`, name: '另一名学生' },
    });
    const otherCourse = await prisma.course.create({
      data: { code: `${prefix}C2`, name: '另一门课程' },
    });
    for (const [studentId, courseId] of [
      [student.id, course.id],
      [student.id, otherCourse.id],
      [otherStudent.id, course.id],
    ]) {
      await request(app.getHttpServer())
        .post(`/student/${studentId}/courses`)
        .send({ courseId })
        .expect(201);
    }
    const courses = await request(app.getHttpServer())
      .get(`/student/${student.id}/courses`)
      .expect(200);
    expect(courses.body).toMatchObject({
      total: 2,
      courses: [
        expect.objectContaining({ id: course.id }),
        expect.objectContaining({ id: otherCourse.id }),
      ],
    });
    const students = await request(app.getHttpServer())
      .get(`/course/${course.id}/students`)
      .expect(200);
    expect(students.body).toMatchObject({
      total: 2,
      students: [
        expect.objectContaining({ id: student.id }),
        expect.objectContaining({ id: otherStudent.id }),
      ],
    });
  });

  it('不存在的学生、课程或选课记录返回 404', async () => {
    const missing = 2147483647;
    for (const url of [
      `/student/${missing}`,
      `/course/${missing}`,
      `/student/${missing}/courses`,
      `/course/${missing}/students`,
    ]) {
      await request(app.getHttpServer()).get(url).expect(404);
    }
    await request(app.getHttpServer())
      .post(`/student/${missing}/courses`)
      .send({ courseId: course.id })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/student/${student.id}/courses`)
      .send({ courseId: missing })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/student/${student.id}/courses/${course.id}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/student/${missing}`)
      .send({ name: '不存在' })
      .expect(404);
    await request(app.getHttpServer()).delete(`/course/${missing}`).expect(404);
  });

  it('非法 ID 返回 400', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '2147483648']) {
      await request(app.getHttpServer()).get(`/student/${id}`).expect(400);
      await request(app.getHttpServer())
        .get(`/course/${id}/students`)
        .expect(400);
      await request(app.getHttpServer())
        .delete(`/student/${student.id}/courses/${id}`)
        .expect(400);
    }
  });

  it('选课参数拒绝缺失、错误类型、越界和额外字段', async () => {
    for (const body of [
      {},
      { courseId: '1' },
      { courseId: null },
      { courseId: 0 },
      { courseId: 1.5 },
      { courseId: 2147483648 },
      { courseId: course.id, extra: true },
    ]) {
      await request(app.getHttpServer())
        .post(`/student/${student.id}/courses`)
        .send(body)
        .expect(400);
    }
  });

  it('学生 CRUD 及学号唯一约束', async () => {
    const created = await request(app.getHttpServer())
      .post('/student')
      .send({ studentNo: `${prefix}S2`, name: '新增学生' })
      .expect(201);
    const data = created.body as Student;
    await request(app.getHttpServer())
      .post('/student')
      .send({ studentNo: data.studentNo, name: '重复学生' })
      .expect(409);
    const updated = await request(app.getHttpServer())
      .patch(`/student/${data.id}`)
      .send({ name: '更新学生' })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: '更新学生',
      studentNo: data.studentNo,
    });
    await request(app.getHttpServer())
      .patch(`/student/${data.id}`)
      .send({ studentNo: student.studentNo })
      .expect(409);
    await request(app.getHttpServer()).get(`/student/${data.id}`).expect(200);
    const list = await request(app.getHttpServer()).get('/student').expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: data.id })]),
    );
    await request(app.getHttpServer())
      .delete(`/student/${data.id}`)
      .expect(204);
    await request(app.getHttpServer()).get(`/student/${data.id}`).expect(404);
  });

  it('课程 CRUD 及课程编号唯一约束', async () => {
    const created = await request(app.getHttpServer())
      .post('/course')
      .send({ code: `${prefix}C2`, name: '新增课程' })
      .expect(201);
    const data = created.body as Course;
    await request(app.getHttpServer())
      .post('/course')
      .send({ code: data.code, name: '重复课程' })
      .expect(409);
    const updated = await request(app.getHttpServer())
      .patch(`/course/${data.id}`)
      .send({ name: '更新课程' })
      .expect(200);
    expect(updated.body).toMatchObject({ name: '更新课程', code: data.code });
    await request(app.getHttpServer())
      .patch(`/course/${data.id}`)
      .send({ code: course.code })
      .expect(409);
    await request(app.getHttpServer()).get(`/course/${data.id}`).expect(200);
    const list = await request(app.getHttpServer()).get('/course').expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: data.id })]),
    );
    await request(app.getHttpServer()).delete(`/course/${data.id}`).expect(204);
    await request(app.getHttpServer()).get(`/course/${data.id}`).expect(404);
  });

  it('创建及更新校验必填、空白、null、超长与未知字段', async () => {
    for (const [resource, id, key] of [
      ['student', student.id, 'studentNo'],
      ['course', course.id, 'code'],
    ] as const) {
      const valid = { [key]: `${prefix}new`, name: '测试' };
      for (const body of [
        {},
        { ...valid, name: '  ' },
        { ...valid, name: 1 },
        { ...valid, name: 'x'.repeat(101) },
        { ...valid, [key]: 'has space' },
        { ...valid, [key]: 'x'.repeat(33) },
        { ...valid, id: 1 },
      ]) {
        await request(app.getHttpServer())
          .post(`/${resource}`)
          .send(body)
          .expect(400);
      }
      for (const body of [
        { name: null },
        { name: '' },
        { [key]: null },
        { unknown: true },
      ]) {
        await request(app.getHttpServer())
          .patch(`/${resource}/${id}`)
          .send(body)
          .expect(400);
      }
    }
  });

  it.each(['student', 'course'])(
    '删除 %s 级联删除选课记录，保留另一方',
    async (resource) => {
      await request(app.getHttpServer())
        .post(`/student/${student.id}/courses`)
        .send({ courseId: course.id })
        .expect(201);
      await request(app.getHttpServer())
        .delete(
          `/${resource}/${resource === 'student' ? student.id : course.id}`,
        )
        .expect(204);
      expect(
        await prisma.enrollment.count({
          where: { studentId: student.id, courseId: course.id },
        }),
      ).toBe(0);
      if (resource === 'student') {
        expect(
          await prisma.course.findUnique({ where: { id: course.id } }),
        ).not.toBeNull();
      } else {
        expect(
          await prisma.student.findUnique({ where: { id: student.id } }),
        ).not.toBeNull();
      }
    },
  );
});
