"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Database, Download, KeyRound, LockKeyhole, LogOut, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";
import { backendConfigured, fetchResearchResponses, signInResearchAdmin, type StoredResearchSubmission } from "../src/research-backend";

const adminText = {
  zh: {
    title: "研究数据后台",
    subtitle: "仅授权研究管理员可以查看与导出个体层面问卷记录",
    login: "管理员登录",
    loginText: "使用Supabase中已授权的研究管理员账号。参与者不需要登录。",
    email: "管理员邮箱",
    password: "密码",
    signIn: "安全登录",
    authError: "登录失败，或当前账号不在研究管理员名单中。",
    notConfigured: "数据库尚未连接。完成Supabase配置后，此处将显示研究数据。",
    responses: "有效提交",
    countries: "覆盖国家或地区",
    gad: "平均GAD-7",
    who: "平均WHO-5",
    completion: "平均填写时间",
    minutes: "分钟",
    records: "问卷记录",
    search: "搜索国家、编号或年龄组",
    export: "导出全部CSV",
    refresh: "刷新",
    logout: "退出后台",
    submitted: "提交时间",
    id: "随机编号",
    country: "国家代码",
    age: "年龄组",
    gender: "性别",
    employment: "就业状态",
    noData: "尚无已提交记录",
    security: "数据库行级权限已启用：匿名访客只能写入，只有管理员可以读取。",
    distribution: "量表得分分布",
  },
  en: {
    title: "Research data dashboard",
    subtitle: "Only authorised research administrators can view and export individual survey records",
    login: "Administrator sign-in",
    loginText: "Use a research administrator account authorised in Supabase. Participants do not sign in.",
    email: "Administrator email",
    password: "Password",
    signIn: "Sign in securely",
    authError: "Sign-in failed or this account is not authorised as a research administrator.",
    notConfigured: "The database is not connected. Research records will appear here after Supabase configuration.",
    responses: "Valid submissions",
    countries: "Countries or territories",
    gad: "Mean GAD-7",
    who: "Mean WHO-5",
    completion: "Mean completion time",
    minutes: "min",
    records: "Survey records",
    search: "Search country, identifier or age group",
    export: "Export all CSV",
    refresh: "Refresh",
    logout: "Sign out",
    submitted: "Submitted",
    id: "Random identifier",
    country: "Country code",
    age: "Age group",
    gender: "Gender",
    employment: "Employment",
    noData: "No submitted records yet",
    security: "Database row-level security is enabled: anonymous visitors can insert only, while administrators can read.",
    distribution: "Score distribution",
  },
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export default function AdminPage() {
  const [lang, setLang] = useState<AtlasLanguage>("en");
  const [token, setToken] = useState(() => window.sessionStorage.getItem("mind-atlas-admin-token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState<StoredResearchSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = adminText[lang];

  useEffect(() => {
    document.title = `${t.title} — SYSU3DAILAB MIND ATLAS`;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.title]);

  const load = async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      setRecords(await fetchResearchResponses(activeToken));
    } catch {
      setError(t.authError);
      setToken("");
      window.sessionStorage.removeItem("mind-atlas-admin-token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !backendConfigured) return;
    let active = true;
    fetchResearchResponses(token)
      .then((data) => { if (active) setRecords(data); })
      .catch(() => {
        if (!active) return;
        setError(t.authError);
        setToken("");
        window.sessionStorage.removeItem("mind-atlas-admin-token");
      });
    return () => { active = false; };
  }, [t.authError, token]);

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await signInResearchAdmin(email, password);
      window.sessionStorage.setItem("mind-atlas-admin-token", session.access_token);
      setToken(session.access_token);
      setPassword("");
      setLoading(false);
    } catch {
      setError(t.authError);
      setLoading(false);
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem("mind-atlas-admin-token");
    setToken("");
    setRecords([]);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? records.filter((record) => `${record.participant_uuid} ${record.country_code} ${record.age_group}`.toLowerCase().includes(needle)) : records;
  }, [query, records]);

  const metrics = useMemo(() => ({
    countries: new Set(records.map((record) => record.country_code)).size,
    gad: average(records.map((record) => record.gad7_score)),
    who: average(records.map((record) => record.who5_score)),
    minutes: average(records.map((record) => record.completion_seconds)) / 60,
  }), [records]);


  const gadBands = useMemo(() => [
    records.filter((record) => record.gad7_score <= 4).length,
    records.filter((record) => record.gad7_score >= 5 && record.gad7_score <= 9).length,
    records.filter((record) => record.gad7_score >= 10 && record.gad7_score <= 14).length,
    records.filter((record) => record.gad7_score >= 15).length,
  ], [records]);

  const exportCsv = () => {
    const flattened = records.map((record) => ({ ...record, gad7_answers: record.gad7_answers.join("|"), who5_answers: record.who5_answers.join("|") }));
    const blob = new Blob(["\ufeff", Papa.unparse(flattened)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mind_atlas_individual_survey_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <main className="app-shell feature-page admin-page">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <AtlasNav lang={lang} active="admin" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />
    <section className="admin-hero feature-width"><span className="feature-kicker"><Database size={15} />RESEARCH ADMIN</span><h1>{t.title}</h1><p>{t.subtitle}</p></section>
    {!backendConfigured ? <section className="admin-config feature-width"><LockKeyhole size={27} /><h2>{t.notConfigured}</h2><p><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code></p></section> : !token ? <section className="admin-login feature-width"><div><ShieldCheck size={26} /><span>AUTHORISED ACCESS ONLY</span><h2>{t.login}</h2><p>{t.loginText}</p></div><form onSubmit={(event) => { event.preventDefault(); void login(); }}><label><span>{t.email}</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label><span>{t.password}</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="admin-error">{error}</p>}<button disabled={loading}><KeyRound size={16} />{t.signIn}</button></form></section> : <>
      <section className="admin-kpis feature-width"><article><Users size={18} /><span>{t.responses}</span><strong>{records.length}</strong></article><article><Database size={18} /><span>{t.countries}</span><strong>{metrics.countries}</strong></article><article><span>{t.gad}</span><strong>{metrics.gad.toFixed(1)}<small>/21</small></strong></article><article><span>{t.who}</span><strong>{metrics.who.toFixed(1)}<small>/100</small></strong></article><article><span>{t.completion}</span><strong>{metrics.minutes.toFixed(1)}<small>{t.minutes}</small></strong></article></section>
      <section className="admin-body feature-width"><article className="admin-distribution"><header><span>{t.distribution}</span><strong>GAD-7</strong></header><div>{gadBands.map((count, index) => <div key={index}><span>{["0–4", "5–9", "10–14", "15–21"][index]}</span><i><b style={{ width: `${records.length ? (count / records.length) * 100 : 0}%` }} /></i><strong>{count}</strong></div>)}</div><p><ShieldCheck size={14} />{t.security}</p></article><article className="admin-records"><header><div><span>DATASET</span><h2>{t.records}</h2></div><div className="admin-tools"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label><button onClick={() => void load()} title={t.refresh}><RefreshCw size={15} className={loading ? "spin" : ""} /></button><button onClick={exportCsv}><Download size={15} />{t.export}</button><button onClick={logout} title={t.logout}><LogOut size={15} /></button></div></header><div className="admin-table-head"><span>{t.submitted}</span><span>{t.id}</span><span>{t.country}</span><span>{t.age}</span><span>{t.gender}</span><span>{t.employment}</span><span>GAD-7</span><span>WHO-5</span></div><div className="admin-table-body">{filtered.map((record) => <div key={record.id}><span>{new Date(record.submitted_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en")}</span><code>{record.participant_uuid.slice(0, 8)}</code><b>{record.country_code}</b><span>{record.age_group}</span><span>{record.gender}</span><span>{record.employment}</span><strong>{record.gad7_score}</strong><strong>{record.who5_score}</strong></div>)}{!filtered.length && <p>{t.noData}</p>}</div></article></section>
    </>}
    <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.security}</p><span>ADMIN / v1.0</span></footer>
  </main>;
}
