# Design: Enhance Market Data Analysis

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                       WSMonitor                                │
│  ┌────────────┬────────────┬────────────┬────────────┐       │
│  │ klines_3m  │ klines_4h  │ klines_1h  │ klines_1d  │ [NEW] │
│  │  (100条)   │  (100条)   │  (720条)   │  (90条)    │       │
│  │  5小时     │  16.7天    │  30天      │  90天      │       │
│  └────────────┴────────────┴────────────┴────────────┘       │
│           ▲            ▲            ▲            ▲            │
│       CombinedStreamsClient (WebSocket订阅)                   │
└───────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                     market.Data                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 现有: CurrentPrice, EMA20, MACD, RSI7                   │  │
│  │       IntradaySeries, LongerTermContext                 │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ 新增: HourlyEMA100, HourlyEMA200  [NEW]                │  │
│  │       DailyEMA50                    [NEW]                │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. WSMonitor 扩展 (monitor.go)

**新增字段**:
```go
type WSMonitor struct {
    // 现有字段...
    klineDataMap3m sync.Map // 保留
    klineDataMap4h sync.Map // 保留

    // 新增字段
    klineDataMap1h sync.Map // 720条小时线
    klineDataMap1d sync.Map // 90条日线
}
```

**修改配置**:
```go
// 修改前
var subKlineTime = []string{"3m", "4h"}

// 修改后
var subKlineTime = []string{"3m", "4h", "1h", "1d"}
```

**扩展初始化逻辑** (initializeHistoricalData):
```go
// 新增1h数据获取
klines1h, err := apiClient.GetKlines(symbol, "1h", 720)
if err != nil {
    log.Printf("获取 %s 历史数据失败: %v", symbol, err)
    return
}
if len(klines1h) > 0 {
    m.klineDataMap1h.Store(symbol, klines1h)
}

// 新增1d数据获取
klines1d, err := apiClient.GetKlines(symbol, "1d", 90)
if err != nil {
    log.Printf("获取 %s 历史数据失败: %v", symbol, err)
    return
}
if len(klines1d) > 0 {
    m.klineDataMap1d.Store(symbol, klines1d)
}
```

**扩展订阅逻辑** (subscribeAll):
```go
// subKlineTime已包含"1h"和"1d",循环会自动订阅
// 无需额外代码
```

**扩展路由方法** (getKlineDataMap):
```go
// 新增分支
} else if _time == "1h" {
    klineDataMap = &m.klineDataMap1h
} else if _time == "1d" {
    klineDataMap = &m.klineDataMap1d
} else {
```

### 2. Data Structure 扩展 (types.go)

**只在Data顶层新增3个字段**:
```go
type Data struct {
    // 现有字段...
    Symbol            string
    CurrentPrice      float64
    PriceChange1h     float64
    PriceChange4h     float64
    CurrentEMA20      float64
    CurrentMACD       float64
    CurrentRSI7       float64
    OpenInterest      *OIData
    FundingRate       float64
    IntradaySeries    *IntradayData
    LongerTermContext *LongerTermData

    // 新增字段
    HourlyEMA100 float64 // [NEW] 1h EMA100 (约4天周期)
    HourlyEMA200 float64 // [NEW] 1h EMA200 (约8天周期)
    DailyEMA50   float64 // [NEW] 1d EMA50 (约2.5月周期)
}
```

**不新增**: HourlyContext, DailyContext 等嵌套结构

### 3. 数据获取和计算 (data.go)

**在 Get() 中新增** (约15行):
```go
// 获取1h K线数据并计算EMA
var hourlyEMA100, hourlyEMA200 float64
klines1h, err := WSMonitorCli.GetCurrentKlines(symbol, "1h")
if err != nil {
    log.Printf("获取1h K线失败(非致命): %v", err)
} else if len(klines1h) >= 200 {
    hourlyEMA100 = calculateEMA(klines1h, 100)
    hourlyEMA200 = calculateEMA(klines1h, 200)
}

// 获取1d K线数据并计算EMA
var dailyEMA50 float64
klines1d, err := WSMonitorCli.GetCurrentKlines(symbol, "1d")
if err != nil {
    log.Printf("获取1d K线失败(非致命): %v", err)
} else if len(klines1d) >= 50 {
    dailyEMA50 = calculateEMA(klines1d, 50)
}

return &Data{
    // 现有字段...
    HourlyEMA100: hourlyEMA100, // [NEW]
    HourlyEMA200: hourlyEMA200, // [NEW]
    DailyEMA50:   dailyEMA50,   // [NEW]
}, nil
```

**不新增**: 新的计算函数,完全复用现有 `calculateEMA()`

### 4. 格式化输出 (data.go)

**在 Format() 中新增** (约8行):
```go
// 输出1h EMA指标
if data.HourlyEMA100 > 0 && data.HourlyEMA200 > 0 {
    sb.WriteString("Hourly trend indicators (1-hour timeframe, 30-day window):\n\n")
    sb.WriteString(fmt.Sprintf("100-Period EMA: %.2f vs. 200-Period EMA: %.2f\n\n",
        data.HourlyEMA100, data.HourlyEMA200))
}

// 输出1d EMA指标
if data.DailyEMA50 > 0 {
    sb.WriteString("Daily trend indicators (1-day timeframe, 90-day window):\n\n")
    sb.WriteString(fmt.Sprintf("50-Period EMA: %.2f\n\n", data.DailyEMA50))
}
```

## Data Flow

```
用户请求 market.Get("BTCUSDT")
    │
    ├──> GetCurrentKlines("BTCUSDT", "3m")  [现有]
    ├──> GetCurrentKlines("BTCUSDT", "4h")  [现有]
    ├──> GetCurrentKlines("BTCUSDT", "1h")  [新增]
    └──> GetCurrentKlines("BTCUSDT", "1d")  [新增]
    │
    ├──> calculateIntradaySeries(klines3m)    [现有]
    ├──> calculateLongerTermData(klines4h)    [现有]
    ├──> calculateEMA(klines1h, 100)          [新增,复用]
    ├──> calculateEMA(klines1h, 200)          [新增,复用]
    └──> calculateEMA(klines1d, 50)           [新增,复用]
    │
    └──> 返回 market.Data (包含 HourlyEMA100/200, DailyEMA50)
```

## Change Summary

### 文件改动统计

| 文件 | 新增行 | 修改行 | 说明 |
|------|--------|--------|------|
| `market/monitor.go` | ~30 | 1 | 新增1h/1d数据获取和订阅 |
| `market/types.go` | 3 | 0 | Data结构新增3个字段 |
| `market/data.go` | ~20 | 0 | 获取1h/1d数据,计算EMA,输出 |
| **总计** | **~53行** | **1行** | **极小改动** |

### 核心改动点

1. ✅ monitor.go:35 - 修改 `subKlineTime` 加入"1h","1d"
2. ✅ monitor.go:18 - 新增 `klineDataMap1h` 字段
3. ✅ monitor.go:19 - 新增 `klineDataMap1d` 字段
4. ✅ monitor.go:93 - 新增1h/1d历史数据获取逻辑
5. ✅ monitor.go:181 - 扩展 `getKlineDataMap()` 路由
6. ✅ types.go:17 - 新增 `HourlyEMA100`, `HourlyEMA200`, `DailyEMA50` 字段
7. ✅ data.go:42 - 获取1h/1d数据,计算EMA
8. ✅ data.go:464 - 输出新增指标

## Error Handling

**降级策略**: 1d数据获取失败时不影响现有功能

```go
klines1d, err := WSMonitorCli.GetCurrentKlines(symbol, "1d")
if err != nil {
    log.Printf("获取日线K线失败(非致命): %v", err)
    // DailyEMA100/200 保持为0
    // 返回的Data结构其他字段正常
}
```

## Performance Impact

| 指标 | 影响 |
|------|------|
| 内存 | +80KB/币种 (300币种 ≈ 24MB) |
| 初始化时间 | +2个API调用/币种 (~1s × 300/5 并发 ≈ 60s) |
| 运行时CPU | +3次EMA计算 (<2ms) |
| WebSocket | +2个流/币种 (无额外成本) |

## Migration Strategy

无需迁移,新字段默认为0,现有代码完全兼容。

## Testing Strategy

**只需基础验证**:
1. 手动测试: 启动系统,验证1d数据正常获取
2. 手动测试: 调用 `market.Get()`,检查 DailyEMA100/200 有值
3. 手动测试: 对比TradingView验证EMA计算正确性

**不需要**:
- ❌ 单元测试覆盖率要求
- ❌ 性能压测
- ❌ 文档更新

## Rollback Plan

```go
// 如需回滚,只需3步:
// 1. 恢复 subKlineTime = []string{"3m", "4h"}
// 2. 删除 klineDataMap1d 相关代码
// 3. 删除 DailyEMA100/200 字段
```

现有功能完全不受影响。
