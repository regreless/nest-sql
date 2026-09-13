# 学生选课接口

基础地址：`http://localhost:3000`。请求体使用 JSON，并设置 `Content-Type: application/json`。

## 学生和课程

| 方法   | 路径           | 用途 / 请求体                                 |
| ------ | -------------- | --------------------------------------------- |
| GET    | `/student`     | 学生列表，按 ID 升序                          |
| GET    | `/student/:id` | 学生详情                                      |
| POST   | `/student`     | 创建：`{"studentNo":"S011","name":"小李"}`    |
| PATCH  | `/student/:id` | 修改：`{"name":"小李同学"}`，也可修改学号     |
| DELETE | `/student/:id` | 删除学生，同时删除其选课记录                  |
| GET    | `/course`      | 课程列表，按 ID 升序                          |
| GET    | `/course/:id`  | 课程详情                                      |
| POST   | `/course`      | 创建：`{"code":"C011","name":"书法"}`         |
| PATCH  | `/course/:id`  | 修改：`{"name":"书法基础"}`，也可修改课程编号 |
| DELETE | `/course/:id`  | 删除课程，同时删除对应选课记录                |

`id` 由数据库生成。课程字段统一为 `code`、`name`，原骨架的 `c_name` 不再使用。
编号最多 32 个字符，不能为空或包含空白；姓名和课程名称最多 100 个字符，不能全为空白。
PATCH 允许省略字段，不接受 `null`。未知字段返回 400。

## 选课与查询

| 方法   | 路径                             | 用途                           |
| ------ | -------------------------------- | ------------------------------ |
| POST   | `/student/:id/courses`           | 选课，请求体：`{"courseId":1}` |
| DELETE | `/student/:id/courses/:courseId` | 退课                           |
| GET    | `/student/:id/courses`           | 查询该学生的课程及数量         |
| GET    | `/course/:id/students`           | 查询该课程的学生及人数         |

先从列表中找到学号 `S001`（小明）、课程编号 `C001`（影视）的实际 ID，不依赖自增 ID 的具体值。

学生课程查询结果示例（ID 和时间仅为示意）：

```json
{
  "id": 1,
  "studentNo": "S001",
  "name": "小明",
  "total": 1,
  "courses": [
    {
      "id": 1,
      "code": "C001",
      "name": "影视",
      "enrolledAt": "2026-09-13T00:00:00.000Z"
    }
  ]
}
```

课程学生查询返回 `{ id, code, name, total, students }`，每个学生包含 `id`、`studentNo`、`name`、`enrolledAt`。
没有选课记录时，`total` 为 0，对应列表为 `[]`。

## 状态码与验证

- `200`：查询、修改成功。
- `201`：创建或选课成功；选课返回 `studentId`、`courseId`、`enrolledAt`。
- `204`：删除或退课成功，无响应体。
- `400`：参数不合法；ID 必须是正整数且不超过 2147483647，JSON 中的 `courseId` 必须是数字。
- `404`：学生、课程或选课记录不存在；重复退课同样返回 404。
- `409`：学号、课程编号重复，或重复选课（包括并发请求）。

自动化验证：`npm test -- --runInBand` 和 `npm run test:e2e -- --runInBand`。
集成测试需要 `.env` 中的 PostgreSQL 可连接且迁移已执行；测试创建专用临时数据，结束后清理，不删除 seed 数据。

## Hoppscotch 手动验证

1. 保持 `npm run start:dev` 运行，拦截器选择此前可用的 **扩展：v0.37**。
2. 在集合区域点击导入，选择 **从 Postman 导入**，选择同目录下的 `student-course.postman_collection.json`。[官方导入说明](https://docs.hoppscotch.io/documentation/features/importer)
3. 按请求名称的 01—12 顺序发送，每个请求描述里都有预期结果。
4. 第 05 步为小明选择摄影课，第 09 步退课，完成后恢复原来的选课数据。

集合使用当前数据库的实际 ID：小明为 `1`、影视为 `1`、摄影为 `10`。若重新建库，请先查询学生和课程列表，再调整 ID。

本次已通过实际 `http://localhost:3000` 请求验证：小明初始 3 门课、影视 5 人；选摄影返回 201，重复选课返回 409；查询显示 4 门课；退课返回 204 并恢复 3 门课；非法参数返回 400，不存在的学生返回 404。
浏览器自动化当前未连接，因此以上为 HTTP 验证结果，Hoppscotch 页面操作仍需手动复核。
