## 1. 数据层增强

- [x] 1.1 在`logger/decision_logger.go`的`TradeOutcome`结构体中添加`FailureReason`字段(string)
- [x] 1.2 在`PerformanceAnalysis`结构体中添加`FailureCases []TradeOutcome`字段，用于存储失败案例
- [x] 1.3 修改`AnalyzePerformance()`函数，提取亏损交易(PnL < 0)到FailureCases列表
- [x] 1.4 实现失败原因推断逻辑`InferFailureReason(outcome TradeOutcome, marketData *market.Data) string`

## 2. 失败原因分析

- [x] 2.1 创建`decision/failure_analyzer.go`文件
- [x] 2.2 实现资金费率检查逻辑(从market.Data获取FundingRate)
- [x] 2.3 实现技术指标分析(MACD/RSI背离检测)
- [x] 2.4 实现杠杆风险判断(接近强平价则标注"杠杆过高")
- [x] 2.5 默认失败原因设为"止损触发"(无法确定具体原因时)

## 3. User Prompt集成

- [x] 3.1 修改`decision/engine.go:427`的`buildUserPrompt()`函数
- [x] 3.2 在buildUserPrompt中从Performance.FailureCases获取失败案例
- [x] 3.3 在"## 📊 夏普比率"章节后添加"## ⚠️ 最近失败案例(避免重复)"章节
- [x] 3.4 实现失败案例格式化逻辑(内联在buildUserPrompt中)
- [x] 3.5 限制展示数量为最多5条失败案例
- [x] 3.6 处理无失败案例场景(不显示该章节)

## 4. 测试与验证

- [x] 4.1 编写单元测试`decision/failure_analyzer_test.go`
- [x] 4.2 测试各种失败原因推断场景(资金费率/技术指标/杠杆/假突破)
- [ ] 4.3 测试User Prompt生成(包含/不包含失败案例) - 需要运行时测试
- [ ] 4.4 手动测试完整流程，验证AI是否能理解失败案例反馈 - 需要运行时测试
- [ ] 4.5 检查日志输出，确保失败案例正确记录和展示 - 需要运行时测试

## 5. 文档更新

- [ ] 5.1 更新系统架构文档，说明失败案例学习机制
- [ ] 5.2 在用户文档中说明如何查看AI学习的失败案例
- [ ] 5.3 添加失败原因分类说明(资金费率/技术指标/杠杆/止损触发)
