# PostgreSQL + pgvector

在项目根目录执行：

```powershell
docker compose up -d --build --wait
```

- 镜像固定 PostgreSQL 18.6、pgvector 0.8.6 和当前 Debian 基础镜像。
- 连接地址仍为 `127.0.0.1:5432`，原有连接参数保存在被 Git 忽略的 `.env.local`。
- 数据保存在外部卷 `postgres18_data`，容器重建会继续使用该卷。
- `template1` 已启用 vector，普通 `CREATE DATABASE my_db;` 自动继承。指定 `TEMPLATE template0` 或其他不含 vector 的模板则不会继承。
- 初始化脚本也会为全新数据目录启用 vector 和配置 template1；已有数据目录不会重复执行初始化脚本。
- 更换环境时仍需使用包含 pgvector 的镜像；插件二进制文件不存储在数据库数据卷中。

验证新数据库：

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector AS vector_distance;
```

第二条结果应为 `1`。不要删除 `postgres18_data` 数据卷。
