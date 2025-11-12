package decision

import (
	"nofx/logger"
	"nofx/market"
	"strings"
	"testing"
)

func TestInferFailureReason_HighFundingRate(t *testing.T) {
	marketData := &market.Data{
		FundingRate: 0.0008, // 0.08%
	}

	outcome := logger.TradeOutcome{
		Symbol:     "BTCUSDT",
		Side:       "long",
		OpenPrice:  60000,
		ClosePrice: 59200,
		PnLPct:     -5.2,
		Leverage:   10,
	}

	reason := InferFailureReason(outcome, marketData)
	// 新格式包含置信度标注
	if !strings.Contains(reason, "资金费率0.080%过高") {
		t.Errorf("Expected funding rate reason, got: %s", reason)
	}
}

func TestInferFailureReason_MACDDivergence(t *testing.T) {
	marketData := &market.Data{
		CurrentPrice: 2820, // ETH价格
		CurrentMACD:  -2.5, // 超过相对阈值: 2820 * 0.0005 = 1.41
	}

	outcome := logger.TradeOutcome{
		Symbol:     "ETHUSDT",
		Side:       "long",
		OpenPrice:  2850,
		ClosePrice: 2790,
		PnLPct:     -4.1,
		Leverage:   5,
	}

	reason := InferFailureReason(outcome, marketData)
	// MACD绝对值超过阈值,应该触发(现在可能包含多个因素)
	if !strings.Contains(reason, "MACD死叉") {
		t.Errorf("Expected MACD divergence reason, got: %s", reason)
	}
}

func TestInferFailureReason_TrendReversal(t *testing.T) {
	marketData := &market.Data{
		PriceChange4h: -6.5,
	}

	outcome := logger.TradeOutcome{
		Symbol:     "SOLUSDT",
		Side:       "long",
		OpenPrice:  150,
		ClosePrice: 145,
		PnLPct:     -6.7,
		Leverage:   10,
	}

	reason := InferFailureReason(outcome, marketData)
	// 新格式可能包含多因素,只检查是否包含趋势反转信息
	if !strings.Contains(reason, "4h下跌6.5%") {
		t.Errorf("Expected trend reversal in reason, got: %s", reason)
	}
}

func TestInferFailureReason_FakeBreakout(t *testing.T) {
	marketData := &market.Data{
		CurrentMACD:   0,
		PriceChange4h: 0,
	}

	outcome := logger.TradeOutcome{
		Symbol:     "BTCUSDT",
		Side:       "long",
		OpenPrice:  60000,
		ClosePrice: 58800, // -2%
		PnLPct:     -4.0,
		Leverage:   5,
	}

	reason := InferFailureReason(outcome, marketData)
	// 新格式包含置信度标注
	if !strings.Contains(reason, "假突破回落") {
		t.Errorf("Expected fake breakout reason, got: %s", reason)
	}
}

func TestInferFailureReason_NoMarketData(t *testing.T) {
	outcome := logger.TradeOutcome{
		Symbol:     "BTCUSDT",
		Side:       "long",
		OpenPrice:  60000,
		ClosePrice: 59200,
		PnLPct:     -3.0,
	}

	reason := InferFailureReason(outcome, nil)
	// 新格式返回"止损触发(原因不明)"
	if reason != "止损触发(原因不明)" {
		t.Errorf("Expected default reason, got: %s", reason)
	}
}

func TestFormatFailureCase(t *testing.T) {
	outcome := logger.TradeOutcome{
		Symbol:        "BTCUSDT",
		Side:          "long",
		OpenPrice:     60000,
		ClosePrice:    59200,
		PnLPct:        -5.2,
		FailureReason: "资金费率0.08%过高",
	}

	result := FormatFailureCase(outcome, 1)
	expected := "1. BTCUSDT多单止损: 60000→59200, -5.2%, 原因:资金费率0.08%过高"
	if result != expected {
		t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
	}
}

func TestFormatFailureCase_SmallPrice(t *testing.T) {
	outcome := logger.TradeOutcome{
		Symbol:        "SHIBUSDT",
		Side:          "long",
		OpenPrice:     0.00001234,
		ClosePrice:    0.00001,
		PnLPct:        -7.5,
		FailureReason: "RSI严重超买",
	}

	result := FormatFailureCase(outcome, 1)
	expected := "1. SHIBUSDT多单止损: 1.23e-05→1.00e-05, -7.5%, 原因:RSI严重超买"
	if result != expected {
		t.Errorf("Expected:\n%s\nGot:\n%s", expected, result)
	}
}

func TestSelectTopFailureCases_WithSignificantLosses(t *testing.T) {
	failures := []logger.TradeOutcome{
		{Symbol: "BTC", PnLPct: -5.0},
		{Symbol: "ETH", PnLPct: -2.0},
		{Symbol: "SOL", PnLPct: -4.0},
		{Symbol: "DOGE", PnLPct: -1.5},
	}

	result := SelectTopFailureCases(failures, 3)
	if len(result) != 2 { // 只有2个>3%的亏损
		t.Errorf("Expected 2 significant failures, got %d", len(result))
	}
	if result[0].Symbol != "BTC" || result[1].Symbol != "SOL" {
		t.Errorf("Expected BTC and SOL, got %v", result)
	}
}

func TestSelectTopFailureCases_LimitToMax(t *testing.T) {
	failures := make([]logger.TradeOutcome, 10)
	for i := 0; i < 10; i++ {
		failures[i] = logger.TradeOutcome{
			Symbol: "TEST",
			PnLPct: -5.0,
		}
	}

	result := SelectTopFailureCases(failures, 3)
	if len(result) != 3 {
		t.Errorf("Expected 3 failures (max), got %d", len(result))
	}
}

func TestSelectTopFailureCases_EmptyInput(t *testing.T) {
	result := SelectTopFailureCases([]logger.TradeOutcome{}, 5)
	if len(result) != 0 {
		t.Errorf("Expected empty result, got %d items", len(result))
	}
}
