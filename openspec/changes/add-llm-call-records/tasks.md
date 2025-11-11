# Tasks: LLM调用记录存储与展示

## 后端任务

### 1. 数据库设计 (database-schema)
- [ ] 在`config/database.go`中添加`llm_calls`表的创建SQL
  - id (主键,自增)
  - trader_id (关联trader)
  - user_id (关联user)
  - model_provider (AI提供商: deepseek/qwen/custom)
  - model_name (模型名称)
  - request_time (请求时间)
  - response_time (响应时间)
  - duration_ms (耗时,毫秒)
  - input_tokens (输入token数)
  - output_tokens (输出token数)
  - total_tokens (总token数)
  - system_prompt (系统提示词,TEXT)
  - user_prompt (用户输入,TEXT)
  - response_content (AI响应内容,TEXT)
  - error_message (错误信息,如果有)
  - status (状态: success/error)
  - created_at (创建时间)
- [ ] 添加数据库接口方法到DatabaseInterface
  - CreateLLMCall(call *LLMCallRecord) error
  - GetLLMCalls(userID string, limit, offset int, filters map[string]string) ([]*LLMCallRecord, int, error)
  - GetLLMCallByID(id int64) (*LLMCallRecord, error)
- [ ] 实现数据库方法

### 2. MCP Client集成 (mcp-integration)
- [ ] 在`mcp/client.go`中添加LLMCallRecord结构体
- [ ] 在callOnce方法中添加记录逻辑
  - 记录请求开始时间
  - 记录响应结束时间
  - 计算耗时
  - 提取token统计(如果API返回中包含)
  - 处理错误情况
- [ ] 添加异步写入数据库的逻辑(避免阻塞API调用)

### 3. API接口 (api-endpoints)
- [ ] 在`api/server.go`中添加新的路由
  - GET /api/llm-calls - 获取LLM调用列表(分页)
  - GET /api/llm-calls/:id - 获取单条LLM调用详情
  - GET /api/llm-calls/stats - 获取统计信息(总调用次数、总token等)
- [ ] 实现对应的handler方法
  - handleGetLLMCalls: 支持分页、按trader_id过滤、按时间范围过滤
  - handleGetLLMCallDetail: 返回完整的prompt和response
  - handleGetLLMCallStats: 返回汇总统计数据
- [ ] 添加权限验证(需要登录)

### 4. Token统计提取 (token-extraction)
- [ ] 研究DeepSeek和Qwen的API响应格式
- [ ] 在mcp.Client中添加token提取逻辑
  - 从API响应的usage字段提取token统计
  - 处理不同AI提供商的响应格式差异
  - 如果API不返回token统计,估算token数量(基于文本长度)

## 前端任务

### 5. LLM调用记录页面 (frontend-page)
- [ ] 创建`web/src/components/LLMCallsPage.tsx`
- [ ] 实现页面布局
  - 顶部: 筛选器(按trader、按时间范围、按状态)
  - 中部: 调用记录列表(表格)
  - 底部: 分页控件
- [ ] 实现表格列
  - 时间
  - Trader名称
  - 模型
  - 输入token
  - 输出token
  - 总token
  - 耗时
  - 状态
  - 操作(查看详情)
- [ ] 实现倒序排列(最新的在最前面)

### 6. 详情弹窗 (detail-modal)
- [ ] 创建`web/src/components/LLMCallDetailModal.tsx`
- [ ] 显示完整的调用信息
  - System Prompt(可折叠)
  - User Prompt(可折叠)
  - AI Response(可折叠)
  - Token统计(图表或数字展示)
  - 时间和耗时信息
- [ ] 添加复制按钮(方便复制prompt进行调试)
- [ ] 添加语法高亮(如果是JSON格式)

### 7. 导航集成 (navigation)
- [ ] 在主导航菜单中添加"LLM调用记录"入口
- [ ] 在App.tsx中添加路由
- [ ] 确保权限控制(需要登录才能访问)

### 8. API客户端 (api-client)
- [ ] 在前端添加API调用方法
  - fetchLLMCalls(params)
  - fetchLLMCallDetail(id)
  - fetchLLMCallStats()
- [ ] 处理加载状态和错误状态
- [ ] 实现自动刷新(可选)

## 测试任务

### 9. 后端测试 (backend-testing)
- [ ] 测试数据库表创建
- [ ] 测试LLM调用记录写入
- [ ] 测试API接口返回正确数据
- [ ] 测试分页功能
- [ ] 测试过滤功能
- [ ] 测试并发写入(多个trader同时调用)

### 10. 前端测试 (frontend-testing)
- [ ] 测试页面加载
- [ ] 测试分页翻页
- [ ] 测试筛选器
- [ ] 测试详情弹窗
- [ ] 测试响应式布局
- [ ] 测试大量数据的性能

### 11. 集成测试 (integration-testing)
- [ ] 创建测试trader并运行
- [ ] 验证LLM调用被正确记录
- [ ] 验证前端能够显示记录
- [ ] 验证token统计的准确性
- [ ] 验证倒序排列
- [ ] 验证详情查看功能

## 文档任务

### 12. 更新文档 (documentation)
- [ ] 更新README,说明新功能
- [ ] 添加API文档(endpoint、参数、返回格式)
- [ ] 添加数据库schema文档
- [ ] 添加截图到文档

## 依赖关系

- 任务2依赖任务1(需要先有数据库表)
- 任务3依赖任务1和任务2(需要数据库和记录逻辑)
- 任务5-7依赖任务3(需要API接口)
- 任务9-11依赖所有开发任务
- 任务12依赖任务9-11(测试通过后更新文档)

## 预估工作量

- 后端任务: 约6-8小时
- 前端任务: 约8-10小时
- 测试任务: 约4-6小时
- 文档任务: 约2-3小时
- **总计**: 约20-27小时
