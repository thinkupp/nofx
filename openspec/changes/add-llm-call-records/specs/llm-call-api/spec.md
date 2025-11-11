# Spec: LLM调用记录API接口

## 概述

定义LLM调用记录的RESTful API接口规范,包括请求/响应格式、错误处理和权限控制。

## API端点

### 1. GET /api/llm-calls

获取LLM调用记录列表(分页)。

#### 请求

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| page | integer | 否 | 页码,从1开始 | 1 |
| limit | integer | 否 | 每页记录数,默认20,最大100 | 20 |
| trader_id | string | 否 | 筛选特定trader | trader-123 |
| status | string | 否 | 筛选状态: success/error | success |
| start_date | string | 否 | 开始时间(ISO 8601) | 2025-01-01T00:00:00Z |
| end_date | string | 否 | 结束时间(ISO 8601) | 2025-01-31T23:59:59Z |

**示例请求:**
```
GET /api/llm-calls?page=1&limit=20&trader_id=trader-123&status=success
```

#### 响应

**成功响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 1,
        "trader_id": "trader-123",
        "trader_name": "My AI Trader",
        "user_id": "user-456",
        "model_provider": "deepseek",
        "model_name": "deepseek-chat",
        "request_time": "2025-01-11T12:15:30Z",
        "response_time": "2025-01-11T12:15:32Z",
        "duration_ms": 2300,
        "input_tokens": 1234,
        "output_tokens": 567,
        "total_tokens": 1801,
        "status": "success",
        "created_at": "2025-01-11T12:15:32Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 123,
      "total_pages": 7
    }
  }
}
```

**注意:** 列表接口不返回system_prompt、user_prompt和response_content,以减少响应大小。

### 2. GET /api/llm-calls/:id

获取单条LLM调用记录的完整详情。

#### 请求

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | LLM调用记录ID |

**示例请求:**
```
GET /api/llm-calls/123
```

#### 响应

**成功响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "trader_id": "trader-123",
    "trader_name": "My AI Trader",
    "user_id": "user-456",
    "model_provider": "deepseek",
    "model_name": "deepseek-chat",
    "request_time": "2025-01-11T12:15:30Z",
    "response_time": "2025-01-11T12:15:32Z",
    "duration_ms": 2300,
    "input_tokens": 1234,
    "output_tokens": 567,
    "total_tokens": 1801,
    "system_prompt": "You are a professional crypto trader...",
    "user_prompt": "时间: 2025-01-11 | 周期: #123\nBTC: 96500...",
    "response_content": "<reasoning>...",
    "error_message": "",
    "status": "success",
    "created_at": "2025-01-11T12:15:32Z"
  }
}
```

### 3. GET /api/llm-calls/stats

获取LLM调用统计信息。

#### 请求

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| trader_id | string | 否 | 筛选特定trader |
| start_date | string | 否 | 开始时间 |
| end_date | string | 否 | 结束时间 |
| group_by | string | 否 | 分组方式: trader/day/hour |

**示例请求:**
```
GET /api/llm-calls/stats?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z
```

#### 响应

**成功响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_calls": 1234,
    "success_calls": 1200,
    "error_calls": 34,
    "success_rate": 97.2,
    "total_input_tokens": 1234567,
    "total_output_tokens": 567890,
    "total_tokens": 1802457,
    "avg_input_tokens": 1001,
    "avg_output_tokens": 460,
    "avg_duration_ms": 2150,
    "by_trader": [
      {
        "trader_id": "trader-123",
        "trader_name": "My AI Trader",
        "calls": 500,
        "total_tokens": 900000,
        "avg_duration_ms": 2100
      }
    ],
    "by_model": [
      {
        "model_provider": "deepseek",
        "model_name": "deepseek-chat",
        "calls": 800,
        "total_tokens": 1440000
      }
    ],
    "timeline": [
      {
        "date": "2025-01-01",
        "calls": 50,
        "total_tokens": 90000
      }
    ]
  }
}
```

## ADDED Requirements

### Requirement: API认证和权限控制

The system **MUST** enforce authentication and authorization for all LLM call record APIs.

所有LLM调用记录API都需要用户认证,且用户只能访问自己的数据。

#### Scenario: 未认证访问

**Given** 用户未登录或token无效
**When** 用户请求任何LLM调用记录API
**Then** API返回401 Unauthorized
**And** 响应body包含错误信息
```json
{
  "success": false,
  "error": "未授权访问,请先登录"
}
```

#### Scenario: 访问其他用户的数据

**Given** 用户A已登录
**When** 用户A尝试访问用户B的LLM调用记录(通过user_id参数)
**Then** API返回403 Forbidden
**And** 响应body包含错误信息
```json
{
  "success": false,
  "error": "无权访问该资源"
}
```

#### Scenario: Token过期

**Given** 用户的JWT token已过期
**When** 用户请求LLM调用记录API
**Then** API返回401 Unauthorized
**And** 响应body提示token已过期
**And** 前端自动跳转到登录页

### Requirement: 分页查询

The API **MUST** support efficient pagination to avoid loading large amounts of data at once.

#### Scenario: 默认分页参数

**Given** 用户请求LLM调用列表,不指定分页参数
**When** API处理请求
**Then** 默认返回第1页
**And** 每页20条记录
**And** 响应包含pagination对象,包含total和total_pages

#### Scenario: 自定义分页参数

**Given** 用户请求第3页,每页50条
**When** API处理请求: GET /api/llm-calls?page=3&limit=50
**Then** 返回第101-150条记录
**And** pagination.page = 3
**And** pagination.limit = 50

#### Scenario: 超出范围的页码

**Given** 数据库中只有100条记录,每页20条(共5页)
**When** 用户请求第10页: GET /api/llm-calls?page=10&limit=20
**Then** API返回空数组
**And** pagination.page = 10
**And** pagination.total = 100
**And** pagination.total_pages = 5

#### Scenario: 无效的分页参数

**Given** 用户请求负数页码或0: GET /api/llm-calls?page=0
**When** API验证参数
**Then** 返回400 Bad Request
**And** 错误信息:"page参数必须大于0"

#### Scenario: 超大的limit参数

**Given** 用户请求limit=1000
**When** API验证参数
**Then** limit自动限制为最大值100
**And** 返回警告信息(在响应头或body中)

### Requirement: 数据过滤

The API **MUST** support multiple filtering conditions to help users find specific LLM call records.

#### Scenario: 按trader_id过滤

**Given** 用户有多个trader
**When** 用户请求: GET /api/llm-calls?trader_id=trader-123
**Then** 只返回trader_id=trader-123的记录
**And** SQL查询使用WHERE子句: WHERE trader_id = ? AND user_id = ?

#### Scenario: 按状态过滤

**Given** 用户需要查看失败的调用
**When** 用户请求: GET /api/llm-calls?status=error
**Then** 只返回status=error的记录
**And** 可以快速定位问题

#### Scenario: 按时间范围过滤

**Given** 用户需要查看2025年1月的记录
**When** 用户请求: GET /api/llm-calls?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z
**Then** 只返回该时间范围内的记录
**And** SQL查询使用: WHERE request_time BETWEEN ? AND ?

#### Scenario: 组合过滤

**Given** 用户需要查看特定trader在特定时间的成功调用
**When** 用户请求: GET /api/llm-calls?trader_id=t1&status=success&start_date=2025-01-01T00:00:00Z
**Then** 返回满足所有条件的记录(AND逻辑)
**And** SQL查询正确组合所有WHERE条件

#### Scenario: 无效的过滤参数

**Given** 用户提供了无效的status值
**When** 用户请求: GET /api/llm-calls?status=invalid_status
**Then** 返回400 Bad Request
**And** 错误信息:"status参数必须是success或error"

### Requirement: 排序规则

The API **MUST** return LLM call records sorted by time in descending order (newest first).

#### Scenario: 默认排序

**Given** 用户请求LLM调用列表
**When** API查询数据库
**Then** SQL使用: ORDER BY request_time DESC
**And** 最新的记录在数组的第一个位置
**And** 如果request_time相同,按id DESC排序

### Requirement: 详情查询

The API **MUST** return complete LLM call details including full prompts and responses.

#### Scenario: 查询存在的记录

**Given** 数据库中存在id=123的记录
**When** 用户请求: GET /api/llm-calls/123
**Then** 返回完整的LLMCallRecord
**And** 包含system_prompt、user_prompt和response_content的完整内容(不截断)
**And** 如果status=error,包含完整的error_message

#### Scenario: 查询不存在的记录

**Given** 数据库中不存在id=999的记录
**When** 用户请求: GET /api/llm-calls/999
**Then** 返回404 Not Found
**And** 错误信息:"记录不存在"

#### Scenario: 查询其他用户的记录

**Given** 用户A尝试查询用户B的记录
**When** 用户A请求: GET /api/llm-calls/123(该记录属于用户B)
**Then** 返回403 Forbidden
**And** 不泄露该记录是否存在

#### Scenario: 大文本响应

**Given** LLM调用记录的response_content非常大(如10MB)
**When** 用户请求详情
**Then** API正常返回完整内容
**And** 响应时间在3秒内
**And** 考虑使用gzip压缩响应

### Requirement: 统计信息

The API **MUST** provide aggregated statistics to help users understand LLM usage.

#### Scenario: 全局统计

**Given** 用户请求统计信息,不指定任何过滤条件
**When** API处理请求: GET /api/llm-calls/stats
**Then** 返回用户所有LLM调用的统计信息
**And** 包含总调用次数、成功率、总token数等
**And** 计算平均值(avg_input_tokens, avg_output_tokens, avg_duration_ms)

#### Scenario: 按trader分组统计

**Given** 用户有多个trader
**When** 用户请求: GET /api/llm-calls/stats?group_by=trader
**Then** 返回每个trader的统计信息
**And** by_trader数组包含每个trader的calls、total_tokens、avg_duration_ms
**And** 按calls降序排列,显示最活跃的trader

#### Scenario: 时间序列统计

**Given** 用户需要查看token消耗趋势
**When** 用户请求: GET /api/llm-calls/stats?group_by=day&start_date=2025-01-01
**Then** 返回按天分组的统计数据
**And** timeline数组包含每天的calls和total_tokens
**And** 可以用于绘制趋势图

#### Scenario: 按模型分组统计

**Given** 用户使用了多个AI模型
**When** API返回统计信息
**Then** by_model数组包含每个模型的使用情况
**And** 可以比较不同模型的token消耗

### Requirement: 错误处理

The API **MUST** provide clear error messages to help frontend handle exceptional situations correctly.

#### Scenario: 数据库查询错误

**Given** 数据库连接失败或查询超时
**When** API尝试查询LLM调用记录
**Then** 返回500 Internal Server Error
**And** 错误信息:"服务器内部错误,请稍后重试"
**And** 后端记录详细的错误日志(包括堆栈)

#### Scenario: 参数验证错误

**Given** 用户提供了无效的参数
**When** API验证请求参数
**Then** 返回400 Bad Request
**And** 错误信息明确指出哪个参数无效及原因
**And** 示例: "limit参数必须是1-100之间的整数"

#### Scenario: 权限错误

**Given** 用户尝试访问无权访问的资源
**When** API检查权限
**Then** 返回403 Forbidden
**And** 错误信息:"无权访问该资源"
**And** 不泄露资源的详细信息

### Requirement: 性能优化

The API **MUST** respond quickly even with large amounts of data.

#### Scenario: 查询性能

**Given** 数据库中有10万条LLM调用记录
**When** 用户请求第1页(20条记录)
**Then** API在500ms内返回结果
**And** SQL使用索引(trader_id, user_id, request_time)
**And** 使用LIMIT和OFFSET优化分页查询

#### Scenario: 统计查询性能

**Given** 用户请求统计信息
**When** API执行聚合查询
**Then** 使用SQL的GROUP BY和聚合函数(SUM, COUNT, AVG)
**And** 查询在1秒内完成
**And** 考虑缓存统计结果(如5分钟有效期)

#### Scenario: 并发请求

**Given** 多个用户同时请求LLM调用记录
**When** API处理并发请求
**Then** 数据库连接池正确管理连接
**And** 不出现连接泄漏或超时
**And** 响应时间不随并发数增加而显著增长

## 响应格式规范

### 成功响应

所有成功响应使用统一格式:
```json
{
  "success": true,
  "data": { /* 具体数据 */ }
}
```

### 错误响应

所有错误响应使用统一格式:
```json
{
  "success": false,
  "error": "错误描述",
  "error_code": "ERROR_CODE" // 可选,用于前端判断错误类型
}
```

### HTTP状态码

- 200 OK: 请求成功
- 400 Bad Request: 参数错误
- 401 Unauthorized: 未认证
- 403 Forbidden: 无权限
- 404 Not Found: 资源不存在
- 500 Internal Server Error: 服务器错误

## 安全性要求

1. **认证**: 所有接口需要有效的JWT token
2. **权限控制**: 用户只能访问自己的数据
3. **参数验证**: 严格验证所有输入参数
4. **SQL注入防护**: 使用参数化查询(prepared statements)
5. **速率限制**: 考虑添加API速率限制(如每分钟100次请求)
6. **敏感信息**: 不在日志中记录完整的prompt和response

## 实现要点

1. **数据库查询优化**
   - 使用索引
   - 避免SELECT *,只查询需要的字段
   - 列表接口不返回大文本字段

2. **异步处理**
   - LLM调用记录写入使用异步(不阻塞API调用)
   - 考虑使用消息队列(如果写入压力大)

3. **缓存策略**
   - 统计信息可以缓存(5分钟有效期)
   - 使用ETag/If-None-Match支持客户端缓存

4. **分页优化**
   - 对于大数据量,使用cursor-based pagination代替offset-based
   - 示例: 使用id作为cursor,WHERE id < ? LIMIT ?

5. **监控和日志**
   - 记录API响应时间
   - 记录慢查询(>1秒)
   - 记录错误和异常

## 测试要求

1. **单元测试**
   - 测试参数验证逻辑
   - 测试权限检查逻辑
   - 测试数据库查询方法

2. **集成测试**
   - 测试完整的API流程
   - 测试不同的筛选条件组合
   - 测试分页边界情况

3. **性能测试**
   - 测试大数据量下的查询性能
   - 测试并发请求
   - 测试响应时间

4. **安全测试**
   - 测试未认证访问
   - 测试跨用户访问
   - 测试SQL注入攻击
   - 测试XSS攻击(如果返回HTML)
