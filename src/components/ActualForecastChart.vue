<script setup>
import { computed } from "vue";
import ApexCharts from "vue3-apexcharts";

defineOptions({
  components: { ApexCharts },
});

const props = defineProps({
  historical: {
    type: Array,
    default: () => [],
  },
  forecast: {
    type: Array,
    default: () => [],
  },
  boundaryDate: {
    type: String,
    default: "",
  },
  horizonDays: {
    type: Number,
    default: 30,
  },
});

const series = computed(() => {
  const actualData = props.historical.map((p) => ({
    x: new Date(p.date).getTime(),
    y: p.quantity,
  }));
  const forecastData = props.forecast.map((p) => ({
    x: new Date(p.date).getTime(),
    y: p.predictedQuantity,
  }));

  return [
    {
      name: "Doanh số thực tế",
      data: actualData,
    },
    {
      name: "Dự báo nhu cầu",
      data: forecastData,
    },
  ];
});

const chartOptions = computed(() => {
  const annotations = [];
  if (props.boundaryDate) {
    annotations.push({
      x: new Date(props.boundaryDate).getTime(),
      strokeDashArray: 4,
      borderColor: "#f59e0b",
      borderWidth: 2,
      label: {
        borderColor: "#f59e0b",
        style: {
          color: "#fff",
          background: "#f59e0b",
        },
        text: "Hôm nay / Mốc dự báo",
      },
    });
  }

  return {
    chart: {
      type: "line",
      fontFamily: "inherit",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3],
      dashArray: [0, 5],
    },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false,
        format: "dd/MM",
      },
    },
    yaxis: {
      min: 0,
      title: { text: "Số lượng" },
      labels: {
        formatter: (val) => Math.round(val),
      },
    },
    colors: ["#2563eb", "#10b981"],
    annotations: {
      xaxis: annotations,
    },
    tooltip: {
      x: { format: "dd/MM/yyyy" },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
    },
  };
});
</script>

<template>
  <div class="actual-forecast-chart">
    <div v-if="!historical.length && !forecast.length" class="py-12 text-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/10 rounded border border-dashed border-zinc-300 dark:border-zinc-700">
      Chưa có dữ liệu dự báo theo ngày.
    </div>
    <ApexCharts v-else type="line" :options="chartOptions" :series="series" height="300" />
  </div>
</template>
