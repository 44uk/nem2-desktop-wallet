<template>
  <div class="line_chart_container" @mouseout="mouseoutLine">
    <Spin size="large" class="absolute" fix v-if="spinShow"></Spin>
    <div class="line" id="id" ref="dom"></div>
  </div>
</template>

<script lang="ts">
    import {LineChartTs} from '@/common/vue/line-chart/LineChartTs.ts'

    export default class LineChart extends LineChartTs {
    }
</script>
<style scoped lang="less">
  @import "LineChart.less";
</style>
