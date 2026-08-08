"use client";

import { useEffect, useMemo, useState } from "react";
import countries from "i18n-iso-countries";
import enCountries from "i18n-iso-countries/langs/en.json";
import zhCountries from "i18n-iso-countries/langs/zh.json";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Database, HeartPulse, Info, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import AtlasNav, { type AtlasLanguage } from "./atlas-nav";
import { backendConfigured, researchConfig, studyConfigured, submitResearchResponse, type ResearchSubmission } from "../src/research-backend";

countries.registerLocale(enCountries);
countries.registerLocale(zhCountries);

type ResearchForm = {
  age_group: string;
  gender: string;
  country_code: string;
  residence_type: string;
  education: string;
  employment: string;
  household_size: string;
  income_ladder: string;
  financial_strain: string;
  housing_status: string;
  housing_insecurity: string;
  job_insecurity: string;
  healthcare_barrier: string;
  chronic_condition: string;
  disability: string;
  caregiving_hours: string;
  social_support: string;
  loneliness: string;
  discrimination: string;
  major_life_events: string;
  sleep_hours: string;
  gad7: number[];
  who5: number[];
  functional_difficulty: string;
};

const emptyForm: ResearchForm = {
  age_group: "", gender: "", country_code: "", residence_type: "", education: "", employment: "",
  household_size: "", income_ladder: "", financial_strain: "", housing_status: "", housing_insecurity: "",
  job_insecurity: "", healthcare_barrier: "", chronic_condition: "", disability: "", caregiving_hours: "",
  social_support: "", loneliness: "", discrimination: "", major_life_events: "", sleep_hours: "",
  gad7: Array(7).fill(-1), who5: Array(5).fill(-1), functional_difficulty: "",
};

const gadItems = {
  zh: ["感到紧张、焦虑或急切", "不能够停止或控制担忧", "对各种各样的事情担忧过多", "很难放松下来", "由于不安而无法静坐", "变得容易烦恼或急躁", "感到似乎将有可怕的事情发生"],
  en: ["Feeling nervous, anxious or on edge", "Not being able to stop or control worrying", "Worrying too much about different things", "Trouble relaxing", "Being so restless that it is hard to sit still", "Becoming easily annoyed or irritable", "Feeling afraid as if something awful might happen"],
};

const whoItems = {
  zh: ["我感到心情愉快", "我感到平静和放松", "我感到充满活力", "我醒来时感到清醒并得到充分休息", "我的日常生活中充满了我感兴趣的事情"],
  en: ["I have felt cheerful and in good spirits", "I have felt calm and relaxed", "I have felt active and vigorous", "I woke up feeling fresh and rested", "My daily life has been filled with things that interest me"],
};

const text = {
  zh: {
    documentTitle: "个体心理健康与社会经济因素研究 — SYSU3DAILAB MIND ATLAS",
    kicker: "18岁及以上人群研究问卷",
    titleA: "个体心理健康",
    titleB: "与社会经济环境研究",
    intro: "本研究旨在分析焦虑症状、心理幸福感与个人社会经济处境之间的关联。预计用时8—10分钟。问卷不收集姓名、身份证号、手机号或精确住址。",
    consentTitle: "参与者信息与电子知情同意",
    consentIntro: "请在开始前阅读以下信息。参与完全自愿，你可以跳过非必答题或随时退出；退出前不会提交任何数据。",
    purpose: "研究目的",
    purposeText: "了解成年人的心理健康状况与教育、就业、经济压力、住房、医疗可及性和社会支持等因素之间的统计关联。",
    dataUse: "收集与使用",
    dataUseText: "回答将以随机编号保存，用于学术研究、统计分析及研究成果发表。研究结果只以汇总形式呈现。",
    risk: "可能风险",
    riskText: "部分问题涉及焦虑体验和生活压力，可能引起轻微不适。你可以停止作答；如感到持续困扰，请联系当地专业心理健康服务。",
    contact: "研究联系",
    ethics: "伦理审查编号",
    pending: "正式收集前补充",
    c1: "我确认已年满18周岁。",
    c2: "我已阅读并理解参与者信息。",
    c3: "我理解问卷涉及敏感健康及社会经济信息，并同意按上述目的处理这些数据。",
    c4: "我自愿参加，并知道可以在提交前随时退出。",
    start: "同意并开始问卷",
    noDiagnosis: "本问卷用于研究，不提供医学诊断。",
    profile: "基本特征",
    economic: "社会经济状况",
    social: "社会与生活环境",
    anxiety: "过去两周的焦虑体验",
    wellbeing: "过去两周的心理幸福感",
    review: "检查并提交",
    section: "部分",
    required: "必答",
    optional: "选答",
    choose: "请选择",
    back: "返回",
    next: "继续",
    age: "年龄组",
    gender: "性别",
    country: "目前主要居住国家或地区",
    residence: "居住地类型",
    education: "最高教育程度",
    employment: "当前就业状态",
    household: "包括你在内的家庭常住人数",
    income: "如果把本国所有家庭按收入从低到高分为10级，你认为自己的家庭处于第几级？",
    strain: "过去12个月，日常开支给你造成的经济压力",
    housing: "当前住房状况",
    housingRisk: "过去12个月，你担心失去住所或无法支付住房费用的频率",
    jobRisk: "未来6个月失去工作或主要收入来源的担忧程度",
    healthcare: "需要医疗或心理服务时，费用、距离或等待时间造成的困难",
    chronic: "是否有持续6个月以上的慢性健康问题",
    disability: "是否存在影响日常活动的残障或长期功能限制",
    caregiving: "每周无偿照护儿童、老人或患病家人的时间",
    support: "遇到困难时，你能够获得实际或情感支持的程度",
    loneliness: "过去两周感到孤独的频率",
    discrimination: "过去12个月因身份、背景或经济状况受到不公平对待的频率",
    events: "过去12个月经历的重大负性生活事件数量",
    sleep: "通常每晚睡眠时间（小时）",
    gadPrompt: "在过去两周，你受到以下问题困扰的频率是？",
    whoPrompt: "在过去两周，下列表述与你的情况相符的频率是？",
    function: "这些问题对工作、学习、家庭生活或与他人相处造成困难的程度",
    missing: "请完成本部分所有必答题。",
    reviewIntro: "提交后将无法在线修改。研究团队只能通过随机编号识别记录，无法根据问卷联系到你。",
    consentRecord: "电子同意已记录",
    measures: "量表完成情况",
    socioeconomic: "社会经济变量",
    ready: "数据库和研究信息已配置，可以安全提交。",
    notReady: "当前为研究预测试界面。数据库、研究联系人或伦理审查编号尚未配置，因此提交功能已锁定。",
    submit: "匿名提交问卷",
    submitting: "正在安全提交…",
    submitError: "提交未成功，请稍后重试。页面关闭前你的回答仍保留在当前页面。",
    completeTitle: "感谢你的参与",
    completeText: "回答已匿名保存。以下分数仅帮助你了解本次作答，不构成诊断，也不会替代专业评估。",
    gadScore: "GAD-7焦虑症状得分",
    whoScore: "WHO-5心理幸福感得分",
    supportText: "如果这些问题使你感到明显不适，或你正在经历持续的心理困扰，请联系所在地的医生、心理健康专业人员或可信赖的支持服务。紧急情况下请联系当地急救服务。",
    returnAtlas: "返回全球观测台",
    admin: "研究数据后台",
    scale0: ["完全没有", "有几天", "一半以上时间", "几乎每天"],
    scale5: ["从未", "偶尔", "少于一半时间", "多于一半时间", "大部分时间", "一直"],
    lowHigh: ["完全没有", "非常严重"],
  },
  en: {
    documentTitle: "Individual mental health and socioeconomic study — SYSU3DAILAB MIND ATLAS",
    kicker: "RESEARCH SURVEY FOR ADULTS AGED 18+",
    titleA: "Individual mental health",
    titleB: "and socioeconomic environments",
    intro: "This study examines associations between anxiety symptoms, mental wellbeing and individual socioeconomic circumstances. It takes approximately 8–10 minutes. No names, identity numbers, phone numbers or precise addresses are collected.",
    consentTitle: "Participant information and electronic consent",
    consentIntro: "Please read this information before starting. Participation is voluntary. You may skip optional questions or leave at any time; no data are submitted before the final step.",
    purpose: "Purpose",
    purposeText: "To examine statistical associations between adult mental health and education, employment, financial strain, housing, healthcare access and social support.",
    dataUse: "Data collection and use",
    dataUseText: "Responses are stored under a random identifier for academic research, statistical analysis and research publication. Findings are reported only in aggregate.",
    risk: "Possible discomfort",
    riskText: "Questions about anxiety and life stress may cause mild discomfort. You may stop at any time. If distress persists, contact an appropriate local mental-health professional.",
    contact: "Research contact",
    ethics: "Ethics review reference",
    pending: "Required before data collection",
    c1: "I confirm that I am aged 18 years or older.",
    c2: "I have read and understood the participant information.",
    c3: "I understand that the survey concerns sensitive health and socioeconomic information and consent to its processing for the stated purposes.",
    c4: "I participate voluntarily and understand that I may leave before submission.",
    start: "Consent and begin",
    noDiagnosis: "This survey is for research and does not provide a medical diagnosis.",
    profile: "Personal profile",
    economic: "Socioeconomic circumstances",
    social: "Social and living environment",
    anxiety: "Anxiety experiences in the past two weeks",
    wellbeing: "Mental wellbeing in the past two weeks",
    review: "Review and submit",
    section: "Section",
    required: "Required",
    optional: "Optional",
    choose: "Select an answer",
    back: "Back",
    next: "Continue",
    age: "Age group",
    gender: "Gender",
    country: "Current main country or territory of residence",
    residence: "Type of residential area",
    education: "Highest level of education",
    employment: "Current employment status",
    household: "Number of usual household members, including you",
    income: "If households in your country were placed on a 10-step income ladder, where would your household stand?",
    strain: "Financial strain from everyday expenses during the past 12 months",
    housing: "Current housing situation",
    housingRisk: "During the past 12 months, how often did you worry about losing your home or being unable to meet housing costs?",
    jobRisk: "Concern about losing your job or main income source in the next six months",
    healthcare: "Difficulty obtaining needed health or mental-health care because of cost, distance or waiting time",
    chronic: "Do you have a health condition lasting six months or more?",
    disability: "Do you have a disability or long-term limitation affecting daily activities?",
    caregiving: "Hours per week of unpaid care for children, older people or ill family members",
    support: "Practical or emotional support available when you face difficulty",
    loneliness: "Frequency of loneliness during the past two weeks",
    discrimination: "Frequency of unfair treatment because of identity, background or economic position during the past 12 months",
    events: "Number of major negative life events during the past 12 months",
    sleep: "Usual sleep per night in hours",
    gadPrompt: "Over the last two weeks, how often have you been bothered by the following problems?",
    whoPrompt: "Over the last two weeks, how often have the following statements applied to you?",
    function: "How difficult have these problems made work, study, home life or getting along with other people?",
    missing: "Complete all required questions in this section.",
    reviewIntro: "Responses cannot be changed online after submission. The research team sees only a random record identifier and cannot contact you from the questionnaire.",
    consentRecord: "Electronic consent recorded",
    measures: "Measure completion",
    socioeconomic: "Socioeconomic variables",
    ready: "The database and study information are configured for secure submission.",
    notReady: "This is currently a research pilot interface. Submission is locked until the database, research contact and ethics reference are configured.",
    submit: "Submit anonymously",
    submitting: "Submitting securely…",
    submitError: "Submission failed. Please try again later. Your answers remain on this page until it is closed.",
    completeTitle: "Thank you for participating",
    completeText: "Your response has been stored anonymously. These scores describe this response only, are not a diagnosis and do not replace professional assessment.",
    gadScore: "GAD-7 anxiety symptom score",
    whoScore: "WHO-5 mental wellbeing score",
    supportText: "If these questions caused significant discomfort, or you are experiencing persistent distress, contact a local doctor, mental-health professional or trusted support service. In an emergency, contact local emergency services.",
    returnAtlas: "Return to global atlas",
    admin: "Research data dashboard",
    scale0: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    scale5: ["At no time", "Some of the time", "Less than half", "More than half", "Most of the time", "All of the time"],
    lowHigh: ["Not at all", "Extremely"],
  },
};

const options = {
  age_group: [["18-24", "18–24"], ["25-34", "25–34"], ["35-44", "35–44"], ["45-54", "45–54"], ["55-64", "55–64"], ["65+", "65+"]],
  gender: [["woman", "女性", "Woman"], ["man", "男性", "Man"], ["nonbinary", "非二元性别", "Non-binary"], ["self_describe", "其他或自我描述", "Other / self-describe"], ["prefer_not", "不愿回答", "Prefer not to answer"]],
  residence_type: [["urban", "城市中心", "Urban centre"], ["suburban", "郊区或城镇", "Suburban area or town"], ["rural", "农村地区", "Rural area"]],
  education: [["below_secondary", "初中及以下", "Lower secondary or below"], ["upper_secondary", "高中、中专或职业教育", "Upper secondary or vocational"], ["bachelor", "本科或同等学历", "Bachelor or equivalent"], ["postgraduate", "研究生学历", "Postgraduate"]],
  employment: [["full_time", "全职工作", "Employed full-time"], ["part_time", "兼职工作", "Employed part-time"], ["self_employed", "个体经营或自由职业", "Self-employed"], ["student", "学生", "Student"], ["unemployed", "无业或正在求职", "Unemployed / seeking work"], ["caregiver", "无偿照护或家务", "Unpaid care / home duties"], ["retired", "退休", "Retired"], ["other", "其他", "Other"]],
  housing_status: [["owner", "自有住房", "Owner-occupied"], ["rent", "租住", "Rented"], ["family", "与家人居住且无需支付房租", "Living with family without rent"], ["temporary", "临时或不稳定住所", "Temporary or unstable housing"], ["other", "其他", "Other"]],
  yes_no: [["yes", "是", "Yes"], ["no", "否", "No"], ["prefer_not", "不愿回答", "Prefer not to answer"]],
  caregiving_hours: [["0", "0小时", "0 hours"], ["1-9", "1–9小时", "1–9 hours"], ["10-19", "10–19小时", "10–19 hours"], ["20+", "20小时及以上", "20 hours or more"]],
  major_life_events: [["0", "0项", "None"], ["1", "1项", "One"], ["2", "2项", "Two"], ["3+", "3项及以上", "Three or more"]],
};

function selectOptions(items: string[][], lang: AtlasLanguage) {
  return items.map((item) => ({ value: item[0], label: item.length === 2 ? item[1] : item[lang === "zh" ? 1 : 2] }));
}

function ResearchSelect({ label, value, items, lang, onChange }: { label: string; value: string; items: Array<{ value: string; label: string }>; lang: AtlasLanguage; onChange: (value: string) => void }) {
  return <label className="research-field"><span>{label}<b>*</b></span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{text[lang].choose}</option>{items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}

function FivePoint({ label, value, lang, onChange }: { label: string; value: string; lang: AtlasLanguage; onChange: (value: string) => void }) {
  return <div className="research-scale"><span>{label}<b>*</b></span><div>{[1, 2, 3, 4, 5].map((item) => <button key={item} className={value === String(item) ? "selected" : ""} onClick={() => onChange(String(item))}>{item}</button>)}</div><small><i>{text[lang].lowHigh[0]}</i><i>{text[lang].lowHigh[1]}</i></small></div>;
}

function InstrumentRows({ items, answers, labels, onChange }: { items: string[]; answers: number[]; labels: string[]; onChange: (index: number, value: number) => void }) {
  return <div className="instrument-list">{items.map((item, index) => <div className="instrument-row" key={item}><span><i>{String(index + 1).padStart(2, "0")}</i>{item}</span><div>{labels.map((label, value) => <button key={label} title={label} aria-label={`${item}: ${label}`} className={answers[index] === value ? "selected" : ""} onClick={() => onChange(index, value)}><b>{value}</b><small>{label}</small></button>)}</div></div>)}</div>;
}

export default function SurveyPage() {
  const [lang, setLang] = useState<AtlasLanguage>("zh");
  const [consents, setConsents] = useState([false, false, false, false]);
  const [consentedAt, setConsentedAt] = useState("");
  const [stage, setStage] = useState<"consent" | "form" | "complete">("consent");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ResearchForm>(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [participantUuid] = useState(() => crypto.randomUUID());
  const t = text[lang];
  const steps = [t.profile, t.economic, t.social, t.anxiety, t.wellbeing, t.review];
  const gadScore = form.gad7.filter((value) => value >= 0).reduce((sum, value) => sum + value, 0);
  const whoScore = form.who5.filter((value) => value >= 0).reduce((sum, value) => sum + value, 0) * 4;

  useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang, t.documentTitle]);

  const countryOptions = useMemo(() => Object.entries(countries.getNames(lang, { select: "official" })).flatMap(([alpha2, name]) => {
    const alpha3 = countries.alpha2ToAlpha3(alpha2);
    return alpha3 ? [{ value: alpha3, label: name }] : [];
  }).sort((a, b) => a.label.localeCompare(b.label, lang === "zh" ? "zh-CN" : "en")), [lang]);

  const setField = <K extends keyof ResearchForm>(key: K, value: ResearchForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const stepValid = () => {
    if (step === 0) return [form.age_group, form.gender, form.country_code, form.residence_type, form.education, form.employment].every(Boolean);
    if (step === 1) return [form.household_size, form.income_ladder, form.financial_strain, form.housing_status, form.housing_insecurity, form.healthcare_barrier, form.chronic_condition, form.disability].every(Boolean);
    if (step === 2) return [form.caregiving_hours, form.social_support, form.loneliness, form.discrimination, form.major_life_events].every(Boolean);
    if (step === 3) return form.gad7.every((value) => value >= 0) && Boolean(form.functional_difficulty);
    if (step === 4) return form.who5.every((value) => value >= 0);
    return true;
  };

  const moveNext = () => {
    if (!stepValid()) { setError(t.missing); return; }
    setError("");
    setStep(Math.min(5, step + 1));
    window.scrollTo({ top: 260, behavior: "smooth" });
  };

  const submit = async () => {
    if (!backendConfigured || !studyConfigured) return;
    setSubmitting(true);
    setError("");
    const payload: ResearchSubmission = {
      participant_uuid: participantUuid,
      survey_version: "individual-ses-v1.0",
      consent_version: "electronic-consent-v1.0",
      consented_at: consentedAt,
      language: lang,
      recruitment_source: new URLSearchParams(window.location.search).get("source"),
      age_group: form.age_group,
      gender: form.gender,
      country_code: form.country_code,
      residence_type: form.residence_type,
      education: form.education,
      employment: form.employment,
      household_size: Number(form.household_size),
      income_ladder: Number(form.income_ladder),
      financial_strain: Number(form.financial_strain),
      housing_status: form.housing_status,
      housing_insecurity: Number(form.housing_insecurity),
      job_insecurity: form.job_insecurity ? Number(form.job_insecurity) : null,
      healthcare_barrier: Number(form.healthcare_barrier),
      chronic_condition: form.chronic_condition,
      disability: form.disability,
      caregiving_hours: form.caregiving_hours,
      social_support: Number(form.social_support),
      loneliness: Number(form.loneliness),
      discrimination: Number(form.discrimination),
      major_life_events: form.major_life_events,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      gad7_answers: form.gad7,
      gad7_score: gadScore,
      who5_answers: form.who5,
      who5_score: whoScore,
      functional_difficulty: Number(form.functional_difficulty),
      completion_seconds: Math.min(86400, Math.max(0, Math.round((Date.now() - new Date(consentedAt).getTime()) / 1000))),
    };
    try {
      await submitResearchResponse(payload);
      setStage("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 0) return <div className="research-grid">
      <ResearchSelect label={t.age} value={form.age_group} items={selectOptions(options.age_group, lang)} lang={lang} onChange={(value) => setField("age_group", value)} />
      <ResearchSelect label={t.gender} value={form.gender} items={selectOptions(options.gender, lang)} lang={lang} onChange={(value) => setField("gender", value)} />
      <ResearchSelect label={t.country} value={form.country_code} items={countryOptions} lang={lang} onChange={(value) => setField("country_code", value)} />
      <ResearchSelect label={t.residence} value={form.residence_type} items={selectOptions(options.residence_type, lang)} lang={lang} onChange={(value) => setField("residence_type", value)} />
      <ResearchSelect label={t.education} value={form.education} items={selectOptions(options.education, lang)} lang={lang} onChange={(value) => setField("education", value)} />
      <ResearchSelect label={t.employment} value={form.employment} items={selectOptions(options.employment, lang)} lang={lang} onChange={(value) => setField("employment", value)} />
    </div>;
    if (step === 1) return <div className="research-grid research-grid-scales">
      <label className="research-field"><span>{t.household}<b>*</b></span><input type="number" min="1" max="20" value={form.household_size} onChange={(event) => setField("household_size", event.target.value)} /></label>
      <label className="research-field"><span>{t.income}<b>*</b></span><input type="range" min="1" max="10" value={form.income_ladder || "5"} onChange={(event) => setField("income_ladder", event.target.value)} /><strong>{form.income_ladder || "—"} / 10</strong></label>
      <FivePoint label={t.strain} value={form.financial_strain} lang={lang} onChange={(value) => setField("financial_strain", value)} />
      <ResearchSelect label={t.housing} value={form.housing_status} items={selectOptions(options.housing_status, lang)} lang={lang} onChange={(value) => setField("housing_status", value)} />
      <FivePoint label={t.housingRisk} value={form.housing_insecurity} lang={lang} onChange={(value) => setField("housing_insecurity", value)} />
      <FivePoint label={t.jobRisk} value={form.job_insecurity} lang={lang} onChange={(value) => setField("job_insecurity", value)} />
      <FivePoint label={t.healthcare} value={form.healthcare_barrier} lang={lang} onChange={(value) => setField("healthcare_barrier", value)} />
      <ResearchSelect label={t.chronic} value={form.chronic_condition} items={selectOptions(options.yes_no, lang)} lang={lang} onChange={(value) => setField("chronic_condition", value)} />
      <ResearchSelect label={t.disability} value={form.disability} items={selectOptions(options.yes_no, lang)} lang={lang} onChange={(value) => setField("disability", value)} />
    </div>;
    if (step === 2) return <div className="research-grid research-grid-scales">
      <ResearchSelect label={t.caregiving} value={form.caregiving_hours} items={selectOptions(options.caregiving_hours, lang)} lang={lang} onChange={(value) => setField("caregiving_hours", value)} />
      <FivePoint label={t.support} value={form.social_support} lang={lang} onChange={(value) => setField("social_support", value)} />
      <FivePoint label={t.loneliness} value={form.loneliness} lang={lang} onChange={(value) => setField("loneliness", value)} />
      <FivePoint label={t.discrimination} value={form.discrimination} lang={lang} onChange={(value) => setField("discrimination", value)} />
      <ResearchSelect label={t.events} value={form.major_life_events} items={selectOptions(options.major_life_events, lang)} lang={lang} onChange={(value) => setField("major_life_events", value)} />
      <label className="research-field"><span>{t.sleep}<i>{t.optional}</i></span><input type="number" min="0" max="16" step="0.5" value={form.sleep_hours} onChange={(event) => setField("sleep_hours", event.target.value)} /></label>
    </div>;
    if (step === 3) return <><p className="instrument-prompt">{t.gadPrompt}</p><InstrumentRows items={gadItems[lang]} answers={form.gad7} labels={t.scale0} onChange={(index, value) => setField("gad7", form.gad7.map((item, itemIndex) => itemIndex === index ? value : item))} /><div className="function-question"><span>{t.function}<b>*</b></span><div>{t.scale0.map((label, value) => <button key={label} className={form.functional_difficulty === String(value) ? "selected" : ""} onClick={() => setField("functional_difficulty", String(value))}>{label}</button>)}</div></div></>;
    if (step === 4) return <><p className="instrument-prompt">{t.whoPrompt}</p><InstrumentRows items={whoItems[lang]} answers={form.who5} labels={t.scale5} onChange={(index, value) => setField("who5", form.who5.map((item, itemIndex) => itemIndex === index ? value : item))} /></>;
    return <div className="research-review">
      <p>{t.reviewIntro}</p>
      <div className="review-cards"><article><Check size={16} /><span>{t.consentRecord}</span><strong>{consentedAt ? new Date(consentedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en") : "—"}</strong></article><article><ClipboardCheck size={16} /><span>{t.measures}</span><strong>GAD-7 · WHO-5</strong></article><article><Database size={16} /><span>{t.socioeconomic}</span><strong>20</strong></article></div>
      <div className={`collection-state ${backendConfigured && studyConfigured ? "ready" : "locked"}`}>{backendConfigured && studyConfigured ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}<span>{backendConfigured && studyConfigured ? t.ready : t.notReady}</span></div>
      <button className="research-submit" disabled={!backendConfigured || !studyConfigured || submitting} onClick={submit}>{submitting ? <HeartPulse size={18} /> : <Send size={18} />}{submitting ? t.submitting : t.submit}</button>
    </div>;
  };

  return <main className="app-shell feature-page survey-page research-survey">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <AtlasNav lang={lang} active="survey" onLanguage={() => setLang(lang === "zh" ? "en" : "zh")} />
    {stage === "complete" ? <section className="research-complete feature-width"><div className="complete-mark"><Check size={30} /></div><span className="feature-kicker">SYSU3DAILAB // MIND ATLAS</span><h1>{t.completeTitle}</h1><p>{t.completeText}</p><div className="participant-scores"><article><span>{t.gadScore}</span><strong>{gadScore}<small>/21</small></strong></article><article><span>{t.whoScore}</span><strong>{whoScore}<small>/100</small></strong></article></div><div className="support-note"><Info size={17} /><p>{t.supportText}</p></div><div className="complete-actions"><a className="button-primary" href="#/">{t.returnAtlas}</a></div></section> : <>
      <section className="feature-hero survey-hero"><span className="feature-kicker"><HeartPulse size={15} />{t.kicker}</span><h1><span>{t.titleA}</span><span>{t.titleB}</span></h1><p>{t.intro}</p><div className="privacy-strip"><span><ShieldCheck size={14} />18+</span><span><LockKeyhole size={14} />{t.noDiagnosis}</span><span><Database size={14} />{backendConfigured ? "DATABASE CONNECTED" : "PILOT MODE"}</span></div></section>
      {stage === "consent" ? <section className="consent-panel feature-width"><div className="consent-heading"><span>00 / CONSENT</span><h2>{t.consentTitle}</h2><p>{t.consentIntro}</p></div><div className="consent-information"><article><strong>{t.purpose}</strong><p>{t.purposeText}</p></article><article><strong>{t.dataUse}</strong><p>{t.dataUseText}</p></article><article><strong>{t.risk}</strong><p>{t.riskText}</p></article><article className="study-identity"><div><span>{t.contact}</span><strong>{researchConfig.studyContact || t.pending}</strong></div><div><span>{t.ethics}</span><strong>{researchConfig.ethicsId || t.pending}</strong></div></article></div><div className="consent-checks">{[t.c1, t.c2, t.c3, t.c4].map((label, index) => <label key={label}><input type="checkbox" checked={consents[index]} onChange={() => setConsents(consents.map((value, itemIndex) => itemIndex === index ? !value : value))} /><i>{consents[index] && <Check size={13} />}</i><span>{label}</span></label>)}</div><button className="consent-start" disabled={!consents.every(Boolean)} onClick={() => { setConsentedAt(new Date().toISOString()); setStage("form"); }}>{t.start}<ArrowRight size={17} /></button></section> : <section className="research-form feature-width"><aside><span>{t.section} {step + 1}/6</span><div className="research-progress"><i style={{ height: `${((step + 1) / 6) * 100}%` }} /></div><nav>{steps.map((label, index) => <button key={label} className={step === index ? "active" : step > index ? "done" : ""} onClick={() => { if (index < step) setStep(index); }}><i>{step > index ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</i><span>{label}</span></button>)}</nav></aside><article><header><span>{String(step + 1).padStart(2, "0")}</span><h2>{steps[step]}</h2><small>{step === 2 || step === 1 ? `${t.required} + ${t.optional}` : t.required}</small></header><div className="research-form-body">{renderStep()}{error && <div className="research-error"><Info size={15} />{error}</div>}</div>{step < 5 && <footer><button className="form-back" disabled={step === 0} onClick={() => { setError(""); setStep(Math.max(0, step - 1)); }}><ArrowLeft size={16} />{t.back}</button><button className="form-next" onClick={moveNext}>{t.next}<ArrowRight size={16} /></button></footer>}</article></section>}
    </>}
    <footer className="feature-footer"><span>SYSU3DAILAB // MIND ATLAS</span><p>{t.noDiagnosis}</p><a href="#/admin">{t.admin}</a></footer>
  </main>;
}
