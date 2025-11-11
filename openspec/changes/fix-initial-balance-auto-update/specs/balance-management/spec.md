# Balance Management Specification Delta

## MODIFIED Requirements

### Requirement: 初始余额自动同步基准
系统在自动检查余额变化时，SHALL 使用 totalEquity（总资产 = totalWalletBalance + totalUnrealizedProfit）而非 availableBalance（可用余额），并且 SHALL NOT 自动修改 initialBalance。

余额监控逻辑：
```
totalEquity = totalWalletBalance + totalUnrealizedProfit
仅用于监控和日志，永不更新 initialBalance
```

这确保了：
1. 持仓占用不会导致误判（totalEquity 不受持仓占用影响）
2. 初始余额作为收益计算的固定基准，不被自动修改
3. 结合 PR #636（使用 totalEquity）和 PR #802（不自动更新）的优点

#### Scenario: 持仓占用不触发误判
- **GIVEN** 账户初始余额 200 USDT（initialBalance = 200）
- **AND** totalWalletBalance = 200 USDT（钱包余额）
- **AND** totalUnrealizedProfit = 0 USDT（无浮盈浮亏）
- **WHEN** 开仓占用保证金 150 USDT
- **THEN** availableBalance 下降到 50 USDT
- **BUT** totalEquity = 200 + 0 = 200 USDT（总资产不变）
- **AND** 变化率 = (200 - 200) / 200 = 0%
- **AND** 不触发"大幅变化"警告
- **AND** initialBalance 保持 200 不变

#### Scenario: 盈利场景正确监控但不更新基准
- **GIVEN** 账户初始余额 200 USDT
- **AND** 持仓盈利 30 USDT
- **WHEN** 系统执行余额检查
- **THEN** totalWalletBalance = 200 USDT
- **AND** totalUnrealizedProfit = 30 USDT
- **AND** totalEquity = 230 USDT
- **AND** 变化率 = (230 - 200) / 200 = 15% > 5%
- **AND** 记录警告："检测到总资产大幅变化: 200.00 → 230.00 USDT (15.00%, 钱包: 200.00 + 未实现: 30.00)"
- **BUT** initialBalance 保持 200 不变
- **AND** 盈利 30 USDT 正确反映在收益率中

#### Scenario: 充值场景提示用户手动更新
- **GIVEN** 账户初始余额 200 USDT
- **AND** 用户充值 100 USDT
- **WHEN** 系统检测到 totalEquity 变成 300 USDT
- **THEN** 变化率 = (300 - 200) / 200 = 50% > 5%
- **AND** 记录警告："检测到总资产大幅变化"
- **AND** 提示："⚠️ 注意：初始余额保持不变，用于收益计算基准。如需重置，请通过配置界面操作。"
- **AND** initialBalance 保持 200 不变（需要用户手动更新为 300）

#### Scenario: 初始余额无效时不自动修正
- **GIVEN** 账户 initialBalance 设置为 0 或负数（配置错误）
- **WHEN** 系统执行余额检查
- **THEN** 记录警告："⚠️ 初始余额无效 (0.00)，当前总资产: 200.00 USDT (钱包: 200.00 + 未实现: 0.00)。请检查配置。"
- **AND** 不自动修改 initialBalance
- **AND** 要求用户通过配置界面修正

#### Scenario: 日志清晰显示各组成部分
- **GIVEN** 系统检测到余额变化
- **WHEN** 记录日志
- **THEN** 日志 SHALL 包含以下信息：
  - 当前总资产（totalEquity）
  - 初始余额（initialBalance）
  - 钱包余额（totalWalletBalance）
  - 未实现盈亏（totalUnrealizedProfit）
  - 变化百分比
- **EXAMPLE** "🔔 检测到总资产大幅变化: 200.00 → 230.00 USDT (15.00%, 钱包: 200.00 + 未实现: 30.00)"
