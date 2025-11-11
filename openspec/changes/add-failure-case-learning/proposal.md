# Change: 增强AI学习反馈 - 失败案例传递

## Why

AI交易系统当前只能看到统计数字(如胜率45%)，无法获知具体失败原因，导致重复犯相同错误。例如，AI可能连续3次在高资金费率时做多而止损，但缺乏失败案例反馈机制，无法从具体错误中学习。

## What Changes

- 在`decision/engine.go`的`buildUserPrompt()`函数中添加"最近失败案例"章节
- 从历史交易记录中提取止损失败案例(亏损交易)
- 为每个失败案例生成结构化描述，包含:
  - 交易币种和方向(多/空)
  - 入场价和止损价
  - 亏损幅度(百分比)
  - 失败原因分析(基于市场数据)
- 限制失败案例数量(建议3-5条)，优先展示最近和最具代表性的失败

## Impact

- **Affected specs**: `ai-decision-feedback` (新增capability)
- **Affected code**:
  - `decision/engine.go:345` - buildUserPrompt()函数
  - `logger/decision_logger.go:297` - PerformanceAnalysis结构
  - 需要从`TradeOutcome`中识别失败原因
