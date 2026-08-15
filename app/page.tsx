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
  Maximize2,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import AtlasNav from "./atlas-nav";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import countries from "i18n-iso-countries";
import enCountries from "i18n-iso-countries/langs/en.json";
import zhCountries from "i18n-iso-countries/langs/zh.json";

type Lang = "zh" | "en";
type Metric = "joint" | "longTerm" | "suicide" | "anxiety" | "depression" | "divergence";
type Datum = {
  country_code: string;
  country_name: string;
  year: number;
  suicide_rate: number;
  anxiety_disorder_prevalence: number;
  depressive_disorder_prevalence: number;
  continent: string;
};

type RankedCountry = {
  code: string;
  name: string;
  continent: string;
  suicide: number;
  anxiety: number;
  depression: number;
  suicideRank: number;
  anxietyRank: number;
  depressionRank: number;
  longTermSuicide: number;
  longTermAnxiety: number;
  longTermDepression: number;
  longTermBurden: number;
  longTermRank: number;
  jointIncrease: number;
  joint: number;
  divergence: number;
  suicideChange: number;
  anxietyChange: number;
  depressionChange: number;
};

type ChartProps = {
  option: echarts.EChartsOption;
  className?: string;
  onClick?: (params: unknown) => void;
};

type AtlasGeometry = {
  id?: string | number;
  properties?: { name?: string };
};

const atlasGeographies = (worldAtlas as unknown as {
  objects: { countries: { geometries: AtlasGeometry[] } };
}).objects.countries.geometries;

type MapPosition = [number, number];
type MapRing = MapPosition[];
type MapPolygon = MapRing[];

function sameMapPosition(a: MapPosition, b: MapPosition) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function closeMapRing(points: MapRing) {
  const clean: MapRing = [];
  points.forEach((point) => {
    if (!clean.length || !sameMapPosition(clean[clean.length - 1], point)) clean.push(point);
  });
  if (clean.length > 1 && sameMapPosition(clean[0], clean[clean.length - 1])) clean.pop();
  if (clean.length < 3) return [];
  clean.push([...clean[0]] as MapPosition);
  return clean;
}

function unwrapMapRing(ring: MapRing) {
  const vertices = ring.length > 1 && sameMapPosition(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;
  if (!vertices.length) return [];
  const unwrapped: MapRing = [[...vertices[0]] as MapPosition];
  for (let index = 1; index < vertices.length; index += 1) {
    let longitude = vertices[index][0];
    const previousLongitude = unwrapped[unwrapped.length - 1][0];
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    unwrapped.push([longitude, vertices[index][1]]);
  }
  return closeMapRing(unwrapped);
}

function clipMapRing(ring: MapRing, boundary: number, keepGreater: boolean) {
  const vertices = ring.length > 1 && sameMapPosition(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;
  if (!vertices.length) return [];
  const output: MapRing = [];
  const inside = (point: MapPosition) => keepGreater ? point[0] >= boundary - 1e-9 : point[0] <= boundary + 1e-9;
  const intersection = (start: MapPosition, end: MapPosition): MapPosition => {
    const ratio = (boundary - start[0]) / (end[0] - start[0]);
    return [boundary, start[1] + (end[1] - start[1]) * ratio];
  };
  let previous = vertices[vertices.length - 1];
  let previousInside = inside(previous);
  vertices.forEach((current) => {
    const currentInside = inside(current);
    if (currentInside) {
      if (!previousInside) output.push(intersection(previous, current));
      output.push(current);
    } else if (previousInside) {
      output.push(intersection(previous, current));
    }
    previous = current;
    previousInside = currentInside;
  });
  return closeMapRing(output);
}

function splitMapRingAtDateline(ring: MapRing) {
  const unwrapped = unwrapMapRing(ring);
  if (!unwrapped.length) return [];
  const longitudes = unwrapped.map((point) => point[0]);
  const minimum = Math.min(...longitudes);
  const maximum = Math.max(...longitudes);
  const firstShift = Math.ceil((-180 - maximum) / 360);
  const lastShift = Math.floor((180 - minimum) / 360);
  const parts: MapRing[] = [];
  for (let shift = firstShift; shift <= lastShift; shift += 1) {
    const shifted = unwrapped.map(([longitude, latitude]) => [longitude + shift * 360, latitude] as MapPosition);
    const leftClipped = clipMapRing(shifted, -180, true);
    const clipped = leftClipped.length ? clipMapRing(leftClipped, 180, false) : [];
    if (clipped.length >= 4) parts.push(clipped);
  }
  return parts;
}

function ringCrossesDateline(ring: MapRing) {
  return ring.some((point, index) => index > 0 && Math.abs(point[0] - ring[index - 1][0]) > 180);
}

function repairWorldMap(collection: GeoJSON.FeatureCollection) {
  const repairedFeatures = collection.features
    .filter((mapFeature) => mapFeature.properties?.name !== "Antarctica")
    .map((mapFeature) => {
      const geometry = mapFeature.geometry;
      if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return mapFeature;
      const polygons = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates) as MapPolygon[];
      const repairedPolygons = polygons.flatMap((polygon) => {
        const outerRing = polygon[0];
        if (!outerRing || !ringCrossesDateline(outerRing)) return [polygon];
        return splitMapRingAtDateline(outerRing).map((part) => [part]);
      });
      return {
        ...mapFeature,
        geometry: {
          type: "MultiPolygon" as const,
          coordinates: repairedPolygons,
        },
      };
    });
  return { ...collection, features: repairedFeatures } as GeoJSON.FeatureCollection;
}

const rawWorldGeo = feature(
  worldAtlas as unknown as Parameters<typeof feature>[0],
  (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries,
) as unknown as GeoJSON.FeatureCollection;
const worldGeo = repairWorldMap(rawWorldGeo);

let worldRegistered = false;
if (!worldRegistered) {
  echarts.registerMap("mind-world", worldGeo as never);
  worldRegistered = true;
}

countries.registerLocale(enCountries);
countries.registerLocale(zhCountries);

const atlasNameByNumericCode = new Map(
  atlasGeographies
    .filter((geo) => geo.id !== undefined && geo.id !== null && geo.properties?.name)
    .map((geo) => [String(geo.id).padStart(3, "0"), geo.properties?.name as string]),
);

const burdenMapPalette = ["#f6d58a", "#f5b45f", "#ee7b62", "#cf5a78", "#a44c91", "#75409a", "#4b2572", "#2b1748"];
const rankingRingPalette = ["#f6cc70", "#fa9f68", "#ef7c82", "#d56da3", "#ad6bc0", "#8564c9", "#6650ad", "#49337f"];

function interpolatePalette(palette: string[], position: number) {
  const bounded = Math.max(0, Math.min(1, position));
  const scaled = bounded * (palette.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(palette.length - 1, lowerIndex + 1);
  const mix = scaled - lowerIndex;
  const parse = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const lower = parse(palette[lowerIndex]);
  const upper = parse(palette[upperIndex]);
  const channels = lower.map((value, index) => Math.round(value + (upper[index] - value) * mix));
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

const copy = {
  zh: {
    brand: "SYSU3DAILAB // MIND ATLAS",
    documentTitle: "SYSU3DAILAB // MIND ATLAS — 全球心理健康负担交互式观测台",
    title: "全球心理健康负担\n交互式观测台",
    heroKicker: "200个国家和地区 · 2000–2019观察期 · 2030条件性预测",
    heroSummary: "焦虑与抑郁负担上升，而自杀死亡率下降。联合观察致死性与非致死性结局，才能完整判断全球心理健康进展。",
    upload: "上传数据",
    schema: "查看数据格式",
    export: "导出当前排名",
    countries: "国家 / 地区",
    years: "观测年份",
    latest: "当前年份",
    divergence: "全球分化信号",
    mapTitle: "自杀、焦虑与抑郁的长期国家负担格局",
    mapSub: "展示三项结局的综合排名、长期联合负担与年度水平",
    trendTitle: "年度轨迹",
    trendGlobal: "全球中位数（2000=100）",
    trendCountry: "国家原始值",
    ringTitle: "综合负担排名",
    ringSub: "全部国家和地区按综合排名连续渐变，条长表示综合排名分数",
    rankTitle: "综合负担与长期联合负担排名",
    rankSub: "同时比较综合排名、长期负担与三项结局水平",
    methodology: "计算方法",
    burdenWeight: "长期联合负担权重",
    trendWeight: "联合增长权重",
    methodologyText: "长期联合负担是各国2000–2019年平均自杀死亡率、焦虑障碍患病率和抑郁障碍患病率分别标准化后的等权均值。联合增长分数是三项结局对数线性年度斜率分别标准化后的等权均值。综合负担排名分数固定由60%的长期联合负担和40%的联合增长分数组成。",
    joint: "综合负担排名分数",
    longTerm: "长期联合负担",
    anxiety: "焦虑患病率",
    depression: "抑郁患病率",
    suicide: "自杀死亡率",
    divergenceMetric: "致死/非致死分化",
    selectedCountry: "聚焦国家",
    rank: "名次",
    score: "得分",
    noMatch: "没有匹配的国家",
    search: "搜索国家或代码",
    sourceFinal: "最终研究数据",
    sourceLoading: "正在载入最终数据",
    sourceDemo: "合成演示数据",
    sourceUpload: "用户上传面板",
    formatTitle: "数据文件格式",
    formatText: "每行表示一个国家或地区在一个年份的观测。自杀死亡率以每10万人死亡数表示，焦虑和抑郁使用年度年龄标化点患病率。",
    required: "必需字段",
    optional: "可选字段",
    close: "关闭",
    downloadTemplate: "下载模板",
    invalid: "无法读取数据。请检查字段名、年份和数值列。",
    loaded: "数据已载入，全部视图已更新",
    top: "全部国家和地区",
    all: "全部国家",
    selectYear: "选择年份",
    currentValue: "当前值",
    sinceFirst: "较首年",
    globalMedian: "全球中位数",
    spatialSection: "02 / 空间分布",
    temporalSection: "03 / 时间变化",
    orbitSection: "04 / 排名轨道",
    rankingSection: "05 / 排名",
    dataInput: "数据输入",
    scoreEngine: "评分计算",
    noData: "暂无数据",
    high: "高",
    low: "低",
    gradientColor: "低值黄色 · 高值紫色",
    allRankedAreas: "全部{count}个国家和地区",
    topTen: "综合排名前十名",
    bottomTen: "综合排名末十名",
    switchLanguage: "切换至英文",
    rankingMetric: "排名指标",
    expand: "展开",
    footerNote: "国家层面的探索性可视化 · 相关关系与排名不代表个体风险或因果关系。",
    areas: "个国家或地区",
    version: "版本",
    scoreFormula: "综合负担排名分数",
    longTermScore: "长期联合负担",
    jointIncreaseScore: "联合增长分数",
    nonFatal: "综合非致死负担",
    longTermRank: "长期负担",
    statA: "一",
    statB: "二",
    statC: "三",
    statD: "四",
  },
  en: {
    brand: "SYSU3DAILAB // MIND ATLAS",
    documentTitle: "SYSU3DAILAB // MIND ATLAS — Global Mental Burden Observatory",
    title: "An interactive atlas of\nglobal mental-health burden",
    heroKicker: "200 countries and territories · 2000–2019 observed · conditional estimates to 2030",
    heroSummary: "Anxiety and depressive burdens rose while suicide mortality declined. Fatal and non-fatal outcomes must be monitored together to judge global mental-health progress.",
    upload: "Upload data",
    schema: "View data schema",
    export: "Export current ranking",
    countries: "Countries / areas",
    years: "Observed years",
    latest: "Active year",
    divergence: "Global divergence signal",
    mapTitle: "Long-term national architecture of suicide, anxiety and depressive burdens",
    mapSub: "Explore three-outcome rankings, long-term joint burden and annual outcome levels",
    trendTitle: "Annual trajectories",
    trendGlobal: "Global median (2000=100)",
    trendCountry: "Country values",
    ringTitle: "Composite burden ranking",
    ringSub: "All countries and territories follow a continuous rank gradient; bar length encodes the composite score",
    rankTitle: "Composite and long-term joint burden rankings",
    rankSub: "Compare composite rank, long-term burden and all three outcome levels",
    methodology: "Method",
    burdenWeight: "Long-term joint burden weight",
    trendWeight: "Joint increase weight",
    methodologyText: "Long-term joint burden is the equal-weight mean of standardized country-level mean suicide mortality, anxiety prevalence and depressive prevalence over 2000–2019. The joint increase score is the equal-weight mean of their standardized log-linear annual slopes. The composite burden ranking score is fixed at 60% long-term joint burden and 40% joint increase.",
    joint: "Composite burden ranking score",
    longTerm: "Long-term joint burden",
    anxiety: "Anxiety prevalence",
    depression: "Depressive prevalence",
    suicide: "Suicide mortality",
    divergenceMetric: "Fatal/non-fatal divergence",
    selectedCountry: "Focus country",
    rank: "Rank",
    score: "Score",
    noMatch: "No countries match",
    search: "Search country or code",
    sourceFinal: "Final research dataset",
    sourceLoading: "Loading final dataset",
    sourceDemo: "Synthetic demo data",
    sourceUpload: "Uploaded panel",
    formatTitle: "CSV data schema",
    formatText: "Each row represents one country or area in one year. Suicide mortality is measured per 100,000; anxiety and depressive outcomes are annual age-standardized point prevalence.",
    required: "Required fields",
    optional: "Optional fields",
    close: "Close",
    downloadTemplate: "Download template",
    invalid: "The data could not be read. Check column names, years and numeric fields.",
    loaded: "Data loaded — every view has been updated",
    top: "ALL COUNTRIES AND TERRITORIES",
    all: "All countries",
    selectYear: "Select year",
    currentValue: "Current value",
    sinceFirst: "Since baseline",
    globalMedian: "Global median",
    spatialSection: "02 / SPATIAL",
    temporalSection: "03 / TEMPORAL",
    orbitSection: "04 / ORBIT",
    rankingSection: "05 / RANKING",
    dataInput: "DATA INPUT",
    scoreEngine: "RANKSCORE ENGINE",
    noData: "No data",
    high: "HIGH",
    low: "LOW",
    gradientColor: "Yellow for lower values · purple for higher values",
    allRankedAreas: "All {count} countries and territories",
    topTen: "Top 10 composite ranks",
    bottomTen: "Bottom 10 composite ranks",
    switchLanguage: "Switch to Chinese",
    rankingMetric: "Ranking metric",
    expand: "Expand",
    footerNote: "Exploratory country-level visualization · Associations and rankings do not imply individual risk or causality.",
    areas: "AREAS",
    version: "v",
    scoreFormula: "COMPOSITE BURDEN RANKING SCORE",
    longTermScore: "LONG-TERM JOINT BURDEN",
    jointIncreaseScore: "JOINT INCREASE SCORE",
    nonFatal: "Combined non-fatal burden",
    longTermRank: "LONG-TERM BURDEN",
    statA: "A",
    statB: "B",
    statC: "C",
    statD: "D",
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
  depressive_disorder_prevalence: ["depressive_disorder_prevalence", "depression_as_prevalence", "depression", "depressive prevalence", "depression prevalence"],
  continent: ["continent", "region", "world_region"],
};

const continentKeys: Record<string, "asia" | "europe" | "africa" | "northAmerica" | "southAmerica" | "oceania" | "other"> = {
  asia: "asia",
  亚洲: "asia",
  europe: "europe",
  欧洲: "europe",
  africa: "africa",
  非洲: "africa",
  "north america": "northAmerica",
  北美洲: "northAmerica",
  "south america": "southAmerica",
  南美洲: "southAmerica",
  oceania: "oceania",
  大洋洲: "oceania",
  other: "other",
  其他: "other",
};

const continentNames = {
  asia: { zh: "亚洲", en: "Asia" },
  europe: { zh: "欧洲", en: "Europe" },
  africa: { zh: "非洲", en: "Africa" },
  northAmerica: { zh: "北美洲", en: "North America" },
  southAmerica: { zh: "南美洲", en: "South America" },
  oceania: { zh: "大洋洲", en: "Oceania" },
  other: { zh: "其他", en: "Other" },
};

const chineseCountryFallbacks: Record<string, string> = {
  "N. Cyprus": "北塞浦路斯",
  Somaliland: "索马里兰",
};

const legacyCountryCodes: Record<string, string> = {
  ROM: "ROU",
  SEB: "SRB",
  TMP: "TLS",
  YUG: "MNE",
};

function canonicalCountryCode(code: string) {
  return legacyCountryCodes[code] || code;
}

function localizedCountryName(code: string, fallback: string, lang: Lang) {
  return countries.getName(canonicalCountryCode(code), lang, { select: "official" }) || (lang === "zh" ? chineseCountryFallbacks[fallback] : undefined) || fallback;
}

function atlasCountryName(code: string, fallback: string) {
  const numericCode = countries.alpha3ToNumeric(canonicalCountryCode(code));
  return (numericCode && atlasNameByNumericCode.get(numericCode)) || fallback;
}

function localizedContinentName(value: string, lang: Lang) {
  const key = continentKeys[value.trim().toLowerCase()];
  return key ? continentNames[key][lang] : value;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function demoData(): Datum[] {
  const rows: Datum[] = [];
  atlasGeographies.forEach((geo, index) => {
    const name = geo.properties?.name || "Unknown";
    if (name === "Antarctica" || name === "Unknown") return;
    const code = geo.id === undefined || geo.id === null ? String(900 + index) : String(geo.id).padStart(3, "0");
    const seed = hashString(`${code}-${name}`);
    const baseSuicide = 3.2 + (seed % 1900) / 100;
    const baseAnxiety = 2.1 + ((seed >> 5) % 560) / 100;
    const baseDepression = 1.8 + ((seed >> 7) % 420) / 100;
    const suicideSlope = -0.032 + ((seed >> 9) % 80) / 1000;
    const anxietySlope = -0.006 + ((seed >> 13) % 48) / 1000;
    const depressionSlope = -0.004 + ((seed >> 15) % 40) / 1000;
    for (let year = 2000; year <= 2019; year += 1) {
      const t = year - 2000;
      const wave = Math.sin(t / 2.9 + (seed % 13)) * 0.025;
      rows.push({
        country_code: code,
        country_name: name,
        year,
        suicide_rate: Math.max(0.6, baseSuicide * Math.exp(suicideSlope * t + wave)),
        anxiety_disorder_prevalence: Math.max(0.5, baseAnxiety * Math.exp(anxietySlope * t + wave * 0.35)),
        depressive_disorder_prevalence: Math.max(0.4, baseDepression * Math.exp(depressionSlope * t + wave * 0.25)),
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

function standardScores(values: Array<{ key: string; value: number }>) {
  const finite = values.filter((entry) => Number.isFinite(entry.value));
  const map = new Map<string, number>();
  if (!finite.length) return map;
  const mean = finite.reduce((sum, entry) => sum + entry.value, 0) / finite.length;
  const variance = finite.reduce((sum, entry) => sum + (entry.value - mean) ** 2, 0) / finite.length;
  const scale = Math.sqrt(variance);
  finite.forEach((entry) => map.set(entry.key, scale > 0 ? (entry.value - mean) / scale : 0));
  return map;
}

function logLinearSlope(series: Datum[], value: (row: Datum) => number) {
  const valid = series
    .map((row) => ({ year: row.year, logValue: Math.log(value(row)) }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.logValue));
  if (valid.length < 3) return 0;
  const meanYear = valid.reduce((sum, row) => sum + row.year, 0) / valid.length;
  const meanLogValue = valid.reduce((sum, row) => sum + row.logValue, 0) / valid.length;
  const numerator = valid.reduce((sum, row) => sum + (row.year - meanYear) * (row.logValue - meanLogValue), 0);
  const denominator = valid.reduce((sum, row) => sum + (row.year - meanYear) ** 2, 0);
  return denominator > 0 ? numerator / denominator : 0;
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
      const depression = Number(field(row, "depressive_disorder_prevalence"));
      const continent = String(field(row, "continent") ?? continentByCode[code] ?? "Other");
      return {
        country_code: code,
        country_name: name,
        year,
        suicide_rate: suicide,
        anxiety_disorder_prevalence: anxiety,
        depressive_disorder_prevalence: depression,
        continent,
      };
    })
    .filter((row) => row.country_name && Number.isFinite(row.year) && Number.isFinite(row.suicide_rate) && Number.isFinite(row.anxiety_disorder_prevalence) && Number.isFinite(row.depressive_disorder_prevalence));
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
  if (metric === "longTerm") return <Globe2 size={14} />;
  if (metric === "anxiety") return <Activity size={14} />;
  if (metric === "depression") return <Activity size={14} />;
  if (metric === "suicide") return <BarChart3 size={14} />;
  return <ArrowUpRight size={14} />;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [rows, setRows] = useState<Datum[]>([]);
  const [sourceName, setSourceName] = useState("loading");
  const [metric, setMetric] = useState<Metric>("joint");
  const burdenWeight = 60;
  const [year, setYear] = useState(2019);
  const [selected, setSelected] = useState("CHN");
  const [query, setQuery] = useState("");
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = copy[lang];
  const countryLabel = useCallback((item: Pick<RankedCountry, "code" | "name">) => localizedCountryName(item.code, item.name, lang), [lang]);
  const continentLabel = useCallback((value: string) => localizedContinentName(value, lang), [lang]);

  useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.documentTitle]);

  useEffect(() => {
    let active = true;
    fetch("./data/main_country_year_panel_200_2000_2019_FINAL.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Default panel unavailable");
        return response.text();
      })
      .then((text) => {
        const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        const normalized = normalizeRows(parsed.data);
        const countryCount = new Set(normalized.map((item) => item.country_code || item.country_name)).size;
        const availableYears = [...new Set(normalized.map((item) => item.year))].sort((a, b) => a - b);
        if (countryCount !== 200 || availableYears.length !== 20) throw new Error("Default panel is incomplete");
        if (!active) return;
        setRows(normalized);
        setSourceName("final");
        setYear(availableYears[availableYears.length - 1]);
        setSelected(normalized.some((item) => item.country_code === "CHN") ? "CHN" : normalized[0].country_code);
      })
      .catch(() => {
        if (!active) return;
        setRows(demoData());
        setSourceName("demo");
      });
    return () => {
      active = false;
    };
  }, []);

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
    const current: Array<{
      key: string;
      row: Datum;
      first: Datum;
      longSuicide: number;
      longAnxiety: number;
      longDepression: number;
      suicideSlope: number;
      anxietySlope: number;
      depressionSlope: number;
    }> = [];
    countrySeries.forEach((series, key) => {
      const active = series.find((item) => item.year === year);
      if (!active) return;
      const first = series[0];
      current.push({
        key,
        row: active,
        first,
        longSuicide: series.reduce((sum, item) => sum + item.suicide_rate, 0) / series.length,
        longAnxiety: series.reduce((sum, item) => sum + item.anxiety_disorder_prevalence, 0) / series.length,
        longDepression: series.reduce((sum, item) => sum + item.depressive_disorder_prevalence, 0) / series.length,
        suicideSlope: logLinearSlope(series, (item) => item.suicide_rate),
        anxietySlope: logLinearSlope(series, (item) => item.anxiety_disorder_prevalence),
        depressionSlope: logLinearSlope(series, (item) => item.depressive_disorder_prevalence),
      });
    });
    const suicideLevelZ = standardScores(current.map((item) => ({ key: item.key, value: item.longSuicide })));
    const anxietyLevelZ = standardScores(current.map((item) => ({ key: item.key, value: item.longAnxiety })));
    const depressionLevelZ = standardScores(current.map((item) => ({ key: item.key, value: item.longDepression })));
    const suicideSlopeZ = standardScores(current.map((item) => ({ key: item.key, value: item.suicideSlope })));
    const anxietySlopeZ = standardScores(current.map((item) => ({ key: item.key, value: item.anxietySlope })));
    const depressionSlopeZ = standardScores(current.map((item) => ({ key: item.key, value: item.depressionSlope })));
    const suicideChanges = current.map((item) => ({ key: item.key, value: ((item.row.suicide_rate / item.first.suicide_rate) - 1) * 100 }));
    const anxietyChanges = current.map((item) => ({ key: item.key, value: ((item.row.anxiety_disorder_prevalence / item.first.anxiety_disorder_prevalence) - 1) * 100 }));
    const depressionChanges = current.map((item) => ({ key: item.key, value: ((item.row.depressive_disorder_prevalence / item.first.depressive_disorder_prevalence) - 1) * 100 }));
    const suicideRanks = [...current].sort((a, b) => b.row.suicide_rate - a.row.suicide_rate);
    const anxietyRanks = [...current].sort((a, b) => b.row.anxiety_disorder_prevalence - a.row.anxiety_disorder_prevalence);
    const depressionRanks = [...current].sort((a, b) => b.row.depressive_disorder_prevalence - a.row.depressive_disorder_prevalence);
    const suicideRank = new Map(suicideRanks.map((item, index) => [item.key, index + 1]));
    const anxietyRank = new Map(anxietyRanks.map((item, index) => [item.key, index + 1]));
    const depressionRank = new Map(depressionRanks.map((item, index) => [item.key, index + 1]));
    const weight = burdenWeight / 100;
    const calculated = current.map((item) => {
      const longTermBurden = ((suicideLevelZ.get(item.key) || 0) + (anxietyLevelZ.get(item.key) || 0) + (depressionLevelZ.get(item.key) || 0)) / 3;
      const jointIncrease = ((suicideSlopeZ.get(item.key) || 0) + (anxietySlopeZ.get(item.key) || 0) + (depressionSlopeZ.get(item.key) || 0)) / 3;
      const suicideChange = suicideChanges.find((entry) => entry.key === item.key)?.value || 0;
      const anxietyChange = anxietyChanges.find((entry) => entry.key === item.key)?.value || 0;
      const depressionChange = depressionChanges.find((entry) => entry.key === item.key)?.value || 0;
      return {
        key: item.key,
        item,
        longTermBurden,
        jointIncrease,
        suicideChange,
        anxietyChange,
        depressionChange,
        joint: longTermBurden * weight + jointIncrease * (1 - weight),
      };
    });
    const longTermRank = new Map(
      [...calculated]
        .sort((a, b) => b.longTermBurden - a.longTermBurden)
        .map((entry, index) => [entry.key, index + 1]),
    );
    return calculated.map(({ item, longTermBurden, jointIncrease, suicideChange, anxietyChange, depressionChange, joint }) => {
      return {
        code: item.row.country_code,
        name: item.row.country_name,
        continent: item.row.continent,
        suicide: item.row.suicide_rate,
        anxiety: item.row.anxiety_disorder_prevalence,
        depression: item.row.depressive_disorder_prevalence,
        suicideRank: suicideRank.get(item.key) || 0,
        anxietyRank: anxietyRank.get(item.key) || 0,
        depressionRank: depressionRank.get(item.key) || 0,
        longTermSuicide: item.longSuicide,
        longTermAnxiety: item.longAnxiety,
        longTermDepression: item.longDepression,
        longTermBurden,
        longTermRank: longTermRank.get(item.key) || 0,
        jointIncrease,
        joint,
        divergence: ((((item.anxietySlope + item.depressionSlope) / 2) - item.suicideSlope) * 100),
        suicideChange,
        anxietyChange,
        depressionChange,
      };
    });
  }, [burdenWeight, countrySeries, year]);

  const metricValue = useCallback((item: RankedCountry) => {
    if (metric === "longTerm") return item.longTermBurden;
    if (metric === "anxiety") return item.anxiety;
    if (metric === "depression") return item.depression;
    if (metric === "suicide") return item.suicide;
    if (metric === "divergence") return item.divergence;
    return item.joint;
  }, [metric]);

  const sortedRanking = useMemo(() => [...ranking].sort((a, b) => metricValue(b) - metricValue(a)), [metricValue, ranking]);
  const selectedRank = ranking.find((item) => item.code === selected) || sortedRanking[0];
  const selectedCode = selectedRank?.code || "";
  const selectedRows = countrySeries.get(selectedCode) || [];
  const globalDivergence = median(ranking.map((item) => ((item.anxietyChange + item.depressionChange) / 2) - item.suicideChange));

  useEffect(() => {
    if (selectedRank && selected !== selectedRank.code) setSelected(selectedRank.code);
  }, [selected, selectedRank]);

  const filteredRanking = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedRanking;
    return sortedRanking.filter((item) => countryLabel(item).toLowerCase().includes(normalized) || item.name.toLowerCase().includes(normalized) || item.code.toLowerCase().includes(normalized));
  }, [countryLabel, query, sortedRanking]);

  const globalSeries = useMemo(() => years.map((activeYear) => {
    const inYear = rows.filter((row) => row.year === activeYear);
    return {
      year: activeYear,
      suicide: median(inYear.map((row) => row.suicide_rate)),
      anxiety: median(inYear.map((row) => row.anxiety_disorder_prevalence)),
      depression: median(inYear.map((row) => row.depressive_disorder_prevalence)),
    };
  }), [rows, years]);

  const mapOption = useMemo<echarts.EChartsOption>(() => {
    const values = ranking.map(metricValue);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const mapData = ranking.map((item) => ({
      name: atlasCountryName(item.code, item.name),
      displayName: countryLabel(item),
      value: metricValue(item),
      code: item.code,
      suicide: item.suicide,
      anxiety: item.anxiety,
      depression: item.depression,
      joint: item.joint,
      longTermBurden: item.longTermBurden,
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
          const p = params as { data?: { displayName: string; code: string; suicide: number; anxiety: number; depression: number; joint: number; longTermBurden: number } };
          if (!p.data) return t.noData;
          return `<div class="map-tip"><b>${p.data.displayName}</b><span>${p.data.code}</span><hr/><div>${t.suicide} <strong>${fmt(p.data.suicide)}</strong></div><div>${t.anxiety} <strong>${fmt(p.data.anxiety)}%</strong></div><div>${t.depression} <strong>${fmt(p.data.depression)}%</strong></div><div>${t.longTerm} <strong>${fmt(p.data.longTermBurden, 2)}</strong></div><div>${t.joint} <strong>${fmt(p.data.joint, 2)}</strong></div></div>`;
        },
      },
      visualMap: {
        type: "continuous",
        min,
        max,
        left: "center",
        bottom: 10,
        orient: "horizontal",
        itemWidth: 8,
        itemHeight: 180,
        text: [t.high, t.low],
        textGap: 9,
        textStyle: { color: "#8aa0ad", fontSize: 9, fontFamily: "Arial" },
        calculable: false,
        inRange: { color: burdenMapPalette },
        outOfRange: { color: ["#172832"] },
        borderColor: "transparent",
      },
      series: [{
        type: "map",
        map: "mind-world",
        roam: true,
        scaleLimit: { min: 1, max: 8 },
        zoom: 1.06,
        top: 0,
        bottom: 38,
        data: mapData,
        itemStyle: { areaColor: "#111d26", borderColor: "#283945", borderWidth: 0.55 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: "#f6d365", borderColor: "#fff3bf", borderWidth: 1.2, shadowBlur: 20, shadowColor: "rgba(246,211,101,.45)" } },
        select: { label: { show: false }, itemStyle: { areaColor: "#f6d365", borderColor: "#ffffff" } },
      }],
    };
  }, [countryLabel, metricValue, ranking, t.anxiety, t.depression, t.high, t.joint, t.longTerm, t.low, t.noData, t.suicide]);

  const handleMapClick = useCallback((params: unknown) => {
    const p = params as { data?: { code?: string } };
    if (p.data?.code) setSelected(p.data.code);
  }, []);

  const globalBaseSuicide = globalSeries[0]?.suicide || 1;
  const globalBaseAnxiety = globalSeries[0]?.anxiety || 1;
  const globalBaseDepression = globalSeries[0]?.depression || 1;
  const trendOption = useMemo<echarts.EChartsOption>(() => {
    const countryYears = selectedRows.map((item) => item.year);
    const countrySuicide = selectedRows.map((item) => item.suicide_rate);
    const countryAnxiety = selectedRows.map((item) => item.anxiety_disorder_prevalence);
    const countryDepression = selectedRows.map((item) => item.depressive_disorder_prevalence);
    return {
      backgroundColor: "transparent",
      animationDuration: 700,
      grid: [{ left: 44, right: 18, top: 54, height: "30%" }, { left: 44, right: 42, top: "60%", bottom: 32 }],
      tooltip: { trigger: "axis", backgroundColor: "rgba(7,12,18,.96)", borderColor: "#31434f", textStyle: { color: "#eef9ff" } },
      legend: [{ top: 4, left: 0, textStyle: { color: "#8294a1", fontSize: 9 }, itemWidth: 12, data: [t.suicide, t.anxiety, t.depression] }],
      xAxis: [
        { type: "category", gridIndex: 0, data: years, boundaryGap: false, axisLabel: { color: "#60727f", fontSize: 9, interval: Math.max(0, Math.floor(years.length / 5) - 1) }, axisLine: { lineStyle: { color: "#283843" } }, axisTick: { show: false } },
        { type: "category", gridIndex: 1, data: countryYears, boundaryGap: false, axisLabel: { color: "#60727f", fontSize: 9, interval: Math.max(0, Math.floor(countryYears.length / 5) - 1) }, axisLine: { lineStyle: { color: "#283843" } }, axisTick: { show: false } },
      ],
      yAxis: [
        { type: "value", gridIndex: 0, scale: true, axisLabel: { color: "#60727f", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(95,116,130,.12)" } } },
        { type: "value", gridIndex: 1, scale: true, position: "left", axisLabel: { color: "#4f78c8", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(95,116,130,.12)" } } },
        { type: "value", gridIndex: 1, scale: true, position: "right", axisLabel: { color: "#d97cb3", fontSize: 9 }, splitLine: { show: false } },
      ],
      graphic: [
        { type: "text", left: 0, top: 30, style: { text: t.trendGlobal, fill: "#687b88", font: "10px Arial" } },
        { type: "text", left: 0, top: "53%", style: { text: `${t.trendCountry} · ${selectedRank ? countryLabel(selectedRank) : "—"}`, fill: "#687b88", font: "10px Arial" } },
      ],
      series: [
        { name: t.suicide, type: "line", xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: 0.35, data: globalSeries.map((item) => (item.suicide / globalBaseSuicide) * 100), lineStyle: { color: "#3e63af", width: 2.2 } },
        { name: t.anxiety, type: "line", xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: 0.35, data: globalSeries.map((item) => (item.anxiety / globalBaseAnxiety) * 100), lineStyle: { color: "#d97cb3", width: 2.2 } },
        { name: t.depression, type: "line", xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, smooth: 0.35, data: globalSeries.map((item) => (item.depression / globalBaseDepression) * 100), lineStyle: { color: "#7f3292", width: 2.2 } },
        { name: t.suicide, type: "line", xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, smooth: 0.3, data: countrySuicide, lineStyle: { color: "#3e63af", width: 2.4 } },
        { name: t.anxiety, type: "line", xAxisIndex: 1, yAxisIndex: 2, showSymbol: false, smooth: 0.3, data: countryAnxiety, lineStyle: { color: "#d97cb3", width: 2.4 } },
        { name: t.depression, type: "line", xAxisIndex: 1, yAxisIndex: 2, showSymbol: false, smooth: 0.3, data: countryDepression, lineStyle: { color: "#7f3292", width: 2.4 } },
      ],
    };
  }, [countryLabel, globalBaseAnxiety, globalBaseDepression, globalBaseSuicide, globalSeries, selectedRank, selectedRows, t.anxiety, t.depression, t.suicide, t.trendCountry, t.trendGlobal, years]);

  const ringCountries = useMemo(() => [...ranking].sort((a, b) => b.joint - a.joint), [ranking]);
  const ringOption = useMemo<echarts.EChartsOption>(() => {
    const floor = Math.min(...ringCountries.map((item) => item.joint), 0);
    const offset = -floor + 0.05;
    const ringValues = ringCountries.map((item) => item.joint + offset);
    return {
      backgroundColor: "transparent",
      animationDurationUpdate: 650,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(7,12,18,.96)",
        borderColor: "#31434f",
        textStyle: { color: "#eef9ff" },
        formatter: (params: unknown) => {
          const p = params as { name: string; dataIndex: number };
          const country = ringCountries[p.dataIndex];
          return `<b>#${p.dataIndex + 1} ${p.name}</b><br/>${t.joint}&nbsp;&nbsp;<strong>${fmt(country?.joint || 0, 2)}</strong><br/>${t.longTerm}&nbsp;&nbsp;<strong>#${country?.longTermRank || 0} · ${fmt(country?.longTermBurden || 0, 2)}</strong><br/>${t.suicide}&nbsp;&nbsp;${fmt(country?.longTermSuicide || 0)}<br/>${t.anxiety}&nbsp;&nbsp;${fmt(country?.longTermAnxiety || 0)}%<br/>${t.depression}&nbsp;&nbsp;${fmt(country?.longTermDepression || 0)}%`;
        },
      },
      angleAxis: { type: "category", data: ringCountries.map(countryLabel), startAngle: 90, clockwise: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
      radiusAxis: { min: 0, max: Math.max(...ringValues, 1), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { lineStyle: { color: ["rgba(111,132,145,.11)"] } }, splitNumber: 4 },
      polar: { radius: ["24%", "86%"] },
      series: [{
        type: "bar",
        coordinateSystem: "polar",
        roundCap: true,
        barWidth: "88%",
        data: ringCountries.map((item, index) => {
          const color = interpolatePalette(rankingRingPalette, 1 - index / Math.max(1, ringCountries.length - 1));
          return {
          name: countryLabel(item),
          value: ringValues[index],
          code: item.code,
          itemStyle: {
            color,
            opacity: selectedCode === item.code ? 1 : 0.72,
            shadowBlur: selectedCode === item.code ? 16 : 0,
            shadowColor: color,
          },
          };
        }),
      }],
      graphic: [
        { type: "text", left: "center", top: "42%", style: { text: t.top, fill: "#718492", font: "600 9px Arial", textAlign: "center" } },
        { type: "text", left: "center", top: "49%", style: { text: String(ringCountries.length), fill: "#eefaff", font: "700 28px Arial", textAlign: "center" } },
      ],
    };
  }, [countryLabel, ringCountries, selectedCode, t.anxiety, t.depression, t.joint, t.longTerm, t.suicide, t.top]);

  const topTenCountries = useMemo(() => ringCountries.slice(0, 10), [ringCountries]);
  const bottomTenCountries = useMemo(() => ringCountries.slice(-10), [ringCountries]);
  const createMiniRingOption = useCallback((items: RankedCountry[], rankStart: number) => {
    const globalMinimum = Math.min(...ringCountries.map((item) => item.joint), 0);
    const globalMaximum = Math.max(...ringCountries.map((item) => item.joint), 1);
    const globalSpan = globalMaximum - globalMinimum || 1;
    return {
      backgroundColor: "transparent",
      animationDurationUpdate: 650,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(7,12,18,.96)",
        borderColor: "#47355f",
        textStyle: { color: "#eef9ff" },
        formatter: (params: unknown) => {
          const p = params as { data?: { country?: RankedCountry; rank?: number } };
          const country = p.data?.country;
          if (!country) return t.noData;
          return `<b>#${p.data?.rank} ${countryLabel(country)}</b><br/>${t.joint}&nbsp;&nbsp;<strong>${fmt(country.joint, 2)}</strong><br/>${t.longTerm}&nbsp;&nbsp;#${country.longTermRank} · ${fmt(country.longTermBurden, 2)}`;
        },
      },
      angleAxis: {
        type: "category",
        data: items.map((item) => item.code.slice(0, 3)),
        startAngle: 90,
        clockwise: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: true, interval: 0, margin: 5, color: "#738895", fontSize: 7, fontFamily: "Arial" },
      },
      radiusAxis: {
        min: 0,
        max: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitNumber: 3,
        splitLine: { lineStyle: { color: ["rgba(124,99,155,.12)"] } },
      },
      polar: { center: ["50%", "55%"], radius: ["30%", "70%"] },
      series: [{
        type: "bar",
        coordinateSystem: "polar",
        roundCap: true,
        barWidth: "58%",
        data: items.map((item, index) => {
          const globalIndex = ringCountries.findIndex((entry) => entry.code === item.code);
          const color = interpolatePalette(rankingRingPalette, 1 - globalIndex / Math.max(1, ringCountries.length - 1));
          return {
            name: countryLabel(item),
            value: 0.24 + 0.76 * ((item.joint - globalMinimum) / globalSpan),
            code: item.code,
            country: item,
            rank: rankStart + index,
            itemStyle: {
              color,
              opacity: selectedCode === item.code ? 1 : 0.84,
              shadowBlur: selectedCode === item.code ? 12 : 0,
              shadowColor: color,
            },
          };
        }),
      }],
      graphic: [{
        type: "text",
        left: "center",
        top: "47%",
        style: { text: `${rankStart}–${rankStart + items.length - 1}`, fill: "#d9e6ec", font: "700 12px Arial", textAlign: "center" },
      }],
    } as echarts.EChartsOption;
  }, [countryLabel, ringCountries, selectedCode, t.joint, t.longTerm, t.noData]);
  const topTenOption = useMemo(() => createMiniRingOption(topTenCountries, 1), [createMiniRingOption, topTenCountries]);
  const bottomTenOption = useMemo(() => createMiniRingOption(bottomTenCountries, ringCountries.length - bottomTenCountries.length + 1), [bottomTenCountries, createMiniRingOption, ringCountries.length]);

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
      depressive_disorder_prevalence: item.depression,
      depression_rank: item.depressionRank,
      long_term_suicide_mean: item.longTermSuicide,
      long_term_anxiety_mean: item.longTermAnxiety,
      long_term_depression_mean: item.longTermDepression,
      long_term_joint_burden: item.longTermBurden,
      long_term_rank: item.longTermRank,
      joint_increase_score: item.jointIncrease,
      burden_ranking_score: item.joint,
      composite_rank: ringCountries.findIndex((entry) => entry.code === item.code) + 1,
      divergence_score: item.divergence,
    }));
    downloadText(`mind_atlas_ranking_${year}.csv`, Papa.unparse(data));
  };

  const downloadTemplate = () => {
    downloadText("mind_atlas_upload_template.csv", Papa.unparse([
      { country_code: "CHN", country_name: "China", year: 2000, suicide_rate: 12.4, anxiety_disorder_prevalence: 3.1, depressive_disorder_prevalence: 3.0, continent: "Asia" },
      { country_code: "CHN", country_name: "China", year: 2001, suicide_rate: 12.0, anxiety_disorder_prevalence: 3.2, depressive_disorder_prevalence: 3.1, continent: "Asia" },
      { country_code: "USA", country_name: "United States of America", year: 2000, suicide_rate: 10.4, anxiety_disorder_prevalence: 5.0, depressive_disorder_prevalence: 4.2, continent: "North America" },
      { country_code: "USA", country_name: "United States of America", year: 2001, suicide_rate: 10.7, anxiety_disorder_prevalence: 5.1, depressive_disorder_prevalence: 4.3, continent: "North America" },
    ]));
  };

  const metricLabel = t[metric === "divergence" ? "divergenceMetric" : metric];
  const metricPeriod = metric === "joint" || metric === "longTerm" ? `${minYear}–${maxYear}` : String(year);
  const rangeProgress = years.length > 1 ? ((year - minYear) / (maxYear - minYear)) * 100 : 100;
  const rankingMetricMinimum = sortedRanking.length ? Math.min(...sortedRanking.map(metricValue)) : 0;
  const rankingMetricMaximum = sortedRanking.length ? Math.max(...sortedRanking.map(metricValue)) : 1;
  const rankingMetricSpan = rankingMetricMaximum - rankingMetricMinimum;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <AtlasNav lang={lang} active="atlas" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="hero-kicker">{t.heroKicker}</span>
          <h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{t.heroSummary}</p>
          <div className="hero-actions">
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); event.target.value = ""; }} />
            <button className="button-primary" onClick={() => inputRef.current?.click()}><UploadCloud size={18} />{t.upload}</button>
            <button className="button-secondary" onClick={exportRanking}><Download size={17} />{t.export}</button>
            <button className="button-secondary" onClick={() => setSchemaOpen(true)}><FileSpreadsheet size={17} />{t.schema}</button>
          </div>
        </div>
      </section>

      {uploadMessage && <div className={`toast ${uploadMessage === t.invalid ? "error" : ""}`}><Info size={16} />{uploadMessage}</div>}

      <section className="control-strip">
        <div className="metric-tabs" role="tablist" aria-label={t.rankingMetric}>
          {(["joint", "longTerm", "suicide", "anxiety", "depression", "divergence"] as Metric[]).map((item) => (
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
        <article><span className="stat-index">{t.statA}</span><div><span>{t.countries}</span><strong>{countrySeries.size}</strong><small>{sourceName === "final" ? t.sourceFinal : sourceName === "loading" ? t.sourceLoading : sourceName === "demo" ? t.sourceDemo : t.sourceUpload}</small></div></article>
        <article><span className="stat-index">{t.statB}</span><div><span>{t.years}</span><strong>{years.length}</strong><small>{minYear} — {maxYear}</small></div></article>
        <article><span className="stat-index">{t.statC}</span><div><span>{t.latest}</span><strong>{year}</strong><small>{metricLabel}</small></div></article>
        <article className="signal-stat"><span className="stat-index">{t.statD}</span><div><span>{t.divergence}</span><strong className={globalDivergence >= 0 ? "warm" : "cool"}>{pct(globalDivergence)}</strong><small>{t.nonFatal} − {t.suicide}</small></div><div className="signal-bars">{[3, 6, 4, 8, 12, 9, 14, 18, 15, 22].map((height, index) => <i key={index} style={{ height }} />)}</div></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel map-panel">
          <div className="panel-head">
            <div><span className="panel-number">{t.spatialSection}</span><h2>{t.mapTitle}</h2><p>{t.mapSub}</p></div>
            <div className="panel-badge"><Globe2 size={14} />{metricLabel} · {metricPeriod}</div>
          </div>
          <EChart option={mapOption} className="map-chart" onClick={handleMapClick} />
          <div className="map-country-card">
            <span>{t.selectedCountry}</span>
            <strong>{selectedRank ? countryLabel(selectedRank) : "—"}</strong>
            <div><em>#{sortedRanking.findIndex((item) => item.code === selectedCode) + 1}</em><small>{metricLabel}</small></div>
          </div>
        </article>

        <article className="panel trend-panel">
          <div className="panel-head">
            <div><span className="panel-number">{t.temporalSection}</span><h2>{t.trendTitle}</h2><p>{selectedRank ? countryLabel(selectedRank) : t.globalMedian}</p></div>
            <button className="ghost-icon" aria-label={t.expand}><Maximize2 size={15} /></button>
          </div>
          <EChart option={trendOption} className="trend-chart" />
          {selectedRank && <div className="country-readout">
            <div><span>{t.suicide}</span><strong>{fmt(selectedRank.suicide)}</strong><small className={selectedRank.suicideChange > 0 ? "up" : "down"}>{selectedRank.suicideChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(selectedRank.suicideChange)}</small></div>
            <div><span>{t.anxiety}</span><strong>{fmt(selectedRank.anxiety)}%</strong><small className={selectedRank.anxietyChange > 0 ? "up" : "down"}>{selectedRank.anxietyChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(selectedRank.anxietyChange)}</small></div>
            <div><span>{t.depression}</span><strong>{fmt(selectedRank.depression)}%</strong><small className={selectedRank.depressionChange > 0 ? "up" : "down"}>{selectedRank.depressionChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(selectedRank.depressionChange)}</small></div>
          </div>}
        </article>

        <article className="panel ring-panel">
          <div className="panel-head">
            <div><span className="panel-number">{t.orbitSection}</span><h2>{t.ringTitle}</h2><p>{t.ringSub}</p></div>
            <button className="ghost-icon" onClick={() => setMethodOpen(true)} aria-label={t.methodology}><CircleHelp size={16} /></button>
          </div>
          <div className="ring-visuals">
            <EChart option={ringOption} className="ring-chart" onClick={handleRingClick} />
            <div className="mini-rings">
              <div className="mini-ring-card"><span>{t.topTen}</span><EChart option={topTenOption} className="mini-ring-chart" onClick={handleRingClick} /></div>
              <div className="mini-ring-card"><span>{t.bottomTen}</span><EChart option={bottomTenOption} className="mini-ring-chart" onClick={handleRingClick} /></div>
            </div>
          </div>
          <div className="ring-legend"><span><i className="legend-gradient" />{t.gradientColor}</span><span>{t.allRankedAreas.replace("{count}", String(ringCountries.length))}</span></div>
        </article>

        <article className="panel ranking-panel">
          <div className="panel-head ranking-head">
            <div><span className="panel-number">{t.rankingSection}</span><h2>{t.rankTitle}</h2><p>{t.rankSub}</p></div>
            <button className="ghost-icon" onClick={exportRanking} aria-label={t.export}><Download size={16} /></button>
          </div>
          <div className="ranking-toolbar">
            <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
            <button onClick={() => setMethodOpen(true)}><span>{burdenWeight}/{100 - burdenWeight}</span>{t.methodology}<ChevronDown size={13} /></button>
          </div>
          <div className="ranking-columns"><span>{t.rank}</span><span>{t.all}</span><span>{t.suicide}</span><span>{t.anxiety}</span><span>{t.depression}</span><span>{t.longTermRank}</span><span>{t.score}</span></div>
          <div className="ranking-list">
            {filteredRanking.map((item) => {
              const actualRank = sortedRanking.findIndex((entry) => entry.code === item.code) + 1;
              return <button key={`${item.code}-${item.name}`} className={selectedCode === item.code ? "selected" : ""} onClick={() => setSelected(item.code)}>
                <span className="rank-number">{String(actualRank).padStart(2, "0")}</span>
                <span className="country-cell"><i>{item.code.slice(0, 3)}</i><span><strong>{countryLabel(item)}</strong><small>{continentLabel(item.continent)}</small></span></span>
                <span><b>#{item.suicideRank}</b><small>{fmt(item.suicide)}</small></span>
                <span><b>#{item.anxietyRank}</b><small>{fmt(item.anxiety)}%</small></span>
                <span><b>#{item.depressionRank}</b><small>{fmt(item.depression)}%</small></span>
                <span><b>#{item.longTermRank}</b><small>{fmt(item.longTermBurden, 2)}</small></span>
                <span className="score-cell"><b>{fmt(metricValue(item), 2)}</b><i style={{ width: `${rankingMetricSpan > 0 ? ((metricValue(item) - rankingMetricMinimum) / rankingMetricSpan) * 100 : 100}%` }} /></span>
              </button>;
            })}
            {!filteredRanking.length && <div className="no-match">{t.noMatch}</div>}
          </div>
        </article>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><span /><span /></span><span>{t.brand}</span></div>
        <p>{t.footerNote}</p>
        <span>{year} / {countrySeries.size} {t.areas} / {t.version}0.1</span>
      </footer>

      {(schemaOpen || methodOpen) && <div className="modal-backdrop" onMouseDown={() => { setSchemaOpen(false); setMethodOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => { setSchemaOpen(false); setMethodOpen(false); }} aria-label={t.close}><X size={18} /></button>
          {schemaOpen ? <>
            <span className="modal-kicker"><FileSpreadsheet size={15} />{t.dataInput}</span>
            <h3>{t.formatTitle}</h3>
            <p>{t.formatText}</p>
            <div className="schema-box"><strong>{t.required}</strong><code>country_code</code><code>country_name</code><code>year</code><code>suicide_rate</code><code>anxiety_disorder_prevalence</code><code>depressive_disorder_prevalence</code></div>
            <div className="schema-box optional"><strong>{t.optional}</strong><code>continent</code></div>
            <button className="button-primary modal-action" onClick={downloadTemplate}><Download size={17} />{t.downloadTemplate}</button>
          </> : <>
            <span className="modal-kicker"><Sparkles size={15} />{t.scoreEngine}</span>
            <h3>{t.methodology}</h3>
            <p>{t.methodologyText}</p>
            <div className="weight-readout"><div><span>{t.burdenWeight}</span><strong>{burdenWeight}%</strong></div><div><span>{t.trendWeight}</span><strong>{100 - burdenWeight}%</strong></div></div>
            <div className="formula"><span>{t.scoreFormula}</span><b>=</b><em>{(burdenWeight / 100).toFixed(2)} · {t.longTermScore}</em><b>+</b><em>{((100 - burdenWeight) / 100).toFixed(2)} · {t.jointIncreaseScore}</em></div>
          </>}
        </div>
      </div>}
    </main>
  );
}
