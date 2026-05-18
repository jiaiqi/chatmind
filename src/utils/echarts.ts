import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart, LineChart, PieChart, HeatmapChart, ScatterChart,
} from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, VisualMapComponent, CalendarComponent,
} from 'echarts/components'
import 'echarts-wordcloud'

export function registerECharts() {
  use([
    CanvasRenderer,
    BarChart, LineChart, PieChart, HeatmapChart, ScatterChart,
    GridComponent, TooltipComponent, LegendComponent,
    TitleComponent, VisualMapComponent, CalendarComponent,
  ])
}
