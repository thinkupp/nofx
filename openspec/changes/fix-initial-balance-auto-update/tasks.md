# 实现任务清单

## 1. 代码修改
- [x] 1.1 修改 `trader/auto_trader.go:307-328` - 提取 totalEquity 而非 availableBalance
- [x] 1.2 删除 `trader/auto_trader.go:323-343` - 移除 initialBalance <= 0 时的自动更新逻辑
- [x] 1.3 删除 `trader/auto_trader.go:345-376` - 移除变化超过5%时的自动更新逻辑
- [x] 1.4 添加监控日志，清晰显示 totalWalletBalance 和 totalUnrealizedProfit
- [x] 1.5 添加注释说明为什么使用 totalEquity 而不是 availableBalance

## 2. 测试验证
- [x] 2.1 确认所有交易所 GetBalance() 返回 totalWalletBalance 和 totalUnrealizedProfit
- [x] 2.2 Review 修改的副作用和依赖关系
- [ ] 2.3 运行测试套件（需要 Go 1.23+ 环境）
- [ ] 2.4 手动验证：持仓后 initialBalance 不再被错误修改
- [ ] 2.5 手动验证：盈利场景下收益率计算正确

## 3. 文档
- [x] 3.1 更新函数注释："自动检查余额变化（仅监控，不修改初始余额）"
- [x] 3.2 添加重要提示："⚠️ 重要：不修改 initial_balance，初始余额是收益计算的基准，应该保持不变"
