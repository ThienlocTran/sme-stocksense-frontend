<script setup>
import { computed } from "vue";
import ApexCharts from "vue3-apexcharts";

defineOptions({
  components: { ApexCharts },
});

const props = defineProps({
  currentStock: {
    type: Number,
    required: true,
  },
  dailyForecast: {
    type: Array,
    default: () => [],
  },
  effectiveMinStock: {
    type: Number,
    required: true,
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

const projectedPoints = computed(() => {
  const points = [];
  let stock = props.currentStock;

  // Day 0: Boundary/Today
  const baseTime = props.boundaryDate ? new Date(props.boundaryDate).getTime() : Date.now();
  points.push({
    x: baseTime,
    y: stock,
  });

  // Calculate points daily
  for (let i = 0; i < props.dailyForecast.length; i++) {
    const f = props.dailyForecast[i];
    stock = stock - f.predictedQuantity;
    points.push({
      x: new Date(f.date).getTime(),
      y: stock,
    });
  }

  return points;
});

const breachInfo = computed(() => {
  let stock = props.currentStock;
  for (let i = 0; i < props.dailyForecast.length; i++) {
    const f = props.dailyForecast[i];
    stock = stock - f.predictedQuantity;
    if (stock < props.effectiveMinStock) {
      return {
        breached: true,
        date: f.date,
        formattedDate: new Date(f.date).toLocaleDateString("vi-VN"),
      };
    }
  }
  return { breached: false };
});

const series = computed(() => {
  const visualData = projectedPoints.value.map((pt) => ({
    x: pt.x,
    y: Math.max(0, pt.y),
  }));
  return [
    {
      name: "Tồn kho dự kiến",
      data: visualData,
    },
  ];
});

const chartOptions = computed(() => {
  const annotations = [];
  if (props.effectiveMinStock !== null && props.effectiveMinStock !== undefined) {
    annotations.push({
      y: props.effectiveMinStock,
      borderColor: "#ef4444",
      strokeDashArray: 6,
      label: {
        borderColor: "#ef4444",
        style: {
          color: "#fff",
          background: "#ef4444",
        },
        text: `Mức an toàn tối thiểu (${props.effectiveMinStock})`,
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
      width: 3,
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
      title: { text: "Tồn kho" },
      labels: {
        formatter: (val) => Math.round(val),
      },
    },
    colors: ["#2563eb"],
    annotations: {
      yaxis: annotations,
    },
    tooltip: {
      x: { format: "dd/MM/yyyy" },
    },
  };
});
</script>

<template>
  <div class="projected-inventory-chart">
    <template v-if="dailyForecast.length">
      <!-- Safety/Breach Banner -->
      <div v-if="breachInfo.breached" class="p-3 mb-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs font-semibold flex items-center gap-1.5">
        <i class="mdi mdi-alert-circle text-red-500 text-base"></i>
        <span>Cảnh báo: Tồn kho dự kiến sẽ giảm dưới mức tối thiểu an toàn vào ngày {{ breachInfo.formattedDate }}.</span>
      </div>
      <div v-else class="p-3 mb-4 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-900/30 text-xs font-semibold flex items-center gap-1.5">
        <i class="mdi mdi-check-circle text-green-500 text-base"></i>
        <span>Tồn kho được dự báo ở mức an toàn trong suốt chu kỳ {{ horizonDays }} ngày tới.</span>
      </div>

      <!-- Chart -->
      <ApexCharts type="line" :options="chartOptions" :series="series" height="300" />
    </template>

    <div v-else class="py-12 text-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/10 rounded border border-dashed border-zinc-300 dark:border-zinc-700">
      Chưa có dữ liệu dự báo theo ngày.
    </div>
  </div>
</template>
