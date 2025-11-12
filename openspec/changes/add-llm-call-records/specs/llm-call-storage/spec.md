# Spec: LLM调用记录存储

## 概述

定义LLM调用记录的存储结构、数据模型和接口规范。

## 数据模型

### LLMCallRecord 结构体

```go
type LLMCallRecord struct {
    ID              int64     `json:"id" db:"id"`
    TraderID        string    `json:"trader_id" db:"trader_id"`
    UserID          string    `json:"user_id" db:"user_id"`
    ModelProvider   string    `json:"model_provider" db:"model_provider"`   // deepseek, qwen, custom
    ModelName       string    `json:"model_name" db:"model_name"`           // 模型名称
    RequestTime     time.Time `json:"request_time" db:"request_time"`       // 请求时间
    ResponseTime    time.Time `json:"response_time" db:"response_time"`     // 响应时间
    DurationMs      int64     `json:"duration_ms" db:"duration_ms"`         // 耗时(毫秒)
    InputTokens     int       `json:"input_tokens" db:"input_tokens"`       // 输入token数
    OutputTokens    int       `json:"output_tokens" db:"output_tokens"`     // 输出token数
    TotalTokens     int       `json:"total_tokens" db:"total_tokens"`       // 总token数
    SystemPrompt    string    `json:"system_prompt" db:"system_prompt"`     // 系统提示词
    UserPrompt      string    `json:"user_prompt" db:"user_prompt"`         // 用户输入
    ResponseContent string    `json:"response_content" db:"response_content"` // AI响应
    ErrorMessage    string    `json:"error_message" db:"error_message"`     // 错误信息
    Status          string    `json:"status" db:"status"`                   // success, error
    CreatedAt       time.Time `json:"created_at" db:"created_at"`           // 创建时间
}
```

## 数据库表结构

### llm_calls 表

```sql
CREATE TABLE IF NOT EXISTS llm_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    request_time DATETIME NOT NULL,
    response_time DATETIME,
    duration_ms INTEGER,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    system_prompt TEXT,
    user_prompt TEXT,
    response_content TEXT,
    error_message TEXT,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_llm_calls_trader_id ON llm_calls(trader_id);
CREATE INDEX IF NOT EXISTS idx_llm_calls_user_id ON llm_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_calls_request_time ON llm_calls(request_time DESC);
CREATE INDEX IF NOT EXISTS idx_llm_calls_status ON llm_calls(status);
```

## ADDED Requirements

### Requirement: 数据库表创建和迁移

系统启动时**MUST**自动创建llm_calls表,并**MUST**创建必要的索引以优化查询性能。

#### Scenario: 首次启动系统

**Given** 数据库中不存在llm_calls表
**When** 系统启动并执行createTables方法
**Then** llm_calls表被成功创建,包含所有定义的字段
**And** 四个索引被成功创建(trader_id, user_id, request_time, status)

#### Scenario: 表已存在的情况

**Given** 数据库中已存在llm_calls表
**When** 系统启动并执行createTables方法
**Then** 不会重复创建表,也不会报错
**And** 系统正常启动

### Requirement: LLM调用记录创建

每次调用LLM API时,系统**MUST**记录完整的调用信息,包括请求内容、响应内容、token统计和耗时。

#### Scenario: 成功的LLM API调用

**Given** trader正在运行,需要进行决策
**When** mcp.Client调用LLM API并成功返回
**Then** 系统创建一条LLMCallRecord记录
**And** 记录包含完整的system_prompt和user_prompt
**And** 记录包含AI的response_content
**And** 记录的status为"success"
**And** 记录包含准确的input_tokens、output_tokens和total_tokens
**And** 记录包含准确的duration_ms
**And** 记录被异步写入数据库(不阻塞API调用)

#### Scenario: 失败的LLM API调用

**Given** trader正在运行,需要进行决策
**When** mcp.Client调用LLM API但失败(网络错误或API错误)
**Then** 系统创建一条LLMCallRecord记录
**And** 记录的status为"error"
**And** error_message字段包含详细的错误信息
**And** response_content字段为空
**And** output_tokens为0
**And** 记录仍然包含system_prompt和user_prompt
**And** 记录被异步写入数据库

#### Scenario: Token统计提取

**Given** AI提供商的API返回包含usage信息
**When** mcp.Client解析API响应
**Then** 从usage.prompt_tokens提取input_tokens
**And** 从usage.completion_tokens提取output_tokens
**And** 从usage.total_tokens提取total_tokens(或计算得出)

#### Scenario: Token统计缺失时的估算

**Given** AI提供商的API返回不包含usage信息
**When** mcp.Client尝试提取token统计
**Then** 基于文本长度估算input_tokens(字符数/4)
**And** 基于响应长度估算output_tokens(字符数/4)
**And** total_tokens = input_tokens + output_tokens

### Requirement: 数据库查询接口

系统**MUST**提供高效的查询接口,支持分页、过滤和排序。

#### Scenario: 分页查询所有LLM调用

**Given** 数据库中有100条LLM调用记录
**When** 前端请求第2页,每页20条记录
**Then** API返回第21-40条记录
**And** 返回的记录按request_time倒序排列(最新的在前)
**And** 返回total_count为100
**And** 响应时间小于1秒

#### Scenario: 按trader_id过滤查询

**Given** 数据库中有多个trader的LLM调用记录
**When** 前端请求trader_id="trader-123"的记录
**Then** API只返回该trader的LLM调用记录
**And** 返回的记录按request_time倒序排列

#### Scenario: 按时间范围过滤查询

**Given** 数据库中有不同时间的LLM调用记录
**When** 前端请求2025-01-01到2025-01-31的记录
**Then** API只返回该时间范围内的记录
**And** 返回的记录按request_time倒序排列

#### Scenario: 按状态过滤查询

**Given** 数据库中有成功和失败的LLM调用记录
**When** 前端请求status="error"的记录
**Then** API只返回失败的LLM调用记录
**And** 可以快速定位和分析错误情况

#### Scenario: 查询单条LLM调用详情

**Given** 数据库中存在id=123的LLM调用记录
**When** 前端请求该记录的详情
**Then** API返回完整的LLMCallRecord,包含所有字段
**And** system_prompt、user_prompt和response_content完整返回(不截断)

### Requirement: 统计信息聚合

系统**MUST**提供统计接口,快速获取汇总信息。

#### Scenario: 获取总体统计

**Given** 数据库中有多条LLM调用记录
**When** 前端请求统计信息
**Then** API返回总调用次数
**And** 返回总input_tokens
**And** 返回总output_tokens
**And** 返回总total_tokens
**And** 返回平均耗时duration_ms
**And** 返回成功率(success_count / total_count)

#### Scenario: 按trader统计

**Given** 数据库中有多个trader的LLM调用记录
**When** 前端请求按trader分组的统计信息
**Then** API返回每个trader的调用次数和token消耗
**And** 可以比较不同trader的资源消耗

#### Scenario: 按时间段统计

**Given** 数据库中有不同时间的LLM调用记录
**When** 前端请求按天/周/月分组的统计信息
**Then** API返回时间序列数据
**And** 可以绘制token消耗趋势图

## 性能要求

- 查询100条记录的响应时间应小于500ms
- 写入单条记录的时间应小于100ms(异步)
- 分页查询支持1000+条记录的情况
- 索引应覆盖常用查询条件(trader_id, user_id, request_time)

## 数据保留策略

- 默认保留90天的LLM调用记录
- 提供配置选项允许用户自定义保留天数
- 定期清理超过保留期的旧记录(每天凌晨执行)

## 安全性

- 所有API接口需要认证(JWT token)
- 用户只能查询自己的LLM调用记录
- system_prompt和user_prompt可能包含敏感信息,需要访问控制
- response_content可能很大,查询详情时才返回完整内容
