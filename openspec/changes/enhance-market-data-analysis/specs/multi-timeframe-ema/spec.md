# Spec: Multi-Timeframe EMA Indicators

## ADDED Requirements

### Requirement: 支持1小时和日线K线数据获取

系统MUST支持获取和存储1h(720条/30天)和1d(90条/90天)两个时间周期的K线数据,用于周级别和月级别趋势分析。

#### Scenario: 初始化时获取1h和1d历史数据

**Given** 系统启动时初始化市场监控器
**And** 交易对列表包含"BTCUSDT"
**When** 执行 `initializeHistoricalData()`
**Then** 系统应调用 `APIClient.GetKlines("BTCUSDT", "1h", 720)`
**And** 系统应调用 `APIClient.GetKlines("BTCUSDT", "1d", 90)`
**And** 数据应分别存储到 `klineDataMap1h` 和 `klineDataMap1d`

---

### Requirement: 支持基于多时间周期计算EMA指标

系统MUST支持基于1h数据计算EMA100/200,基于1d数据计算EMA50。

#### Scenario: 计算1h EMA100和EMA200

**Given** 系统已获取"BTCUSDT"的720条1h K线数据
**When** 调用 `market.Get("BTCUSDT")`
**Then** 应调用 `calculateEMA(klines1h, 100)` 计算EMA100
**And** 应调用 `calculateEMA(klines1h, 200)` 计算EMA200
**And** 返回的 `Data.HourlyEMA100` 和 `Data.HourlyEMA200` 应为非零正数

---

## MODIFIED Requirements

### Requirement: 扩展subKlineTime支持1h和1d

系统MUST扩展 `subKlineTime` 配置以支持1h和1d时间周期。

**原规范**: `subKlineTime = []string{"3m", "4h"}`
**修改为**: `subKlineTime = []string{"3m", "4h", "1h", "1d"}`

#### Scenario: 自动订阅1h和1d流

**Given** `subKlineTime` 包含 `["3m", "4h", "1h", "1d"]`
**And** 系统监控交易对 `["BTCUSDT"]`
**When** 执行 `subscribeAll()`
**Then** 系统应订阅 `btcusdt@kline_1h` 和 `btcusdt@kline_1d` 流

---

## REMOVED Requirements

无移除的需求。
