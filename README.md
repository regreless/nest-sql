1. **接入 Prisma** 安装依赖，配置 `.env` 的 `DATABASE_URL`，确认能连接 Docker 中的 PostgreSQL。

2. **定义数据库模型** 在 `prisma/schema.prisma` 写 `Student`、`Course`、`Enrollment`，配置多对多关系和防重复选课约束。

3. **创建表、生成客户端** 执行数据库迁移，再生成 Prisma Client，供 TypeScript 调用。

4. **封装 PrismaService** 让 student、course 模块通过依赖注入访问数据库。

5. **写 seed 数据** 插入 10 名学生、10 门课程和选课记录，先让数据库里有可查询的数据。

6. **写 DTO → Service → Controller**
    - DTO：定义并校验参数。
    - Service：实现查询、选课、退课逻辑。
    - Controller：提供 HTTP 接口。

7. **用 Hoppscotch 验证** 先查“小明选了哪些课”“影视课有多少人”，再测试选课、退课、重复选课和不存在的 ID。

- 知识库访问权限校验，不能仅凭传入集合名访问。
- 文档更新、去重和删除。
- 模型及版本记录，避免混用向量。
- 检索相关性过滤、重排和引用来源。
- 状态查询、清空等管理能力。
