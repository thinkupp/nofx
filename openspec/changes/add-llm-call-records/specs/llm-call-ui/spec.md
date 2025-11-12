# Spec: LLM调用记录前端展示

## 概述

定义LLM调用记录的前端展示页面、交互逻辑和用户体验规范。

## 页面结构

### 主页面: LLMCallsPage

```
┌─────────────────────────────────────────────────────────────┐
│ LLM调用记录                                                    │
├─────────────────────────────────────────────────────────────┤
│ [筛选] Trader: [全部 ▼] 状态: [全部 ▼] 时间: [最近7天 ▼]      │
├─────────────────────────────────────────────────────────────┤
│ 时间             │Trader│模型      │输入 │输出 │总计 │耗时│状态│操作│
│ 2025-01-11 20:15│Trader1│deepseek │1234 │567 │1801│2.3s│✓  │[详情]│
│ 2025-01-11 20:10│Trader2│qwen     │2345 │890 │3235│1.8s│✓  │[详情]│
│ 2025-01-11 20:05│Trader1│deepseek │1567 │678 │2245│3.1s│✗  │[详情]│
│ ...              │      │          │     │    │     │    │   │     │
├─────────────────────────────────────────────────────────────┤
│ 共123条记录  [ ◀ 1 2 3 4 5 ▶ ]  显示: 20条/页                │
└─────────────────────────────────────────────────────────────┘
```

### 详情弹窗: LLMCallDetailModal

```
┌─────────────────────────────────────────────────┐
│ LLM调用详情                               [✕]  │
├─────────────────────────────────────────────────┤
│ ℹ 基本信息                                       │
│ Trader: Trader-1    模型: deepseek-chat         │
│ 请求时间: 2025-01-11 20:15:30                   │
│ 响应时间: 2025-01-11 20:15:32                   │
│ 耗时: 2.3秒                                     │
│                                                 │
│ 📊 Token统计                                     │
│ 输入: 1234 tokens  输出: 567 tokens            │
│ 总计: 1801 tokens                               │
│ [█████████████░░░░░░░] 68.5% input             │
│                                                 │
│ 📝 System Prompt                    [复制] [▼]  │
│ ┌──────────────────────────────────────────┐   │
│ │ You are a professional crypto trader...  │   │
│ │ ...                                       │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ 💬 User Prompt                      [复制] [▼]  │
│ ┌──────────────────────────────────────────┐   │
│ │ 时间: 2025-01-11 | 周期: #123             │   │
│ │ BTC: 96500 (1h: +2.3%)...               │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ 🤖 AI Response                      [复制] [▼]  │
│ ┌──────────────────────────────────────────┐   │
│ │ <reasoning>...                            │   │
│ │ <decision>...                             │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│                              [关闭]             │
└─────────────────────────────────────────────────┘
```

## ADDED Requirements

### Requirement: 页面加载和数据展示

The page **MUST** load quickly and display the latest LLM call records.

#### Scenario: 首次访问页面

**Given** 用户已登录并有访问权限
**When** 用户点击导航菜单中的"LLM调用记录"
**Then** 页面在2秒内加载完成
**And** 默认显示最近7天的所有调用记录
**And** 记录按时间倒序排列(最新的在最上面)
**And** 默认显示第1页,每页20条记录
**And** 显示加载动画,直到数据返回

#### Scenario: 空数据状态

**Given** 数据库中没有LLM调用记录
**When** 页面加载完成
**Then** 显示友好的空状态提示
**And** 提示内容为"暂无LLM调用记录,请先运行AI交易员"
**And** 不显示表格和分页控件

#### Scenario: 数据加载错误

**Given** 用户访问LLM调用记录页面
**When** API请求失败(网络错误或服务器错误)
**Then** 显示错误提示"加载失败,请稍后重试"
**And** 提供"重试"按钮
**And** 点击"重试"按钮重新请求数据

### Requirement: 表格展示和交互

The table **MUST** clearly display key information and support basic interactive operations.

#### Scenario: 表格列显示

**Given** 页面成功加载数据
**When** 用户查看表格
**Then** 表格包含以下列:
  - 时间(格式: YYYY-MM-DD HH:mm:ss)
  - Trader名称
  - 模型(provider + model_name)
  - 输入token数
  - 输出token数
  - 总token数
  - 耗时(秒,保留1位小数)
  - 状态(成功:绿色✓, 失败:红色✗)
  - 操作(详情按钮)

#### Scenario: 时间格式化

**Given** LLM调用记录的request_time为UTC时间
**When** 表格显示时间
**Then** 时间转换为用户本地时区
**And** 格式为"YYYY-MM-DD HH:mm:ss"
**And** 鼠标悬停时显示完整的ISO时间戳(tooltip)

#### Scenario: Token数量格式化

**Given** Token数量可能很大(如123456)
**When** 表格显示token数量
**Then** 使用千位分隔符(如123,456)
**And** 数字右对齐
**And** 总token列使用粗体

#### Scenario: 状态显示

**Given** LLM调用记录有成功和失败两种状态
**When** 表格显示状态
**Then** 成功状态显示绿色✓图标
**And** 失败状态显示红色✗图标
**And** 鼠标悬停在失败图标上时,显示error_message(tooltip)

### Requirement: 筛选功能

Users **MUST** be able to filter LLM call records through multiple conditions.

#### Scenario: 按Trader筛选

**Given** 用户有多个trader
**When** 用户选择Trader下拉框中的某个trader
**Then** 表格只显示该trader的LLM调用记录
**And** 重新从第1页开始显示
**And** URL参数更新(trader_id=xxx)
**And** 刷新页面时保持筛选状态

#### Scenario: 按状态筛选

**Given** 数据库中有成功和失败的LLM调用记录
**When** 用户选择状态下拉框中的"失败"
**Then** 表格只显示失败的LLM调用记录
**And** 可以快速定位问题
**And** URL参数更新(status=error)

#### Scenario: 按时间范围筛选

**Given** 用户需要查看特定时间范围的记录
**When** 用户选择时间范围下拉框(最近7天/最近30天/自定义)
**Then** 表格只显示该时间范围内的记录
**And** 如果选择"自定义",弹出日期选择器
**And** URL参数更新(start_date=xxx&end_date=xxx)

#### Scenario: 组合筛选

**Given** 用户同时选择了多个筛选条件
**When** 筛选条件应用
**Then** 表格显示满足所有条件的记录(AND逻辑)
**And** 筛选条件在URL参数中体现
**And** 清空筛选按钮可见,点击后恢复默认状态

### Requirement: 分页功能

The system **MUST** support paginated browsing of large amounts of data and provide a smooth user experience.

#### Scenario: 分页控件显示

**Given** 数据库中有100条记录,每页显示20条
**When** 页面加载完成
**Then** 分页控件显示"共100条记录"
**And** 显示页码按钮: [ ◀ 1 2 3 4 5 ▶ ]
**And** 当前页(第1页)高亮显示
**And** 前一页按钮(◀)禁用(因为已在第1页)

#### Scenario: 翻页操作

**Given** 用户在第1页
**When** 用户点击"下一页"按钮或页码"2"
**Then** 页面加载第2页数据(第21-40条记录)
**And** 页码高亮更新为"2"
**And** 前一页按钮启用
**And** URL参数更新(page=2)
**And** 滚动条自动回到页面顶部

#### Scenario: 跳转到最后一页

**Given** 用户在第1页,总共5页
**When** 用户点击页码"5"
**Then** 页面加载第5页数据(第81-100条记录)
**And** 下一页按钮(▶)禁用(因为已在最后一页)
**And** 显示的记录数可能少于每页数量(如只有20条)

#### Scenario: 每页数量选择

**Given** 用户需要调整每页显示的记录数
**When** 用户选择"50条/页"
**Then** 表格重新加载,显示前50条记录
**And** 总页数相应减少(如从5页变为2页)
**And** URL参数更新(limit=50)

### Requirement: 详情弹窗

Clicking the detail button **MUST** open a modal displaying complete LLM call information.

#### Scenario: 打开详情弹窗

**Given** 用户在LLM调用记录列表页
**When** 用户点击某条记录的"详情"按钮
**Then** 弹窗在500ms内打开,显示加载动画
**And** 弹窗居中显示,背景半透明遮罩
**And** 弹窗宽度为屏幕的80%(最大1200px)
**And** API请求该记录的完整详情
**And** 详情加载完成后,替换加载动画

#### Scenario: 基本信息展示

**Given** 详情弹窗已打开并加载完成
**When** 用户查看基本信息区域
**Then** 显示Trader名称、模型名称
**And** 显示请求时间和响应时间(本地时区)
**And** 显示耗时(秒,保留1位小数)
**And** 如果是失败的调用,显示红色错误提示框,包含error_message

#### Scenario: Token统计展示

**Given** 详情弹窗已打开
**When** 用户查看Token统计区域
**Then** 显示输入token数、输出token数、总token数
**And** 显示进度条,直观展示输入/输出的比例
**And** 进度条分为两段:输入(蓝色)和输出(绿色)

#### Scenario: Prompt展示(可折叠)

**Given** 详情弹窗已打开
**When** 用户查看System Prompt区域
**Then** System Prompt默认展开显示
**And** 内容在代码框中显示,保留原始格式
**And** 代码框有滚动条,最大高度300px
**And** 右上角有"复制"按钮和"折叠"按钮
**And** 点击"折叠"按钮,内容区域隐藏,只显示标题
**And** 再次点击(变为"展开"),内容重新显示

#### Scenario: 复制功能

**Given** 用户在详情弹窗中查看System Prompt
**When** 用户点击"复制"按钮
**Then** System Prompt的完整内容复制到剪贴板
**And** 按钮文字变为"已复制",并显示绿色✓
**And** 2秒后按钮文字恢复为"复制"
**And** 显示toast提示"已复制到剪贴板"

#### Scenario: Response展示(JSON高亮)

**Given** 详情弹窗已打开
**When** 用户查看AI Response区域
**Then** 如果响应内容包含JSON,自动进行语法高亮
**And** 如果响应包含<reasoning>和<decision>标签,分别显示
**And** 代码框支持滚动
**And** 右上角有"复制"按钮

#### Scenario: 关闭详情弹窗

**Given** 详情弹窗已打开
**When** 用户点击右上角的"✕"按钮,或点击遮罩区域,或按下Esc键
**Then** 弹窗在300ms内关闭(淡出动画)
**And** 返回到列表页,保持之前的页码和筛选条件

### Requirement: 导航和路由

The LLM call records page **MUST** be correctly integrated into the application navigation system.

#### Scenario: 导航菜单入口

**Given** 用户已登录系统
**When** 用户查看主导航菜单
**Then** 在"数据分析"或"系统"分组下,显示"LLM调用记录"菜单项
**And** 菜单项有图标(如📊或🤖)
**And** 点击菜单项,跳转到LLM调用记录页面

#### Scenario: 路由配置

**Given** 应用使用React Router
**When** 用户访问 /llm-calls 路径
**Then** 渲染LLMCallsPage组件
**And** 路由受保护,需要登录才能访问
**And** 未登录用户重定向到登录页

#### Scenario: URL参数持久化

**Given** 用户在LLM调用记录页面进行了筛选和翻页
**When** 用户复制当前页面URL并在新标签页打开
**Then** 新标签页应用相同的筛选条件和页码
**And** 显示完全一致的数据
**And** URL示例: /llm-calls?trader_id=t1&status=success&page=2&limit=20

### Requirement: 响应式设计

The page **MUST** display well on different screen sizes.

#### Scenario: 桌面端显示(宽屏)

**Given** 用户使用桌面浏览器(宽度≥1200px)
**When** 用户访问LLM调用记录页面
**Then** 表格显示所有列,布局宽松
**And** 详情弹窗宽度为1200px
**And** 筛选器水平排列在一行

#### Scenario: 平板端显示

**Given** 用户使用平板(宽度768px-1199px)
**When** 用户访问LLM调用记录页面
**Then** 表格隐藏"耗时"列(优先级较低)
**And** 详情弹窗宽度为屏幕的90%
**And** 筛选器可能换行显示

#### Scenario: 移动端显示

**Given** 用户使用手机(宽度<768px)
**When** 用户访问LLM调用记录页面
**Then** 表格改为卡片式布局(每条记录一个卡片)
**And** 卡片显示关键信息:时间、Trader、Token总计、状态
**And** 详情弹窗全屏显示
**And** 筛选器垂直堆叠

### Requirement: 性能优化

The page **MUST** load quickly and provide a smooth interactive experience.

#### Scenario: 首次加载性能

**Given** 数据库中有1000+条记录
**When** 用户首次访问LLM调用记录页面
**Then** 页面在2秒内完成首屏渲染
**And** 使用骨架屏(skeleton screen)显示加载状态
**And** API只请求第1页数据(20条),不加载全部数据

#### Scenario: 滚动性能

**Given** 表格有20行数据
**When** 用户滚动页面
**Then** 滚动流畅,帧率≥60fps
**And** 不出现卡顿或闪烁

#### Scenario: 筛选和翻页性能

**Given** 用户进行筛选或翻页操作
**When** 等待新数据加载
**Then** 显示加载动画或进度条
**And** 数据返回后在500ms内更新表格
**And** 使用防抖(debounce)优化筛选输入

#### Scenario: 详情弹窗加载性能

**Given** 用户点击"详情"按钮
**When** 加载详情数据
**Then** 弹窗先显示基本信息和骨架屏
**And** 完整的prompt和response在1秒内加载完成
**And** 大文本内容使用虚拟滚动(如果超过1万字符)

## 用户体验细节

### 加载状态
- 使用骨架屏(skeleton screen)代替传统的loading spinner
- 表格加载时显示灰色占位行
- 详情弹窗加载时显示占位块

### 错误处理
- API错误:显示友好的错误提示和"重试"按钮
- 网络错误:提示"网络连接失败,请检查网络"
- 权限错误:提示"无权访问"并引导回主页

### 交互反馈
- 所有按钮点击有视觉反馈(颜色变化)
- 复制操作有成功提示(toast + 按钮状态变化)
- 筛选和翻页操作有加载动画

### 可访问性(Accessibility)
- 表格支持键盘导航(Tab键)
- 详情弹窗支持Esc键关闭
- 所有图标有文字说明(aria-label)
- 颜色对比度符合WCAG AA标准

## 技术栈

- **框架**: React 18+
- **路由**: React Router v6
- **UI组件**: 基于现有的UI组件库(根据项目情况)
- **状态管理**: React Hooks (useState, useEffect)
- **API请求**: fetch或axios
- **样式**: CSS Modules或Tailwind CSS(根据项目情况)
- **表格**: 自定义table或使用react-table
- **日期选择**: react-datepicker(如果需要自定义时间范围)
