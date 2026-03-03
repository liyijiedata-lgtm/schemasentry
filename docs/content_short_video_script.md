# 小红书/抖音 30-60秒脚本（SchemaSentry）

## 版本A（痛点开场）
0-3s：
“Postgres 变慢，别只盯慢查询。有时候问题写在 schema 里。”

3-15s：
“比如：没主键、email没唯一、外键没索引、金额用float、时间用varchar、JSONB塞一切。”

15-35s：
“我做了个小工具：SchemaSentry。把 `pg_dump --schema-only` 导出的 schema.sql 丢进去，直接生成风险报告 + 修复建议。”

35-50s：
“它会标 P0/P1/P2，告诉你哪个表哪一列哪条索引有问题。”

50-60s：
“想要的话去 GitHub 搜 SchemaSentry。你也可以把脱敏 schema 发我，我帮你把误报压下去。”

## 版本B（对比展示）
开场：展示一页报告（P0/P1列表）
旁白：
“这不是监控，这是上线前就能抓到的结构风险。把事故提前到PR里解决。”

结尾CTA：
“GitHub：SchemaSentry。关注我，后面我把最容易踩的10个schema坑做成系列。”
