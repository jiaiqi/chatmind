export function getChartTheme(isDark: boolean) {
  const textColor = isDark ? '#c9d1d9' : '#333333'
  const textSecondary = isDark ? '#8b949e' : '#666666'
  const axisColor = isDark ? '#30363d' : '#e0e0e0'
  const tooltipBg = isDark ? '#161b22' : '#ffffff'
  const tooltipBorder = isDark ? '#30363d' : '#e0e0e0'

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    title: { textStyle: { color: textColor } },
    legend: {
      textStyle: { color: textSecondary },
      pageTextStyle: { color: textSecondary },
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: textColor },
    },
    xAxis: {
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textSecondary },
      splitLine: { lineStyle: { color: isDark ? 'rgba(48,54,61,0.5)' : '#f0f0f0' } },
    },
    yAxis: {
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textSecondary },
      splitLine: { lineStyle: { color: isDark ? 'rgba(48,54,61,0.5)' : '#f0f0f0' } },
    },
    visualMap: {
      textStyle: { color: textSecondary },
    },
    calendar: {
      itemStyle: { borderColor: isDark ? '#0d1117' : '#fff' },
      splitLine: { lineStyle: { color: axisColor } },
      dayLabel: { color: textSecondary },
      monthLabel: { color: textSecondary },
      yearLabel: { color: textColor },
    },
  }
}

function merge(base: any, override: any): any {
  if (override === null || override === undefined) return base
  if (Array.isArray(override)) return override
  if (typeof override !== 'object') return override
  const result = { ...(base || {}) }
  for (const key of Object.keys(override)) {
    result[key] = merge(base?.[key], override[key])
  }
  return result
}

export function buildChartOption(isDark: boolean, option: any): any {
  return merge(getChartTheme(isDark), option)
}
