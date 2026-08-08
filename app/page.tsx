"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import Papa from "papaparse";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Download,
  FileSpreadsheet,
  Globe2,
  Info,
  Languages,
  Maximize2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

type Lang = "zh" | "en";
type Metric = "joint" | "anxiety" | "suicide" | "divergence";
type Datum = {
  country_code: string;
  country_name: string;
  year: number;
  suicide_rate: number;
  anxiety_disorder_prevalence: number;
  continent: string;
};

type RankedCountry = {
  code: string;
  name: string;
  continent: string;
  suicide: number;
  anxiety: number;
  suicideRank: number;
  anxietyRank: number;
  suicidePct: number;
  anxietyPct: number;
  burden: number;
  change: number;
  joint: number;
  divergence: number;
  suicideChange: number;
  anxietyChange: number;
};

type ChartProps = {
  option: echarts.EChartsOption;
  className?: string;
  onClick?: (params: unknown) => void;
};

const worldGeo = feature(
  worldAtlas as unknown as Parameters<typeof feature>[0],
  (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries,
) as unknown as GeoJSON.FeatureCollection;

let worldRegistered = false;
if (!worldRegistered) {
  echarts.registerMap("mind-world", worldGeo as never);
  worldRegistered = true;
}

const copy = {
  zh: {
    brand: "SYSU3DAILAB // MIND ATLAS",
    kicker: "GLOBAL MENTAL BURDEN OBSERVATORY",
    title: "全球心理健康负担\n交互式观测台",
    subtitle: "将焦虑患病率与自杀死亡率放在同一坐标系中。上传国家—年份面板，即时重算排名、轨迹、空间格局与负担分化。",
    upload: "上传数据",
    replace: "替换数据",
    uploadHint: "拖入 CSV，或点击选择文件",
    local: "数据仅在此浏览器处理",
    schema: "查看数据格式",
    export: "导出当前排名",
    countries: "国家 / 地区",
    years: "观测年份",
    latest: "当前年份",
    divergence: "全球分化信号",
    mapTitle: "全球负担脉冲",
    mapSub: "点击国家，所有视图同步聚焦",
    trendTitle: "年度轨迹",
    trendGlobal: "全球中位数（2000=100）",
    trendCountry: "国家原始值",
    ringTitle: "RankScore 轨道",
    ringSub: "排名越靠前，轨道越接近外圈",
    rankTitle: "双结局排名引擎",
    rankSub: "支持按名称检索并即时切换指标",
    methodology: "计算方法",
    burdenWeight: "长期负担权重",
    trendWeight: "变化趋势权重",
    methodologyText: "综合 RankScore = 长期联合负担百分位 × 权重 + 两项结局相对首年的联合变化百分位 × 剩余权重。两项结局在计算前分别转为国家间百分位，避免单位差异主导结果。",
    joint: "综合 RankScore",
    anxiety: "焦虑患病率",
    suicide: "自杀死亡率",
    divergenceMetric: "结局分化",
    selectedCountry: "聚焦国家",
    rank: "名次",
    score: "得分",
    noMatch: "没有匹配的国家",
    search: "搜索国家或代码",
    sourceDemo: "合成演示数据",
    sourceUpload: "用户上传面板",
    live: "LIVE MODEL",
    formatTitle: "CSV 数据格式",
    formatText: "每行表示一个国家（或地区）在一个年份的观测。系统也兼容 Code、NAME、Sui_R、axi 等现有字段名。",
    required: "必需字段",
    optional: "可选字段",
    close: "关闭",
    downloadTemplate: "下载模板",
    invalid: "无法读取数据。请检查字段名、年份和数值列。",
    loaded: "数据已载入，全部视图已更新",
    top: "TOP 36",
    all: "全部国家",
    selectYear: "选择年份",
    currentValue: "当前值",
    sinceFirst: "较首年",
    globalMedian: "全球中位数",
  },
  en: {
    brand: "SYSU3DAILAB // MIND ATLAS",
    kicker: "GLOBAL MENTAL BURDEN OBSERVATORY",
    title: "An interactive atlas of\nglobal mental-health burden",
    subtitle: "Place anxiety prevalence and suicide mortality on one analytical surface. Upload a country–year panel to recalculate rankings, trajectories, spatial patterns and outcome divergence instantly.",
    upload: "Upload data",
    replace: "Replace data",
    uploadHint: "Drop a CSV here, or choose a file",
    local: "Processed locally in this browser",
    schema: "View data schema",
    export: "Export current ranking",
    countries: "Countries / areas",
    years: "Observed years",
    latest: "Active year",
    divergence: "Global divergence signal",
    mapTitle: "Global burden pulse",
    mapSub: "Select a country to focus every view",
    trendTitle: "Annual trajectories",
    trendGlobal: "Global median (2000=100)",
    trendCountry: "Country values",
    ringTitle: "RankScore orbit",
    ringSub: "Higher-ranked countries sit closer to the outer orbit",
    rankTitle: "Dual-outcome ranking engine",
    rankSub: "Search countries and switch metrics instantly",
    methodology: "Method",
    burdenWeight: "Long-term burden weight",
    trendWeight: "Change weight",
    methodologyText: "Composite RankScore = joint long-term burden percentile × selected weight + joint change-from-baseline percentile × the remaining weight. Each outcome is converted to a cross-country percentile before combination so that units do not dominate the score.",
    joint: "Composite RankScore",
    anxiety: "Anxiety prevalence",
    suicide: "Suicide mortality",
    divergenceMetric: "Outcome divergence",
    selectedCountry: "Focus country",
    rank: "Rank",
    score: "Score",
    noMatch: "No countries match",
    search: "Search country or code",
    sourceDemo: "Synthetic demo data",
    sourceUpload: "Uploaded panel",
    live: "LIVE MODEL",
    formatTitle: "CSV data schema",
    formatText: "Each row represents one country or area in one year. Existing field names such as Code, NAME, Sui_R and axi are also accepted.",
    required: "Required fields",
    optional: "Optional fields",
    close: "Close",
    downloadTemplate: "Download template",
    invalid: "The data could not be read. Check column names, years and numeric fields.",
    loaded: "Data loaded — every view has been updated",
    top: "TOP 36",
    all: "All countries",
    selectYear: "Select year",
    currentValue: "Current value",
    sinceFirst: "Since baseline",
    globalMedian: "Global median",
  },
};

const continentByCode: Record<string, string> = {
  USA: "North America", CAN: "North America", MEX: "North America", GTM: "North America", CUB: "North America",
  BRA: "South America", ARG: "South America", CHL: "South America", COL: "South America", PER: "South America", BOL: "South America",
  GBR: "Europe", FRA: "Europe", DEU: "Europe", ESP: "Europe", ITA: "Europe", PRT: "Europe", NOR: "Europe", SWE: "Europe", FIN: "Europe", POL: "Europe", UKR: "Europe", RUS: "Europe",
  CHN: "Asia", IND: "Asia", JPN: "Asia", KOR: "Asia", IDN: "Asia", PAK: "Asia", BGD: "Asia", THA: "Asia", VNM: "Asia", SAU: "Asia", IRN: "Asia", TUR: "Asia",
  AUS: "Oceania", NZL: "Oceania", PNG: "Oceania",
  ZAF: "Africa", NGA: "Africa", EGY: "Africa", ETH: "Africa", KEN: "Africa", GHA: "Africa", DZA: "Africa", MAR: "Africa", COD: "Africa", TZA: "Africa",
};

const aliases: Record<string, string[]> = {
  country_code: ["country_code", "code", "iso3", "iso_code", "countrycode"],
  country_name: ["country_name", "name", "country", "location", "entity"],
  year: ["year"],
  suicide_rate: ["suicide_rate", "sui_r", "suicide", "suicide mortality", "suicide mortality rate"],
  anxiety_disorder_prevalence: ["anxiety_disorder_prevalence", "axi", "anxiety", "anxiety prevalence", "anxiety_disorders_prevalence"],
  continent: ["continent", "region", "world_region"],
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function demoData(): Datum[] {
  const geographies = (worldAtlas as unknown as {
    objects: { countries: { geometries: Array<{ id: string; properties?: { name?: string } }> } };
  }).objects.countries.geometries;
  const rows: Datum[] = [];
  geographies.forEach((geo) => {
    const name = geo.properties?.name || "Unknown";
    if (name === "Antarctica" || name === "Unknown") return;
    const code = String(geo.id).padStart(3, "0");
    const seed = hashString(`${code}-${name}`);
    const baseSuicide = 3.2 + (seed % 1900) / 100;
    const baseAnxiety = 2.1 + ((seed >> 5) % 560) / 100;
    const suicideSlope = -0.032 + ((seed >> 9) % 80) / 1000;
    const anxietySlope = -0.006 + ((seed >> 13) % 48) / 1000;
    for (let year = 2000; year <= 2019; year += 1) {
      const t = year - 2000;
      const wave = Math.sin(t / 2.9 + (seed % 13)) * 0.025;
      rows.push({
        country_code: code,
        country_name: name,
        year,
        suicide_rate: Math.max(0.6, baseSuicide * Math.exp(suicideSlope * t + wave)),
        anxiety_disorder_prevalence: Math.max(0.5, baseAnxiety * Math.exp(anxietySlope * t + wave * 0.35)),
        continent: continentByCode[code] || "Other",
      });
    }
  });
  return rows;
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rankPercentiles(values: Array<{ key: string; value: number }>) {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const map = new Map<string, number>();
  sorted.forEach((entry, index) => map.set(entry.key, sorted.length <= 1 ? 1 : index / (sorted.length - 1)));
  return map;
}

function field(row: Record<string, unknown>, target: keyof typeof aliases) {
  const byNormalized = new Map(Object.keys(row).map((key) => [key.trim().toLowerCase(), row[key]]));
  for (const name of aliases[target]) {
    const value = byNormalized.get(name.toLowerCase());
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function normalizeRows(input: Record<string, unknown>[]): Datum[] {
  return input
    .map((row) => {
      const codeRaw = String(field(row, "country_code") ?? "").trim().toUpperCase();
      const nameRaw = String(field(row, "country_name") ?? "").trim();
      const code = codeRaw || nameRaw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
      const name = nameRaw || code;
      const year = Number(field(row, "year"));
      const suicide = Number(field(row, "suicide_rate"));
      const anxiety = Number(field(row, "anxiety_disorder_prevalence"));
      const continent = String(field(row, "continent") ?? continentByCode[code] ?? "Other");
      return {
        country_code: code,
        country_name: name,
        year,
        suicide_rate: suicide,
        anxiety_disorder_prevalence: anxiety,
        continent,
      };
    })
    .filter((row) => row.country_name && Number.isFinite(row.year) && Number.isFinite(row.suicide_rate) && Number.isFinite(row.anxiety_disorder_prevalence));
}

function fmt(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function pct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmt(value, 1)}%`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EChart({ option, className, onClick }: ChartProps) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!node.current) return;
    const chart = echarts.getInstanceByDom(node.current) || echarts.init(node.current, undefined, { renderer: "canvas" });
    chart.setOption(option, { notMerge: true, lazyUpdate: true });
    chart.off("click");
    if (onClick) chart.on("click", onClick);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      chart.off("click");
    };
  }, [option, onClick]);
  return <div ref={node} className={className} />;
}

function MetricGlyph({ metric }: { metric: Metric }) {
  if (metric === "joint") return <Sparkles size={14} />;
  if (metric === "anxiety") return <Activity size={14} />;
  if (metric === "suicide") return <BarChart3 size={14} />;
  return <ArrowUpRight size={14} />;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [rows, setRows] = useState<Datum[]>(() => demoData());
  const [sourceName, setSourceName] = useState("demo");
  const [metric, setMetric] = useState<Metric>("joint");
  const [burdenWeight, setBurdenWeight] = useState(60);
  const [year, setYear] = useState(2019);
  const [selected, setSelected] = useState("CHN");
  const [query, setQuery] = useState("");
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = copy[lang];

  const years = useMemo(() => [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b), [rows]);
  const minYear = years[0] ?? 2000;
  const maxYear = years[years.length - 1] ?? 2019;

  useEffect(() => {
    if (!years.includes(year)) setYear(maxYear);
  }, [maxYear, year, years]);

  const countrySeries = useMemo(() => {
    const grouped = new Map<string, Datum[]>();
    rows.forEach((row) => {
      const key = row.country_code || row.country_name;
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    });
    grouped.forEach((list) => list.sort((a, b) => a.year - b.year));
    return grouped;
  }, [rows]);

  const ranking = useMemo<RankedCountry[]>(() => {
    const current: Array<{ key: string; row: Datum; first: Datum; longSuicide: number; longAnxiety: number }> = [];
    countrySeries.forEach((series, key) => {
      const active = series.find((item) => item.year === year);
      if (!active) return;
      const available = series.filter((item) => item.year <= year);
      const first = available[0];
      current.push({
        key,
        row: active,
        first,
        longSuicide: available.reduce((sum, item) => sum + item.suicide_rate, 0) / available.length,
        longAnxiety: available.reduce((sum, item) => sum + item.anxiety_disorder_prevalence, 0) / available.length,
      });
    });
    const suicidePct = rankPercentiles(current.map((item) => ({ key: item.key, value: item.longSuicide })));
    const anxietyPct = rankPercentiles(current.map((item) => ({ key: item.key, value: item.longAnxiety })));
    const suicideChanges = current.map((item) => ({ key: item.key, value: ((item.row.suicide_rate / item.first.suicide_rate) - 1) * 100 }));
    const anxietyChanges = current.map((item) => ({ key: item.key, value: ((item.row.anxiety_disorder_prevalence / item.first.anxiety_disorder_prevalence) - 1) * 100 }));
    const suicideChangePct = rankPercentiles(suicideChanges);
    const anxietyChangePct = rankPercentiles(anxietyChanges);
    const suicideRanks = [...current].sort((a, b) => b.row.suicide_rate - a.row.suicide_rate);
    const anxietyRanks = [...current].sort((a, b) => b.row.anxiety_disorder_prevalence - a.row.anxiety_disorder_prevalence);
    const suicideRank = new Map(suicideRanks.map((item, index) => [item.key, index + 1]));
    const anxietyRank = new Map(anxietyRanks.map((item, index) => [item.key, index + 1]));
    const weight = burdenWeight / 100;
    return current.map((item) => {
      const sp = suicidePct.get(item.key) || 0;
      const ap = anxietyPct.get(item.key) || 0;
      const burden = (sp + ap) / 2;
      const change = ((suicideChangePct.get(item.key) || 0) + (anxietyChangePct.get(item.key) || 0)) / 2;
      const suicideChange = suicideChanges.find((entry) => entry.key === item.key)?.value || 0;
      const anxietyChange = anxietyChanges.find((entry) => entry.key === item.key)?.value || 0;
      return {
        code: item.row.country_code,
        name: item.row.country_name,
        continent: item.row.continent,
        suicide: item.row.suicide_rate,
        anxiety: item.row.anxiety_disorder_prevalence,
        suicideRank: suicideRank.get(item.key) || 0,
        anxietyRank: anxietyRank.get(item.key) || 0,
        suicidePct: sp,
        anxietyPct: ap,
        burden,
        change,
        joint: (burden * weight + change * (1 - weight)) * 100,
        divergence: Math.abs(anxietyChange - suicideChange),
        suicideChange,
        anxietyChange,
      };
    });
  }, [burdenWeight, countrySeries, year]);

  const metricValue = useCallback((item: RankedCountry) => {
    if (metric === "anxiety") return item.anxiety;
    if (metric === "suicide") return item.suicide;
    if (metric === "divergence") return item.divergence;
    return item.joint;
  }, [metric]);

  const sortedRanking = useMemo(() => [...ranking].sort((a, b) => metricValue(b) - metricValue(a)), [metricValue, ranking]);
  const selectedRank = ranking.find((item) => item.code === selected) || sortedRanking[0];
  const selectedCode = selectedRank?.code || "";
  const selectedRows = countrySeries.get(selectedCode) || [];
  const globalDivergence = median(ranking.map((item) => item.anxietyChange - item.suicideChange));

  useEffect(() => {
    if (selectedRank && selected !== selectedRank.code) setSelected(selectedRank.code);
  }, [selected, selectedRank]);

  const filteredRanking = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedRanking;
    return sortedRanking.filter((item) => item.name.toLowerCase().includes(normalized) || item.code.toLowerCase().includes(normalized));
  }, [query, sortedRanking]);

  const globalSeries = useMemo(() => years.map((activeYear) => {
    const inYear = rows.filter((row) => row.year === activeYear);
    return {
      year: activeYear,
      suicide: median(inYear.map((row) => row.suicide_rate)),
      anxiety: median(inYear.map((row) => row.anxiety_disorder_prevalence)),
    };
  }), [rows, years]);

  const mapOption = useMemo<echarts.EChartsOption>(() => {
    const values = ranking.map(metricValue);
    const max = Math.max(...values, 1);
    const mapData = ranking.map((item) => ({
      name: item.name,
      value: metricValue(item),
      code: item.code,
      suicide: item.suicide,
      anxiety: item.anxiety,
      joint: item.joint,
    }));
    return {
      backgroundColor: "transparent",
      animationDurationUpdate: 650,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(7, 12, 18, .96)",
        borderColor: "rgba(116, 227, 255, .3)",
        textStyle: { color: "#eef9ff", fontFamily: "Arial" },
        formatter: (params: unknown) => {
          const p = params as { data?: { name: string; code: string; suicide: number; anxiety: number; joint: number } };
          if (!p.data) return "No data";
          return `<div class="map-tip"><b>${p.data.name}</b><span>${p.data.code}</span><hr/><div>Suicide <strong>${fmt(p.data.suicide)}</strong></div><div>Anxiety <strong>${fmt(p.data.anxiety)}%</strong></div><div>RankScore <strong>${fmt(p.data.joint, 1)}</strong></div></div>`;
        },
      },
      visualMap: {
        min: 0,
        max,
        left: 8,
        bottom: 2,
        orient: "horizontal",
        itemWidth: 98,
        itemHeight: 7,
        text: ["HIGH", "LOW"],
        textStyle: { color: "#6f8190", fontSize: 9, fontFamily: "Arial" },
        calculable: false,
        inRange: { color: ["#101c25", "#135069", "#1e9fc2", "#f49a78", "#ff4f68"] },
        borderColor: "transparent",
      },
      series: [{
        type: "map",
        map: "mind-world",
        roam: true,
        scaleLimit: { min: 1, max: 8 },
        zoom: 1.06,
        top: 0,
        bottom: 10,
        data: mapData,
        itemStyle: { areaColor: "#111d26", borderColor: "#283945", borderWidth: 0.55 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: "#f6d365", borderColor: "#fff3bf", borderWidth: 1.2, shadowBlur: 20, shadowColor: "rgba(246,211,101,.45)" } },
        select: { label: { show: false }, itemStyle: { areaColor: "#f6d365", borderColor: "#ffffff" } },
      }],
    };
  }, [metricValue, ranking]);

  const handleMapClick = useCallback((params: unknown) => {
    const p = params as { data?: { code?: string } };
    if (p.data?.code) setSelected(p.data.code);
  }, []);

  const globalBaseSuicide = globalSeries[0]?.suicide || 1;
  const globalBaseAnxiety = globalSeries[0]?.anxiety || 1;
  const trendOption = useMemo<echarts.EChartsOption>(() => {
    const countryYears = selectedRows.map((item) => item.year);
    const countrySuicide = selectedRows.map((item) => item.suicide_rate);
    const countryAnxiety = selectedRows.map((item) => item.anxiety_disorder_prevalence);
    return {
      backgroundColor: "transparent",
      animationDuration: 700,
      grid: [{ left: 44, right: 18, top: 54, height: "30%" }, { left: 44, right: 42, top: "60%", bottom: 32 }],
      tooltip: { trigger: "axis", backgroundColor: "rgba(7,12,18,.96)", borderColor: "#31434f", textStyle: { color: "#eef9ff" } },
      legend: [{ top: 4, left: 0, textStyle: { color: "#8294a1", fontSize: 10 }, data: [t.anxiety, t.suicide] }],
      xAxis: [
        { type: "category", gridIndex: 0, data: years, boundaryGap: false, axisLabel: { color: "#60727f", fontSize: 9, interval: Math.max(0, Math.floor(years.length / 5) - 1) }, axisLine: { lineStyle: { color: "#283843" } }, axisTick: { show: false } },
        { type: "category", gridIndex: 1, data: countryYears, boundaryGap: false, axisLabel: { color: "#60727f", fontSize: 9, interval: Math.max(0, Math.floor(countryYears.length / 5) - 1) }, axisLine: { lineStyle: { color: "#283843" } }, axisTick: { show: false } },
      ],
      yAxis: [
        { type: "value", gridIndex: 0, scale: true, axisLabel: { color: "#60727f", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(95,116,130,.12)" } } },
        { type: "value", gridIndex: 1, scale: true, position: "left", axisLabel: { color: "#42d7f5", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(95,116,130,.12)" } } },
        { type: "value", gridIndex: 1, scale: true, position: "right", axisLabel: { color: "#ff6a7d", fontSize: 9 }, splitLine: { show: false } },
      ],
      graphic: [
        { type: "text", left: 0, top: 30, style: { text: t.trendGlobal, fill: "#687b88", font: "10px Arial" } },
        { type: "text", left: 0, top: "53%", style: { text: `${t.trendCountry} · ${selectedRank?.name || "—"}`, fill: "#687b88", font: "10px Arial" } },
      ],
      series: [
        { name: t.anxiety, type: "line", xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: 0.35, data: globalSeries.map((item) => (item.anxiety / globalBaseAnxiety) * 100), lineStyle: { color: "#ff5b78", width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(255,91,120,.24)" }, { offset: 1, color: "rgba(255,91,120,0)" }]) } },
        { name: t.suicide, type: "line", xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: 0.35, data: globalSeries.map((item) => (item.suicide / globalBaseSuicide) * 100), lineStyle: { color: "#36d5f2", width: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(54,213,242,.18)" }, { offset: 1, color: "rgba(54,213,242,0)" }]) } },
        { name: t.suicide, type: "line", xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, smooth: 0.3, data: countrySuicide, lineStyle: { color: "#36d5f2", width: 2.4 }, symbol: "circle" },
        { name: t.anxiety, type: "line", xAxisIndex: 1, yAxisIndex: 2, showSymbol: false, smooth: 0.3, data: countryAnxiety, lineStyle: { color: "#ff5b78", width: 2.4 }, symbol: "circle" },
      ],
    };
  }, [globalBaseAnxiety, globalBaseSuicide, globalSeries, selectedRank?.name, selectedRows, t.anxiety, t.suicide, t.trendCountry, t.trendGlobal, years]);

  const ringCountries = sortedRanking.slice(0, 36);
  const ringOption = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: "transparent",
    animationDurationUpdate: 650,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(7,12,18,.96)",
      borderColor: "#31434f",
      textStyle: { color: "#eef9ff" },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; dataIndex: number };
        const country = ringCountries[p.dataIndex];
        return `<b>#${p.dataIndex + 1} ${p.name}</b><br/>RankScore&nbsp;&nbsp;<strong>${fmt(country?.joint || p.value, 1)}</strong><br/>Anxiety&nbsp;&nbsp;${fmt(country?.anxiety || 0)}%<br/>Suicide&nbsp;&nbsp;${fmt(country?.suicide || 0)}`;
      },
    },
    angleAxis: { type: "category", data: ringCountries.map((item) => item.name), startAngle: 90, clockwise: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
    radiusAxis: { min: 0, max: Math.max(...ringCountries.map(metricValue), 1), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { lineStyle: { color: ["rgba(111,132,145,.11)"] } }, splitNumber: 4 },
    polar: { radius: ["22%", "85%"] },
    series: [{
      type: "bar",
      coordinateSystem: "polar",
      roundCap: true,
      barWidth: "66%",
      data: ringCountries.map((item, index) => ({
        name: item.name,
        value: metricValue(item),
        code: item.code,
        itemStyle: {
          color: index < 6 ? "#ff5b78" : index < 18 ? "#f2af69" : "#35cee9",
          opacity: selectedCode === item.code ? 1 : 0.7,
          shadowBlur: selectedCode === item.code ? 14 : 0,
          shadowColor: "rgba(255,255,255,.35)",
        },
      })),
    }],
    graphic: [
      { type: "text", left: "center", top: "43%", style: { text: t.top, fill: "#718492", font: "600 10px Arial", textAlign: "center" } },
      { type: "text", left: "center", top: "49%", style: { text: String(ringCountries.length), fill: "#eefaff", font: "700 28px Arial", textAlign: "center" } },
    ],
  }), [metricValue, ringCountries, selectedCode, t.top]);

  const handleRingClick = useCallback((params: unknown) => {
    const p = params as { data?: { code?: string } };
    if (p.data?.code) setSelected(p.data.code);
  }, []);

  const loadFile = useCallback((file: File) => {
    setUploadMessage("");
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        const normalized = normalizeRows(result.data);
        const uniqueCountries = new Set(normalized.map((item) => item.country_code || item.country_name));
        const uniqueYears = [...new Set(normalized.map((item) => item.year))].sort((a, b) => a - b);
        if (normalized.length < 4 || uniqueCountries.size < 2 || uniqueYears.length < 2) {
          setUploadMessage(t.invalid);
          return;
        }
        setRows(normalized);
        setSourceName(file.name);
        setYear(uniqueYears[uniqueYears.length - 1]);
        setSelected(normalized[0].country_code);
        setUploadMessage(t.loaded);
        window.setTimeout(() => setUploadMessage(""), 4000);
      },
      error: () => setUploadMessage(t.invalid),
    });
  }, [t.invalid, t.loaded]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const exportRanking = () => {
    const data = sortedRanking.map((item, index) => ({
      rank: index + 1,
      country_code: item.code,
      country_name: item.name,
      year,
      suicide_rate: item.suicide,
      suicide_rank: item.suicideRank,
      anxiety_disorder_prevalence: item.anxiety,
      anxiety_rank: item.anxietyRank,
      rank_score: item.joint,
      divergence_score: item.divergence,
    }));
    downloadText(`mind_atlas_ranking_${year}.csv`, Papa.unparse(data));
  };

  const downloadTemplate = () => {
    downloadText("mind_atlas_upload_template.csv", Papa.unparse([
      { country_code: "CHN", country_name: "China", year: 2000, suicide_rate: 12.4, anxiety_disorder_prevalence: 3.1, continent: "Asia" },
      { country_code: "CHN", country_name: "China", year: 2001, suicide_rate: 12.0, anxiety_disorder_prevalence: 3.2, continent: "Asia" },
      { country_code: "USA", country_name: "United States of America", year: 2000, suicide_rate: 10.4, anxiety_disorder_prevalence: 5.0, continent: "North America" },
      { country_code: "USA", country_name: "United States of America", year: 2001, suicide_rate: 10.7, anxiety_disorder_prevalence: 5.1, continent: "North America" },
    ]));
  };

  const metricLabel = t[metric === "divergence" ? "divergenceMetric" : metric];
  const rangeProgress = years.length > 1 ? ((year - minYear) / (maxYear - minYear)) * 100 : 100;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a href="#top" className="brand" aria-label="SYSU3DAILAB MIND ATLAS home">
          <span className="brand-mark"><span /><span /></span>
          <span>{t.brand}</span>
        </a>
        <div className="topbar-center">
          <span className="status-dot" />
          <span>{t.live}</span>
          <span className="divider" />
          <span>{sourceName === "demo" ? t.sourceDemo : sourceName}</span>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} aria-label="Switch language"><Languages size={17} /><span>{lang === "zh" ? "EN" : "中"}</span></button>
          <button className="primary-small" onClick={() => inputRef.current?.click()}><UploadCloud size={16} />{sourceName === "demo" ? t.upload : t.replace}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>01</span>{t.kicker}</div>
          <h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{t.subtitle}</p>
          <div className="hero-actions">
            <button className="button-primary" onClick={() => inputRef.current?.click()}><UploadCloud size={18} />{t.upload}</button>
            <button className="button-secondary" onClick={exportRanking}><Download size={17} />{t.export}</button>
          </div>
        </div>
        <div
          className={`upload-panel ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); event.target.value = ""; }} />
          <div className="upload-orbit"><UploadCloud size={25} /><i /><i /></div>
          <strong>{t.uploadHint}</strong>
          <span>CSV · UTF-8 · country-year panel</span>
          <button onClick={() => setSchemaOpen(true)}>{t.schema}<ArrowUpRight size={13} /></button>
          <div className="privacy"><ShieldCheck size={13} />{t.local}</div>
        </div>
      </section>

      {uploadMessage && <div className={`toast ${uploadMessage === t.invalid ? "error" : ""}`}><Info size={16} />{uploadMessage}</div>}

      <section className="control-strip">
        <div className="metric-tabs" role="tablist" aria-label="Ranking metric">
          {(["joint", "anxiety", "suicide", "divergence"] as Metric[]).map((item) => (
            <button key={item} className={metric === item ? "active" : ""} onClick={() => setMetric(item)} role="tab" aria-selected={metric === item}>
              <MetricGlyph metric={item} />{t[item === "divergence" ? "divergenceMetric" : item]}
            </button>
          ))}
        </div>
        <div className="year-control">
          <div className="year-label"><span>{t.selectYear}</span><strong>{year}</strong></div>
          <input
            type="range"
            min={minYear}
            max={maxYear}
            step={1}
            value={year}
            style={{ "--range-progress": `${rangeProgress}%` } as React.CSSProperties}
            onChange={(event) => setYear(Number(event.target.value))}
            aria-label={t.selectYear}
          />
          <div className="year-ends"><span>{minYear}</span><span>{maxYear}</span></div>
        </div>
      </section>

      <section className="stats-row">
        <article><span className="stat-index">A</span><div><span>{t.countries}</span><strong>{countrySeries.size}</strong><small>{sourceName === "demo" ? t.sourceDemo : t.sourceUpload}</small></div></article>
        <article><span className="stat-index">B</span><div><span>{t.years}</span><strong>{years.length}</strong><small>{minYear} — {maxYear}</small></div></article>
        <article><span className="stat-index">C</span><div><span>{t.latest}</span><strong>{year}</strong><small>{metricLabel}</small></div></article>
        <article className="signal-stat"><span className="stat-index">D</span><div><span>{t.divergence}</span><strong className={globalDivergence >= 0 ? "warm" : "cool"}>{pct(globalDivergence)}</strong><small>{t.anxiety} − {t.suicide}</small></div><div className="signal-bars">{[3, 6, 4, 8, 12, 9, 14, 18, 15, 22].map((height, index) => <i key={index} style={{ height }} />)}</div></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel map-panel">
          <div className="panel-head">
            <div><span className="panel-number">02 / SPATIAL</span><h2>{t.mapTitle}</h2><p>{t.mapSub}</p></div>
            <div className="panel-badge"><Globe2 size={14} />{metricLabel} · {year}</div>
          </div>
          <EChart option={mapOption} className="map-chart" onClick={handleMapClick} />
          <div className="map-country-card">
            <span>{t.selectedCountry}</span>
            <strong>{selectedRank?.name || "—"}</strong>
            <div><em>#{sortedRanking.findIndex((item) => item.code === selectedCode) + 1}</em><small>{metricLabel}</small></div>
          </div>
        </article>

        <article className="panel trend-panel">
          <div className="panel-head">
            <div><span className="panel-number">03 / TEMPORAL</span><h2>{t.trendTitle}</h2><p>{selectedRank?.name || t.globalMedian}</p></div>
            <button className="ghost-icon" aria-label="Expand"><Maximize2 size={15} /></button>
          </div>
          <EChart option={trendOption} className="trend-chart" />
          {selectedRank && <div className="country-readout">
            <div><span>{t.suicide}</span><strong>{fmt(selectedRank.suicide)}</strong><small className={selectedRank.suicideChange > 0 ? "up" : "down"}>{selectedRank.suicideChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(selectedRank.suicideChange)}</small></div>
            <div><span>{t.anxiety}</span><strong>{fmt(selectedRank.anxiety)}%</strong><small className={selectedRank.anxietyChange > 0 ? "up" : "down"}>{selectedRank.anxietyChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(selectedRank.anxietyChange)}</small></div>
          </div>}
        </article>

        <article className="panel ring-panel">
          <div className="panel-head">
            <div><span className="panel-number">04 / ORBIT</span><h2>{t.ringTitle}</h2><p>{t.ringSub}</p></div>
            <button className="ghost-icon" onClick={() => setMethodOpen(true)} aria-label={t.methodology}><CircleHelp size={16} /></button>
          </div>
          <EChart option={ringOption} className="ring-chart" onClick={handleRingClick} />
          <div className="ring-legend"><span><i className="legend-hot" />TOP 6</span><span><i className="legend-warm" />7—18</span><span><i className="legend-cool" />19—36</span></div>
        </article>

        <article className="panel ranking-panel">
          <div className="panel-head ranking-head">
            <div><span className="panel-number">05 / RANKING</span><h2>{t.rankTitle}</h2><p>{t.rankSub}</p></div>
            <button className="ghost-icon" onClick={exportRanking} aria-label={t.export}><Download size={16} /></button>
          </div>
          <div className="ranking-toolbar">
            <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
            <button onClick={() => setMethodOpen(true)}><span>{burdenWeight}/{100 - burdenWeight}</span>{t.methodology}<ChevronDown size={13} /></button>
          </div>
          <div className="ranking-columns"><span>{t.rank}</span><span>{t.all}</span><span>{t.anxiety}</span><span>{t.suicide}</span><span>{t.score}</span></div>
          <div className="ranking-list">
            {filteredRanking.slice(0, 100).map((item, index) => {
              const actualRank = sortedRanking.findIndex((entry) => entry.code === item.code) + 1;
              return <button key={`${item.code}-${item.name}`} className={selectedCode === item.code ? "selected" : ""} onClick={() => setSelected(item.code)}>
                <span className="rank-number">{String(actualRank).padStart(2, "0")}</span>
                <span className="country-cell"><i>{item.code.slice(0, 3)}</i><span><strong>{item.name}</strong><small>{item.continent}</small></span></span>
                <span><b>#{item.anxietyRank}</b><small>{fmt(item.anxiety)}%</small></span>
                <span><b>#{item.suicideRank}</b><small>{fmt(item.suicide)}</small></span>
                <span className="score-cell"><b>{fmt(metricValue(item), 1)}</b><i style={{ width: `${Math.min(100, (metricValue(item) / Math.max(metricValue(sortedRanking[0]), 1)) * 100)}%` }} /></span>
              </button>;
            })}
            {!filteredRanking.length && <div className="no-match">{t.noMatch}</div>}
          </div>
        </article>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><span /><span /></span><span>{t.brand}</span></div>
        <p>Exploratory country-level visualization · Associations and rankings do not imply individual risk or causality.</p>
        <span>{year} / {countrySeries.size} AREAS / v0.1</span>
      </footer>

      {(schemaOpen || methodOpen) && <div className="modal-backdrop" onMouseDown={() => { setSchemaOpen(false); setMethodOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => { setSchemaOpen(false); setMethodOpen(false); }} aria-label={t.close}><X size={18} /></button>
          {schemaOpen ? <>
            <span className="modal-kicker"><FileSpreadsheet size={15} />DATA INPUT</span>
            <h3>{t.formatTitle}</h3>
            <p>{t.formatText}</p>
            <div className="schema-box"><strong>{t.required}</strong><code>country_code</code><code>country_name</code><code>year</code><code>suicide_rate</code><code>anxiety_disorder_prevalence</code></div>
            <div className="schema-box optional"><strong>{t.optional}</strong><code>continent</code></div>
            <button className="button-primary modal-action" onClick={downloadTemplate}><Download size={17} />{t.downloadTemplate}</button>
          </> : <>
            <span className="modal-kicker"><Sparkles size={15} />RANKSCORE ENGINE</span>
            <h3>{t.methodology}</h3>
            <p>{t.methodologyText}</p>
            <div className="weight-readout"><div><span>{t.burdenWeight}</span><strong>{burdenWeight}%</strong></div><div><span>{t.trendWeight}</span><strong>{100 - burdenWeight}%</strong></div></div>
            <input className="weight-slider" type="range" min="0" max="100" step="5" value={burdenWeight} style={{ "--range-progress": `${burdenWeight}%` } as React.CSSProperties} onChange={(event) => setBurdenWeight(Number(event.target.value))} />
            <div className="formula"><span>RANK<sup>SCORE</sup></span><b>=</b><em>{(burdenWeight / 100).toFixed(2)} · P<sub>burden</sub></em><b>+</b><em>{((100 - burdenWeight) / 100).toFixed(2)} · P<sub>change</sub></em></div>
          </>}
        </div>
      </div>}
    </main>
  );
}
