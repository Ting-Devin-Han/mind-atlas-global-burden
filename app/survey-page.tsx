"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, HeartHandshake, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";

type Axis = "access" | "prevention" | "society" | "evidence";
type SurveyQuestion = { axis: Axis; zh: string; en: string };

const questions: SurveyQuestion[] = [
  { axis: "access", zh: "心理健康服务应当获得与其他公共卫生服务相匹配的财政投入。", en: "Mental-health services should receive funding comparable to other public-health services." },
  { axis: "access", zh: "常见心理健康问题的识别与转诊应更充分地融入基层医疗。", en: "Identification and referral for common mental-health conditions should be more fully integrated into primary care." },
  { axis: "prevention", zh: "学校应当更早开展适龄的心理健康素养与支持项目。", en: "Schools should introduce age-appropriate mental-health literacy and support programmes earlier." },
  { axis: "prevention", zh: "每个国家都应制定可监测、可评估的自杀预防战略。", en: "Every country should maintain a measurable and evaluable suicide-prevention strategy." },
  { axis: "society", zh: "工作场所应承担更多预防心理压力和支持员工福祉的责任。", en: "Workplaces should take greater responsibility for preventing psychological strain and supporting wellbeing." },
  { axis: "society", zh: "降低污名、改善媒体表达与建设社区支持网络同样属于公共政策。", en: "Reducing stigma, improving media communication and building community support networks are public-policy responsibilities." },
  { axis: "evidence", zh: "国家应定期公开心理健康结局、服务覆盖与政策执行指标。", en: "Countries should regularly publish indicators on mental-health outcomes, service coverage and policy implementation." },
  { axis: "evidence", zh: "开放的跨国比较与可视化工具能够促进更有依据的公共讨论。", en: "Open cross-country comparisons and visual tools can support better-informed public discussion." },
];

const surveyCopy = {
  zh: {
    documentTitle: "心理健康政策认知问卷 — SYSU3DAILAB MIND ATLAS",
    kicker: "8项政策优先级问卷",
    titleA: "如果由你分配注意力，",
    titleB: "心理健康政策应优先做什么？",
    intro: "这是一份匿名的政策认知互动问卷。它不询问医学症状，不进行诊断，也不会向服务器提交答案。完成后将生成你的政策关注图谱与模拟资源配置。",
    private: "匿名作答",
    local: "仅保存在当前浏览器",
    noDiagnosis: "不是医学诊断",
    question: "问题",
    of: "/",
    disagree: "非常不同意",
    agree: "非常同意",
    back: "上一题",
    next: "下一题",
    results: "查看结果",
    select: "请选择一个选项",
    progress: "完成进度",
    resultKicker: "你的政策关注图谱",
    resultTitle: "四个方向如何分配优先级",
    resultIntro: "分数表示你对各类政策行动的支持强度，不用于评估个人心理健康状态。",
    access: "服务可及性",
    prevention: "早期预防",
    society: "社会支持",
    evidence: "数据与治理",
    allocation: "模拟100点政策资源配置",
    allocationSub: "系统按照你的回答强度进行比例分配",
    primary: "首要关注方向",
    download: "下载结果",
    restart: "重新作答",
    responseCount: "已回答",
    insightAccess: "你更重视让基层服务、财政投入与专业支持真正可获得。",
    insightPrevention: "你更重视把干预前移到学校、社区与国家预防体系。",
    insightSociety: "你更重视工作场所、社区网络和去污名化的社会环境。",
    insightEvidence: "你更重视公开数据、持续监测和可评估的政策执行。",
    disclaimer: "本问卷用于科研传播与政策讨论，不收集个人身份信息，不构成医学建议。",
    saved: "你的作答进度已在本机保存",
  },
  en: {
    documentTitle: "Mental-health policy perception survey — SYSU3DAILAB MIND ATLAS",
    kicker: "8-ITEM POLICY PRIORITY SURVEY",
    titleA: "If you could direct attention,",
    titleB: "what should mental-health policy prioritise?",
    intro: "This is an anonymous policy-perception survey. It asks no clinical symptom questions, provides no diagnosis and submits no answers to a server. Completion produces a policy-attention profile and simulated resource allocation.",
    private: "Anonymous responses",
    local: "Stored only in this browser",
    noDiagnosis: "Not a medical diagnosis",
    question: "Question",
    of: "/",
    disagree: "Strongly disagree",
    agree: "Strongly agree",
    back: "Previous",
    next: "Next",
    results: "View results",
    select: "Select one response",
    progress: "Progress",
    resultKicker: "YOUR POLICY-ATTENTION PROFILE",
    resultTitle: "How your priorities distribute across four directions",
    resultIntro: "Scores represent support for different policy actions and do not assess personal mental-health status.",
    access: "Service access",
    prevention: "Early prevention",
    society: "Social support",
    evidence: "Data & governance",
    allocation: "Simulated allocation of 100 policy points",
    allocationSub: "Points are distributed in proportion to your response intensity",
    primary: "Leading priority",
    download: "Download results",
    restart: "Start again",
    responseCount: "Answered",
    insightAccess: "You place strongest emphasis on making primary care, funding and professional support genuinely accessible.",
    insightPrevention: "You place strongest emphasis on moving intervention earlier through schools, communities and national prevention systems.",
    insightSociety: "You place strongest emphasis on workplaces, community networks and a less stigmatising social environment.",
    insightEvidence: "You place strongest emphasis on open data, continuous monitoring and evaluable policy implementation.",
    disclaimer: "This survey supports research communication and policy discussion. It collects no identity data and does not constitute medical advice.",
    saved: "Your progress is saved on this device",
  },
};

const axisOrder: Axis[] = ["access", "prevention", "society", "evidence"];
const axisColors: Record<Axis, string> = { access: "#39d5ef", prevention: "#8e75db", society: "#ed718f", evidence: "#f3c66f" };

export default function SurveyPage() {
  const [lang, setLang] = useState<AtlasLanguage>("zh");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const t = surveyCopy[lang];

  useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.documentTitle]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("mind-atlas-policy-survey");
      if (saved) {
        const parsed = JSON.parse(saved) as { answers?: Record<number, number>; step?: number; complete?: boolean };
        if (parsed.answers) setAnswers(parsed.answers);
        if (typeof parsed.step === "number") setStep(Math.min(parsed.step, questions.length - 1));
        if (parsed.complete) setComplete(true);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("mind-atlas-policy-survey", JSON.stringify({ answers, step, complete }));
  }, [answers, complete, hydrated, step]);

  const scores = useMemo(() => Object.fromEntries(axisOrder.map((axis) => {
    const values = questions.map((question, index) => question.axis === axis ? answers[index] : undefined).filter((value): value is number => typeof value === "number");
    const score = values.length ? ((values.reduce((sum, value) => sum + value, 0) / values.length - 1) / 4) * 100 : 0;
    return [axis, Math.round(score)];
  })) as Record<Axis, number>, [answers]);

  const allocation = useMemo(() => {
    const total = axisOrder.reduce((sum, axis) => sum + Math.max(scores[axis], 1), 0);
    const result = Object.fromEntries(axisOrder.map((axis) => [axis, Math.round((Math.max(scores[axis], 1) / total) * 100)])) as Record<Axis, number>;
    const difference = 100 - axisOrder.reduce((sum, axis) => sum + result[axis], 0);
    result[axisOrder.reduce((best, axis) => scores[axis] > scores[best] ? axis : best, axisOrder[0])] += difference;
    return result;
  }, [scores]);

  const leadingAxis = axisOrder.reduce((best, axis) => scores[axis] > scores[best] ? axis : best, axisOrder[0]);
  const answeredCount = Object.keys(answers).length;
  const progress = complete ? 100 : (answeredCount / questions.length) * 100;

  const next = () => {
    if (!answers[step]) return;
    if (step === questions.length - 1) setComplete(true);
    else setStep(step + 1);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setComplete(false);
    window.localStorage.removeItem("mind-atlas-policy-survey");
  };

  const download = () => {
    const payload = {
      instrument: "MIND ATLAS mental-health policy perception survey",
      completed_at: new Date().toISOString(),
      scores,
      simulated_policy_point_allocation: allocation,
      note: t.disclaimer,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mind_atlas_policy_profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell feature-page survey-page">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <AtlasNav lang={lang} active="survey" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />

      <section className="feature-hero survey-hero">
        <span className="feature-kicker"><HeartHandshake size={15} />{t.kicker}</span>
        <h1><span>{t.titleA}</span><span>{t.titleB}</span></h1>
        <p>{t.intro}</p>
        <div className="privacy-strip"><span><ShieldCheck size={14} />{t.private}</span><span><Check size={14} />{t.local}</span><span><Check size={14} />{t.noDiagnosis}</span></div>
      </section>

      <section className="survey-stage feature-width">
        <div className="survey-progress"><div><span>{t.progress}</span><strong>{answeredCount}/{questions.length}</strong></div><i><b style={{ width: `${progress}%` }} /></i><small>{t.saved}</small></div>

        {!complete ? <article className="survey-question-card">
          <div className="question-index"><span>{t.question}</span><strong>{String(step + 1).padStart(2, "0")}</strong><small>{t.of}{questions.length}</small></div>
          <div className="question-content">
            <span className="question-axis" style={{ color: axisColors[questions[step].axis] }}>{t[questions[step].axis]}</span>
            <h2>{questions[step][lang]}</h2>
            <div className="likert-scale" role="radiogroup" aria-label={t.select}>
              {[1, 2, 3, 4, 5].map((value) => <button key={value} role="radio" aria-checked={answers[step] === value} className={answers[step] === value ? "selected" : ""} onClick={() => setAnswers({ ...answers, [step]: value })}><span>{value}</span><i /></button>)}
            </div>
            <div className="likert-labels"><span>{t.disagree}</span><span>{t.agree}</span></div>
            <div className="question-actions">
              <button className="button-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={16} />{t.back}</button>
              <button className="button-primary" onClick={next} disabled={!answers[step]}>{step === questions.length - 1 ? t.results : t.next}<ArrowRight size={16} /></button>
            </div>
          </div>
        </article> : <article className="survey-results">
          <div className="result-heading"><span className="feature-kicker"><Sparkles size={15} />{t.resultKicker}</span><h2>{t.resultTitle}</h2><p>{t.resultIntro}</p></div>
          <div className="score-orbits">{axisOrder.map((axis) => <div key={axis} className="score-orbit-card"><div className="score-orbit" style={{ "--score": `${scores[axis] * 3.6}deg`, "--orbit-color": axisColors[axis] } as React.CSSProperties}><span>{scores[axis]}</span><small>/100</small></div><strong>{t[axis]}</strong></div>)}</div>
          <div className="result-lower">
            <div className="priority-insight"><span>{t.primary}</span><h3 style={{ color: axisColors[leadingAxis] }}>{t[leadingAxis]}</h3><p>{t[`insight${leadingAxis.charAt(0).toUpperCase()}${leadingAxis.slice(1)}` as keyof typeof t]}</p></div>
            <div className="allocation-card"><div><span>{t.allocation}</span><small>{t.allocationSub}</small></div><div className="allocation-bars">{axisOrder.map((axis) => <div key={axis}><span>{t[axis]}</span><i><b style={{ width: `${allocation[axis]}%`, background: axisColors[axis] }} /></i><strong>{allocation[axis]}</strong></div>)}</div></div>
          </div>
          <div className="result-actions"><button className="button-primary" onClick={download}><Download size={16} />{t.download}</button><button className="button-secondary" onClick={restart}><RefreshCw size={16} />{t.restart}</button></div>
        </article>}
      </section>

      <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.disclaimer}</p><span>POLICY SURVEY / v0.2</span></footer>
    </main>
  );
}
