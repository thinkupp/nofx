# Change: 修复 initialBalance 自动更新逻辑导致收益率计算严重失真

## Why

`autoSyncBalanceIfNeeded` 函数错误地使用 **availableBalance（可用余额）** 来检测余额变化并更新 `initialBalance`，导致持仓后收益率计算严重错误。

### 问题场景

```
初始状态：
- 账户初始余额：200 USDT（initialBalance = 200）
- 开仓占用保证金：150 USDT
- 剩余可用余额：50 USDT（availableBalance = 50）

错误触发：
- autoSyncBalanceIfNeeded 检测到：(50 - 200) / 200 = -75% > 5%
- ❌ 错误更新：initialBalance 从 200 改成 50
- 后续收益率计算基于错误的"初始余额 50"，数据完全失真
```

### 根本原因

**trader/auto_trader.go:307-318** 错误提取了 `availableBalance`：
- `availableBalance` 会随持仓占用而下降
- 系统误判为"资金大幅减少"
- 触发自动更新，破坏了收益计算基准

### 违反的设计原则

这违反了 **PR #802** 确立的核心原则：
> "初始余额是收益计算的基准，应该保持不变"

## What Changes

修改 `autoSyncBalanceIfNeeded` 函数中的余额提取和更新逻辑：

### 变更 1：使用 totalEquity 而非 availableBalance

```go
// 修改前（错误）
var actualBalance float64
if availableBalance, ok := balanceInfo["available_balance"].(float64); ok {
    actualBalance = availableBalance  // ❌ 会随持仓占用变化
}

// 修改后（正确）
totalWalletBalance := 0.0
totalUnrealizedProfit := 0.0
if wallet, ok := balanceInfo["totalWalletBalance"].(float64); ok {
    totalWalletBalance = wallet
}
if unrealized, ok := balanceInfo["totalUnrealizedProfit"].(float64); ok {
    totalUnrealizedProfit = unrealized
}
actualBalance = totalWalletBalance + totalUnrealizedProfit  // ✅ 总资产
```

**核心改进**：
- 使用 `totalEquity = totalWalletBalance + totalUnrealizedProfit`
- totalWalletBalance：钱包余额（不含未实现盈亏）
- totalUnrealizedProfit：未实现盈亏
- totalEquity 不受持仓占用影响，真实反映账户价值

### 变更 2：永不自动更新 initialBalance

```go
// 删除所有自动更新逻辑
// - 删除：at.initialBalance = actualBalance
// - 删除：db.UpdateTraderInitialBalance(...)

// 仅保留监控和日志
log.Printf("🔔 检测到总资产大幅变化: %.2f → %.2f USDT (%.2f%%)", ...)
log.Printf("   ⚠️ 注意：初始余额保持不变，用于收益计算基准。如需重置，请通过配置界面操作。")
```

### 变更 3：改进日志输出

```go
// 清晰显示各组成部分
log.Printf("🔔 [%s] 检测到总资产大幅变化: %.2f → %.2f USDT (%.2f%%, 钱包: %.2f + 未实现: %.2f)",
    at.name, initialBalance, actualBalance, changePercent, totalWalletBalance, totalUnrealizedProfit)
```

## Impact

### 受益

- ✅ **核心 bug 修复**：持仓占用不再导致 initialBalance 被错误修改
- ✅ **收益率计算恢复正常**：基准固定，盈亏真实反映
- ✅ **结合两个 PR 的优点**：
  - 采用 PR #636 的 totalEquity 计算（避免持仓占用误判）
  - 采用 PR #802 的"永不自动更新"策略（保持基准不变）

### 权衡

- ⚠️ **充值/提现需要手动更新**：用户充值或提现后，需要通过配置界面手动更新 initialBalance
- ✅ **更安全的设计**：手动更新比自动误判更可控

### 兼容性

- ✅ 无 API 变更
- ✅ 无数据库 schema 变更
- ✅ 所有交易所（币安、Hyperliquid、Aster）都返回所需字段
- ✅ 不影响现有的收益计算逻辑（buildDecisionContext、GetAccountInfo）

### 影响范围

**修改文件**：
- `trader/auto_trader.go:289-356` - autoSyncBalanceIfNeeded 函数完整重构

**不修改**：
- ✅ 收益计算逻辑（buildDecisionContext）保持不变
- ✅ API 返回结构（GetAccountInfo）保持不变
- ✅ 数据库操作保持不变
