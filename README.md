# 基础概念

1. DTO 对字段加校验的
2. Module是功能的"容器"，把同一个功能的 Controller 和 Service 打包在一起
3. Controller负责接收请求、返回响应，不写具体逻辑
4. Service服务负责具体的业务逻辑，比如查数据库、调用第三方 API、数据处理等

# 关系

- HTTP 请求 → Controller（我来接收）→ Service（我来处理）→ Controller（我来返回）→ HTTP 响应
