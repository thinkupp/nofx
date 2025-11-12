import { useState } from 'react'
import useSWR from 'swr'
import { api } from '../lib/api'
import type { LLMCallRecord } from '../types'
import { Brain, CheckCircle, XCircle, Clock, TrendingUp, Activity, Copy, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function LLMCallsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<LLMCallRecord | null>(
    null
  )
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [pendingRecordId, setPendingRecordId] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    system: false,
    user: false,
    response: false,
    error: false
  })
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  // 切换展开/折叠
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // 获取记录列表
  const { data, error, isLoading } = useSWR(
    ['llm-calls', page, pageSize, selectedStatus, selectedProvider],
    () =>
      api.getLLMCalls({
        page,
        page_size: pageSize,
        status: selectedStatus,
        model_provider: selectedProvider,
      }),
    { refreshInterval: 10000 }
  )

  // 获取统计信息
  const { data: stats } = useSWR('llm-call-stats', () => api.getLLMCallStats())

  // 格式化时间
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr)
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
    } catch {
      return timeStr
    }
  }

  // 格式化持续时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 加载详情
  const loadDetail = async (recordId: number) => {
    setLoadingDetail(true)
    setDetailError(null)
    try {
      // 调用详情接口获取完整数据（包含 system_prompt, user_prompt, response_content）
      const fullRecord = await api.getLLMCallDetail(recordId)
      setSelectedRecord(fullRecord)
      setPendingRecordId(null)
    } catch (err) {
      console.error('获取详情失败:', err)
      setDetailError(err instanceof Error ? err.message : '加载失败')
      setPendingRecordId(recordId)
    } finally {
      setLoadingDetail(false)
    }
  }

  // 显示详情弹窗
  const showDetail = async (record: LLMCallRecord) => {
    loadDetail(record.id)
  }

  // 重试加载详情
  const retryLoadDetail = () => {
    if (pendingRecordId !== null) {
      loadDetail(pendingRecordId)
    }
  }

  // 关闭详情弹窗
  const closeDetail = () => {
    setSelectedRecord(null)
    setDetailError(null)
    setPendingRecordId(null)
    // 重置折叠状态
    setExpandedSections({
      system: false,
      user: false,
      response: false,
      error: false
    })
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return <CheckCircle className="w-5 h-5" style={{ color: 'var(--binance-green)' }} />
    }
    return <XCircle className="w-5 h-5" style={{ color: 'var(--binance-red)' }} />
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    if (status === 'success') return 'var(--binance-green)'
    return 'var(--binance-red)'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F0B90B 0%, #FCD535 100%)',
              boxShadow: '0 4px 14px rgba(240, 185, 11, 0.4)',
            }}
          >
            <Brain className="w-7 h-7" style={{ color: '#000' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              模型用量
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              查看AI模型的调用历史和性能统计
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="binance-card p-5 hover:border-[var(--panel-border-hover)] transition-all"
            style={{ background: 'var(--panel-bg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                总调用次数
              </div>
              <Activity className="w-5 h-5 opacity-30" style={{ color: 'var(--brand-yellow)' }} />
            </div>
            <div className="text-2xl font-bold mono" style={{ color: 'var(--text-primary)' }}>
              {stats.total_calls.toLocaleString()}
            </div>
          </div>

          <div
            className="binance-card p-5 hover:border-[var(--panel-border-hover)] transition-all"
            style={{ background: 'var(--panel-bg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                成功率
              </div>
              <CheckCircle className="w-5 h-5 opacity-30" style={{ color: 'var(--binance-green)' }} />
            </div>
            <div className="text-2xl font-bold mono" style={{ color: 'var(--binance-green)' }}>
              {stats.total_calls > 0
                ? ((stats.success_calls / stats.total_calls) * 100).toFixed(1)
                : 0}%
            </div>
          </div>

          <div
            className="binance-card p-5 hover:border-[var(--panel-border-hover)] transition-all"
            style={{ background: 'var(--panel-bg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                总Token消耗
              </div>
              <TrendingUp className="w-5 h-5 opacity-30" style={{ color: 'var(--brand-yellow)' }} />
            </div>
            <div className="text-2xl font-bold mono" style={{ color: 'var(--text-primary)' }}>
              {stats.total_tokens.toLocaleString()}
            </div>
          </div>

          <div
            className="binance-card p-5 hover:border-[var(--panel-border-hover)] transition-all"
            style={{ background: 'var(--panel-bg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                平均响应时间
              </div>
              <Clock className="w-5 h-5 opacity-30" style={{ color: 'var(--brand-yellow)' }} />
            </div>
            <div className="text-2xl font-bold mono" style={{ color: 'var(--text-primary)' }}>
              {formatDuration(stats.avg_duration_ms)}
            </div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="binance-card p-5" style={{ background: 'var(--panel-bg)' }}>
        <div className="flex flex-wrap gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              状态
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              提供商
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">全部</option>
              <option value="deepseek">DeepSeek</option>
              <option value="qwen">Qwen</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="binance-card overflow-hidden" style={{ background: 'var(--panel-bg)' }}>
        {isLoading ? (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-transparent"
              style={{
                borderTopColor: 'var(--brand-yellow)',
                borderRightColor: 'var(--brand-yellow)',
              }}
            ></div>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--binance-red)' }}>加载失败: {error.message}</p>
          </div>
        ) : !data || data.records.length === 0 ? (
          <div className="text-center py-12">
            <Brain
              className="w-16 h-16 mx-auto mb-4 opacity-20"
              style={{ color: 'var(--text-secondary)' }}
            />
            <p style={{ color: 'var(--text-secondary)' }}>暂无调用记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      状态
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      模型
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Token
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      耗时
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      时间
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record: LLMCallRecord, index: number) => (
                    <tr
                      key={record.id}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom:
                          index < data.records.length - 1
                            ? '1px solid var(--panel-border)'
                            : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--panel-bg-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                      onClick={() => showDetail(record)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span
                            className="text-sm font-semibold"
                            style={{ color: getStatusColor(record.status) }}
                          >
                            {record.status === 'success' ? '成功' : '失败'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {record.model_provider}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {record.model_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium mono" style={{ color: 'var(--text-primary)' }}>
                          {record.total_tokens.toLocaleString()}
                        </div>
                        <div className="text-xs mono" style={{ color: 'var(--text-secondary)' }}>
                          {record.input_tokens} / {record.output_tokens}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium mono" style={{ color: 'var(--text-primary)' }}>
                          {formatDuration(record.duration_ms)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatTime(record.request_time)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="text-sm font-medium transition-opacity hover:opacity-70"
                          style={{ color: 'var(--brand-yellow)' }}
                        >
                          查看详情
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data.total > pageSize && (
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--panel-border)' }}
              >
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  共 {data.total} 条记录，当前第 {page} 页，共 {Math.ceil(data.total / pageSize)} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    上一页
                  </button>
                  <button
                    onClick={() =>
                      setPage(Math.min(Math.ceil(data.total / pageSize), page + 1))
                    }
                    disabled={page >= Math.ceil(data.total / pageSize)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情弹窗 */}
      {(selectedRecord || loadingDetail || detailError) && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={closeDetail}
        >
          <div
            className="binance-card max-w-6xl w-full h-[90vh] flex flex-col"
            style={{ background: 'var(--panel-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail ? (
              <div className="p-12 text-center">
                <div
                  className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-transparent mb-4"
                  style={{
                    borderTopColor: 'var(--brand-yellow)',
                    borderRightColor: 'var(--brand-yellow)',
                  }}
                ></div>
                <p style={{ color: 'var(--text-secondary)' }}>加载详情中...</p>
              </div>
            ) : detailError ? (
              <div className="p-12 text-center">
                <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--binance-red)' }} />
                <p className="text-lg mb-4" style={{ color: 'var(--binance-red)' }}>{detailError}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={retryLoadDetail}
                    className="px-6 py-2 font-medium rounded-lg transition-all hover:opacity-80 flex items-center gap-2"
                    style={{
                      background: 'var(--brand-yellow)',
                      color: '#000',
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                  <button
                    onClick={closeDetail}
                    className="px-6 py-2 font-medium rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : selectedRecord ? (
            <div className="flex flex-col h-full">
              {/* 头部固定区域 */}
              <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--panel-border)' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  调用详情
                </h2>
                <button
                  onClick={closeDetail}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--background)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* 对话内容区域 - 聊天流式布局 */}
              <div className="flex-1 overflow-y-auto px-6 py-4" style={{ background: 'var(--background)' }}>
                <div className="space-y-4">
                  {/* System Prompt */}
                  {selectedRecord.system_prompt && (() => {
                    const lines = selectedRecord.system_prompt.split('\n').length
                    const isLong = lines > 5
                    return (
                      <div className="rounded-xl" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                <span className="text-xs">🤖</span>
                              </div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                系统提示词
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)' }}>
                                System
                              </span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(selectedRecord.system_prompt, 'system')}
                              className="p-1.5 rounded-lg transition-all hover:bg-[var(--background)]"
                              style={{ color: copiedSection === 'system' ? 'var(--binance-green)' : 'var(--text-secondary)' }}
                            >
                              {copiedSection === 'system' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                            <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${!expandedSections.system && isLong ? 'line-clamp-5' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {selectedRecord.system_prompt}
                            </pre>
                          </div>
                          {isLong && (
                            <button
                              onClick={() => toggleSection('system')}
                              className="mt-2 text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {expandedSections.system ? (
                                <>收起 <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>展开 <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* User Prompt */}
                  {selectedRecord.user_prompt && (() => {
                    const lines = selectedRecord.user_prompt.split('\n').length
                    const isLong = lines > 5
                    return (
                      <div className="rounded-xl" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <span className="text-xs">👤</span>
                              </div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                用户输入
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)' }}>
                                User
                              </span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(selectedRecord.user_prompt, 'user')}
                              className="p-1.5 rounded-lg transition-all hover:bg-[var(--background)]"
                              style={{ color: copiedSection === 'user' ? 'var(--binance-green)' : 'var(--text-secondary)' }}
                            >
                              {copiedSection === 'user' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                            <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${!expandedSections.user && isLong ? 'line-clamp-5' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {selectedRecord.user_prompt}
                            </pre>
                          </div>
                          {isLong && (
                            <button
                              onClick={() => toggleSection('user')}
                              className="mt-2 text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {expandedSections.user ? (
                                <>收起 <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>展开 <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* AI响应内容 */}
                  {selectedRecord.status === 'success' && selectedRecord.response_content && (() => {
                    const lines = selectedRecord.response_content.split('\n').length
                    const isLong = lines > 5
                    return (
                      <div className="rounded-xl" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(240, 185, 11, 0.1)' }}>
                                <span className="text-xs">✨</span>
                              </div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                AI 响应
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(240, 185, 11, 0.1)', color: 'var(--brand-yellow)' }}>
                                Assistant
                              </span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(selectedRecord.response_content, 'response')}
                              className="p-1.5 rounded-lg transition-all hover:bg-[var(--background)]"
                              style={{ color: copiedSection === 'response' ? 'var(--binance-green)' : 'var(--text-secondary)' }}
                            >
                              {copiedSection === 'response' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'var(--background)' }}>
                            <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${!expandedSections.response && isLong ? 'line-clamp-5' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {selectedRecord.response_content}
                            </pre>
                          </div>
                          {isLong && (
                            <button
                              onClick={() => toggleSection('response')}
                              className="mt-2 text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {expandedSections.response ? (
                                <>收起 <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>展开 <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 错误信息 */}
                  {selectedRecord.status === 'failed' && (() => {
                    const lines = selectedRecord.error_message ? selectedRecord.error_message.split('\n').length : 0
                    const isLong = lines > 5
                    return (
                      <div className="rounded-xl" style={{ background: 'var(--panel-bg)', border: '1px solid rgba(246, 70, 93, 0.3)' }}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(246, 70, 93, 0.1)' }}>
                                <span className="text-xs">⚠️</span>
                              </div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                错误信息
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(246, 70, 93, 0.1)', color: 'var(--binance-red)' }}>
                                Error
                              </span>
                            </div>
                            {selectedRecord.error_message && (
                              <button
                                onClick={() => copyToClipboard(selectedRecord.error_message, 'error')}
                                className="p-1.5 rounded-lg transition-all hover:bg-[var(--background)]"
                                style={{ color: copiedSection === 'error' ? 'var(--binance-green)' : 'var(--text-secondary)' }}
                              >
                                {copiedSection === 'error' ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'rgba(246, 70, 93, 0.05)' }}>
                            {selectedRecord.error_message ? (
                              <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${!expandedSections.error && isLong ? 'line-clamp-5' : ''}`} style={{ color: 'var(--binance-red)' }}>
                                {selectedRecord.error_message}
                              </pre>
                            ) : (
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                未记录错误详情
                              </p>
                            )}
                          </div>
                          {isLong && (
                            <button
                              onClick={() => toggleSection('error')}
                              className="mt-2 text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {expandedSections.error ? (
                                <>收起 <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>展开 <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 底部固定按钮 */}
              <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                <button
                  onClick={closeDetail}
                  className="w-full px-6 py-2 font-medium rounded-lg transition-all hover:opacity-80"
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
