# Tasks: Enhance Market Data Analysis

精简版任务清单，只包含核心实现步骤。

---

## Task 1: 扩展WSMonitor支持1h和1d数据

**文件**: `market/monitor.go`

**改动**:
1. 新增字段 (line ~18):
   ```go
   klineDataMap1h sync.Map
   klineDataMap1d sync.Map
   ```

2. 修改配置 (line ~35):
   ```go
   var subKlineTime = []string{"3m", "4h", "1h", "1d"}
   ```

3. 在 `initializeHistoricalData()` 中新增 (line ~93之后):
   ```go
   // 1h数据
   klines1h, _ := apiClient.GetKlines(s, "1h", 720)
   if len(klines1h) > 0 {
       m.klineDataMap1h.Store(s, klines1h)
   }

   // 1d数据
   klines1d, _ := apiClient.GetKlines(s, "1d", 90)
   if len(klines1d) > 0 {
       m.klineDataMap1d.Store(s, klines1d)
   }
   ```

4. 在 `getKlineDataMap()` 中新增 (line ~181):
   ```go
   } else if _time == "1h" {
       klineDataMap = &m.klineDataMap1h
   } else if _time == "1d" {
       klineDataMap = &m.klineDataMap1d
   } else {
   ```

**预计时间**: 20分钟

---

## Task 2: 扩展Data结构

**文件**: `market/types.go`

**改动** (line ~17):
```go
type Data struct {
    // 现有字段...

    // 新增
    HourlyEMA100 float64
    HourlyEMA200 float64
    DailyEMA50   float64
}
```

**预计时间**: 2分钟

---

## Task 3: 集成数据获取和EMA计算

**文件**: `market/data.go`

**改动** (在line ~42之后):
```go
// 1h EMA
var hourlyEMA100, hourlyEMA200 float64
klines1h, err := WSMonitorCli.GetCurrentKlines(symbol, "1h")
if err == nil && len(klines1h) >= 200 {
    hourlyEMA100 = calculateEMA(klines1h, 100)
    hourlyEMA200 = calculateEMA(klines1h, 200)
}

// 1d EMA
var dailyEMA50 float64
klines1d, err := WSMonitorCli.GetCurrentKlines(symbol, "1d")
if err == nil && len(klines1d) >= 50 {
    dailyEMA50 = calculateEMA(klines1d, 50)
}

return &Data{
    // 现有字段...
    HourlyEMA100: hourlyEMA100,
    HourlyEMA200: hourlyEMA200,
    DailyEMA50:   dailyEMA50,
}, nil
```

**预计时间**: 10分钟

---

## Task 4: 扩展Format输出

**文件**: `market/data.go`

**改动** (在line ~464之后):
```go
if data.HourlyEMA100 > 0 && data.HourlyEMA200 > 0 {
    sb.WriteString("Hourly trend indicators (1-hour timeframe, 30-day window):\n\n")
    sb.WriteString(fmt.Sprintf("100-Period EMA: %.2f vs. 200-Period EMA: %.2f\n\n",
        data.HourlyEMA100, data.HourlyEMA200))
}

if data.DailyEMA50 > 0 {
    sb.WriteString("Daily trend indicators (1-day timeframe, 90-day window):\n\n")
    sb.WriteString(fmt.Sprintf("50-Period EMA: %.2f\n\n", data.DailyEMA50))
}
```

**预计时间**: 5分钟

---

## Task 5: 功能验证

**验证步骤**:

1. **编译**: `go build ./market/...`
2. **启动系统**: 检查日志包含 "已加载 XXX 的历史K线数据-1h/1d"
3. **调用API**: `market.Get("BTCUSDT")` 检查EMA字段有值
4. **对比TradingView**: 验证EMA100/200/50准确性(误差<0.5%)

**预计时间**: 15分钟

---

## 总计

**开发**: 37分钟
**验证**: 15分钟
**总计**: ~50分钟

---

## 改动总结

| 文件 | 新增 | 修改 |
|------|------|------|
| monitor.go | ~30行 | 1行 |
| types.go | 3行 | 0行 |
| data.go | ~20行 | 0行 |
| **总计** | **~53行** | **1行** |

**极小改动，merge冲突风险极低。**
