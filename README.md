- 知识库访问权限校验，不能仅凭传入集合名访问。
- 文档更新、去重和删除。
- 模型及版本记录，避免混用向量。
- 检索相关性过滤、重排和引用来源。
- 状态查询、清空等管理能力。

# 混淆的点

- tool,function_calling,mcp
- lang_chain与lang_graph历史记录的区别

# 分类路由

```mermaid
flowchart TD
    START([开始]) --> classify[ classify：识别问题类别 ]
    classify --> route{routeByCategory}
    route -->|technical| technical[技术专家：专业技术解答]
    route -->|pricing| pricing[商务专员：价格咨询引导联系销售]
    route -->|general| general[客服：回答一般问题]
    technical --> END([结束])
    pricing --> END
    general --> END
```

`一个任务拆解多任务并行 VS 多个subagent进行的区别`

# tech-research

```mermaid
flowchart TD
    A([输入技术选型问题]) --> B[parseTask：拆分调研维度]
    B --> C[researchAgent：性能分析]
    B --> D[researchAgent：生态分析]
    B --> E[researchAgent：其他维度分析]
    C --> F[analyzeResults：汇总分析与技术评分]
    D --> F
    E --> F
    F --> G[generateReport：生成 Markdown 报告]
    G --> H[humanReview：暂停等待人工审核]
    H -->|批准| I([结束，返回报告])
    H -->|拒绝| J([结束])
    H -->|修改意见| G
```
