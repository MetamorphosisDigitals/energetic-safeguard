/**
 * Design: Soft Sovereignty — an editorial apothecary interface for choice-led support.
 * Warm paper, a rose compass, generous readable spacing, and one clear next step per view.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Flower2,
  HeartHandshake,
  Home as HomeIcon,
  Leaf,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  SunMedium,
  X,
} from "lucide-react";
import type { FlowCategory, Location, PracticeStyle } from "@/data/practices";
import { recommendPractice, recommendationReason, type PracticeQuery } from "@/lib/recommendPractice";

type View = "home" | "intake" | "recommendation" | "practice" | "complete" | "safety" | "settings";
type Pathway = { id: FlowCategory; title: string; description: string; label: string; icon: typeof SunMedium; tint: string; asset?: string };

const ASSETS = {
  logo: "/manus-storage/energetic-safeguard-mark_101130ee.png",
  roseField: "/manus-storage/quiet-rose-field_ce3f4800.jpg",
  boundary: "/manus-storage/golden-boundary-card_f0d9b21d.jpg",
  arrival: "/manus-storage/emerald-arrival-card_e70e9110.jpg",
};

const pathways: Pathway[] = [
  { id: "morning", title: "Morning Check-In", description: "Begin the day with a more honest sense of your energy and capacity.", label: "START YOUR DAY", icon: SunMedium, tint: "rose", asset: ASSETS.arrival },
  { id: "protect", title: "Protect Before an Interaction", description: "Prepare for a conversation or space that may ask a lot of you.", label: "BEFORE YOU MEET", icon: ShieldCheck, tint: "plum", asset: ASSETS.boundary },
  { id: "reset", title: "Ground & Reset", description: "Find one gentle way to return to yourself right where you are.", label: "FOR RIGHT NOW", icon: Compass, tint: "lavender" },
  { id: "hygiene", title: "Improve My Energy Hygiene", description: "Choose one small practice to carry with you for the next seven days.", label: "FOR A PATTERN", icon: Leaf, tint: "green" },
  { id: "prepare", title: "Prepare for a Stressful Situation", description: "Gather your attention before something difficult, uncertain, or visible.", label: "BEFORE A MOMENT", icon: HeartHandshake, tint: "gold" },
];

const prompts: Record<FlowCategory, { question: string; options: string[] }> = {
  morning: { question: "How does your energy feel as you begin?", options: ["Scattered or foggy", "Low or depleted", "Steady, but protective", "Already carrying a lot"] },
  protect: { question: "What kind of interaction are you preparing for?", options: ["A work meeting", "A difficult conversation", "Family or caregiving", "A crowded or demanding space"] },
  reset: { question: "What is asking for support right now?", options: ["I feel overstimulated", "I feel emotionally full", "I feel scattered", "I feel low on energy"] },
  hygiene: { question: "What pattern would you like to meet differently?", options: ["I overextend myself", "I carry other people’s feelings", "I struggle to transition", "I forget to check my capacity"] },
  prepare: { question: "What are you preparing for?", options: ["A difficult conversation", "Speaking or presenting", "An appointment or interview", "A family gathering"] },
  emergency: { question: "What support feels most available?", options: ["A quiet reset", "Eyes-open grounding", "A little more space", "One small next step"] },
};

const styleOptions: { id: PracticeStyle | "either" | "choose"; label: string; note: string }[] = [
  { id: "practical", label: "Practical & Grounded", note: "Sensory and boundary-led" },
  { id: "rose", label: "Rose Ray Support", note: "Optional symbolic imagery" },
  { id: "rose-crystal", label: "Rose + Crystal Support", note: "Crystals always optional" },
  { id: "either", label: "Either is fine", note: "Practical or spiritual" },
  { id: "choose", label: "Choose for me", note: "One fit for this moment" },
];

const adjustmentOptions = [
  ["avoid-breath", "Avoid breath-focused practices"],
  ["avoid-visualization", "Avoid visualization"],
  ["minimal-movement", "Keep movement minimal"],
  ["keep-eyes-open", "Keep eyes open"],
  ["discreet", "Keep this discreet"],
] as const;

const makeDefaultQuery = (pathway: FlowCategory, style: PracticeQuery["style"]): PracticeQuery => ({
  pathway,
  situation: "",
  intensity: 5,
  energy: "steady",
  availableMinutes: 3,
  location: "anywhere",
  style,
  adjustments: [],
});

function RoseMark({ compact = false }: { compact?: boolean }) {
  return <img src={ASSETS.logo} className={compact ? "rose-mark rose-mark--compact" : "rose-mark"} alt="The Energetic Safeguard rose compass" />;
}

function AppHeader({ onHome, onSettings }: { onHome: () => void; onSettings: () => void }) {
  return (
    <header className="app-header">
      <button className="wordmark" onClick={onHome} aria-label="Return to home">
        <RoseMark compact />
        <span><b>Energetic</b> Safeguard</span>
      </button>
      <button className="icon-button" onClick={onSettings} aria-label="Open settings"><Settings2 size={20} /></button>
    </header>
  );
}

function IntakeProgress({ step }: { step: number }) {
  return <div className="progress-dots" aria-label={`Question ${step + 1} of 3`}><i className={step >= 0 ? "active" : ""} /><i className={step >= 1 ? "active" : ""} /><i className={step >= 2 ? "active" : ""} /></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [pathway, setPathway] = useState<FlowCategory>("morning");
  const [intakeStep, setIntakeStep] = useState(0);
  const [query, setQuery] = useState<PracticeQuery>(() => makeDefaultQuery("morning", "choose"));
  const [settingsStyle, setSettingsStyle] = useState<PracticeQuery["style"]>("choose");
  const [activeStep, setActiveStep] = useState(0);
  const [shortVersion, setShortVersion] = useState(false);
  const [commitment, setCommitment] = useState(false);
  const [textSize, setTextSize] = useState("standard");
  const [reducedMotion, setReducedMotion] = useState(false);

  const recommendation = useMemo(() => recommendPractice(query), [query]);
  const visibleSteps = shortVersion ? recommendation.shortVersion : recommendation.steps;

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full";
  }, [reducedMotion, textSize]);

  function beginPathway(nextPathway: FlowCategory) {
    setPathway(nextPathway);
    setQuery(makeDefaultQuery(nextPathway, settingsStyle));
    setIntakeStep(0);
    setView("intake");
  }

  function updateQuery<K extends keyof PracticeQuery>(key: K, value: PracticeQuery[K]) {
    setQuery((current) => ({ ...current, [key]: value }));
  }

  function toggleAdjustment(id: string) {
    setQuery((current) => ({ ...current, adjustments: current.adjustments.includes(id) ? current.adjustments.filter((item) => item !== id) : [...current.adjustments, id] }));
  }

  function safetyCheck(value: string) {
    if (/danger|hurt myself|harm myself|unsafe|suicide|attack/i.test(value)) {
      setView("safety");
      return true;
    }
    return false;
  }

  function advanceIntake() {
    if (intakeStep === 0 && safetyCheck(query.situation)) return;
    if (intakeStep < 2) setIntakeStep((step) => step + 1);
    else setView("recommendation");
  }

  function startPractice() {
    setShortVersion(false);
    setActiveStep(0);
    setView("practice");
  }

  const pathwayInfo = pathways.find((item) => item.id === pathway) ?? pathways[0];
  const PathwayIcon = pathwayInfo.icon;

  return (
    <div className="app-shell">
      <div className="paper-grain" />
      {view === "home" && (
        <main className="home-screen">
          <AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} />
          <section className="home-hero">
            <div className="hero-copy">
              <p className="eyebrow">A GUIDE FOR THIS MOMENT</p>
              <h1>Ground your energy.<br /><em>Protect your peace.</em><br />Return to yourself.</h1>
              <p className="hero-description">Answer a few simple questions and receive one clear practice to help you ground, protect your capacity, or reset.</p>
              <button className="primary-button" onClick={() => beginPathway("reset")}>Find support for right now <ArrowRight size={18} /></button>
            </div>
            <div className="hero-art" aria-hidden="true"><img src={ASSETS.roseField} alt="" /><div className="hero-art__overlay"><RoseMark /></div></div>
          </section>

          <section className="pathways-section">
            <div className="section-heading"><div><p className="eyebrow">CHOOSE A PATHWAY</p><h2>What would feel supportive?</h2></div><span className="section-number">01 — 05</span></div>
            <div className="pathway-list">
              {pathways.map((item, index) => {
                const Icon = item.icon;
                return <button key={item.id} className={`pathway-card pathway-card--${item.tint} ${item.asset ? "has-art" : ""}`} onClick={() => beginPathway(item.id)}>
                  {item.asset && <img className="pathway-art" src={item.asset} alt="" />}
                  <div className="pathway-card__inner"><span className="card-number">0{index + 1}</span><div className="card-icon"><Icon size={23} /></div><p className="pathway-label">{item.label}</p><h3>{item.title}</h3><p>{item.description}</p><span className="card-arrow"><ChevronRight size={21} /></span></div>
                </button>;
              })}
            </div>
          </section>

          <button className="one-minute-bar" onClick={() => beginPathway("emergency")}><span className="mini-compass"><Compass size={18} /></span><span><b>One-Minute Reset</b><small>For when you need one small next step.</small></span><ArrowRight size={19} /></button>
          <footer className="home-footer">The Energetic Safeguard is a general wellness and spiritual support tool. It does not diagnose or treat health conditions.</footer>
        </main>
      )}

      {view === "intake" && (
        <main className="flow-screen">
          <AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} />
          <div className="flow-topline"><button className="back-button" onClick={() => intakeStep ? setIntakeStep((step) => step - 1) : setView("home")}><ArrowLeft size={18} /> Back</button><IntakeProgress step={intakeStep} /><span>{intakeStep + 1} / 3</span></div>
          <section className="intake-card">
            <div className="intake-context"><span className={`context-icon context-icon--${pathwayInfo.tint}`}><PathwayIcon size={21} /></span><div><p className="eyebrow">{pathwayInfo.label}</p><h2>{pathwayInfo.title}</h2></div></div>
            {intakeStep === 0 && <div className="intake-step"><h1>{prompts[pathway].question}</h1><div className="option-stack">{prompts[pathway].options.map((option) => <button key={option} className={`choice-row ${query.situation === option ? "selected" : ""}`} onClick={() => updateQuery("situation", option)}><span>{option}</span><i>{query.situation === option && <Check size={16} />}</i></button>)}</div><label className="quiet-label">Or describe it in your own words<textarea value={query.situation} onChange={(event) => updateQuery("situation", event.target.value)} placeholder="Only share what feels comfortable." rows={2} /></label></div>}
            {intakeStep === 1 && <div className="intake-step"><h1>How much is this asking of you?</h1><div className="intensity-readout"><strong>{query.intensity}</strong><span>out of 10</span></div><input className="range-input" type="range" min="1" max="10" value={query.intensity} onChange={(event) => updateQuery("intensity", Number(event.target.value))} /><div className="range-captions"><span>Lightly present</span><span>Very intense</span></div><div className="question-split"><div><p className="form-label">Energy available</p><div className="segmented">{(["low", "steady", "high"] as const).map((level) => <button key={level} className={query.energy === level ? "active" : ""} onClick={() => updateQuery("energy", level)}>{level}</button>)}</div></div><div><p className="form-label">Time you have</p><div className="segmented">{([1, 3, 5] as const).map((minutes) => <button key={minutes} className={query.availableMinutes === minutes ? "active" : ""} onClick={() => updateQuery("availableMinutes", minutes)}>{minutes}m</button>)}</div></div></div><p className="form-label form-label--space">Where are you?</p><div className="location-row">{(["anywhere", "home", "work", "public", "outdoors"] as Location[]).map((location) => <button key={location} className={query.location === location ? "active" : ""} onClick={() => updateQuery("location", location)}>{location === "anywhere" ? "Anywhere" : location}</button>)}</div></div>}
            {intakeStep === 2 && <div className="intake-step"><h1>Would you like to make any adjustments?</h1><p className="lead-copy">You can choose what feels supportive, or leave everything as it is.</p><div className="adjustment-stack">{adjustmentOptions.map(([id, label]) => <button key={id} className={`check-row ${query.adjustments.includes(id) ? "selected" : ""}`} onClick={() => toggleAdjustment(id)}><i>{query.adjustments.includes(id) && <Check size={15} />}</i><span>{label}</span></button>)}</div><p className="form-label form-label--space">Practice style for this moment</p><div className="style-list">{styleOptions.slice(0, 4).map((style) => <button key={style.id} className={`style-option ${query.style === style.id ? "selected" : ""}`} onClick={() => updateQuery("style", style.id)}><span><b>{style.label}</b><small>{style.note}</small></span><i>{query.style === style.id && <Check size={15} />}</i></button>)}</div></div>}
            <button className="primary-button intake-continue" disabled={intakeStep === 0 && !query.situation.trim()} onClick={advanceIntake}>{intakeStep === 2 ? "Show my practice" : "Continue"}<ArrowRight size={18} /></button>
          </section>
        </main>
      )}

      {view === "recommendation" && (
        <main className="flow-screen recommendation-screen">
          <AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} />
          <button className="back-button recommendation-back" onClick={() => setView("intake")}><ArrowLeft size={18} /> Adjust answers</button>
          <section className="recommendation-card">
            <div className="recommendation-orb"><RoseMark /></div>
            <p className="eyebrow">YOUR ONE CLEAR NEXT STEP</p><h1>{recommendation.displayName}</h1><p className="recommendation-result">{recommendation.intendedResult}</p>
            <div className="hearing-box"><span><HeartHandshake size={19} /></span><div><p className="eyebrow">WHAT I’M HEARING</p><p>It sounds like this moment feels <b>{query.intensity >= 7 ? "especially intense" : query.intensity >= 4 ? "somewhat demanding" : "present"}</b>, and you have <b>{query.availableMinutes} {query.availableMinutes === 1 ? "minute" : "minutes"}</b> available.</p></div></div>
            <div className="practice-meta"><span><Clock3 size={17} /> About {recommendation.durationMinutes} {recommendation.durationMinutes === 1 ? "minute" : "minutes"}</span><span><Sparkles size={17} /> {recommendation.preferredModality[0]}</span></div>
            <div className="why-box"><p className="eyebrow">WHY THIS ONE</p><p>{recommendationReason(recommendation, query)}</p>{recommendation.roseRay && <small>{recommendation.roseRay}. Symbolic support only.</small>}</div>
            <button className="primary-button primary-button--wide" onClick={startPractice}><Play size={17} fill="currentColor" /> Begin this practice</button>
            {recommendation.shortVersion.length > 0 && <button className="text-button" onClick={() => { setShortVersion(true); setActiveStep(0); setView("practice"); }}>Show a shorter option</button>}
          </section>
        </main>
      )}

      {view === "practice" && (
        <main className="flow-screen practice-screen">
          <AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} />
          <div className="practice-header"><button className="back-button" onClick={() => setView("recommendation")}><ArrowLeft size={18} /> Back</button><span>{shortVersion ? "SHORT OPTION" : `STEP ${activeStep + 1} OF ${visibleSteps.length}`}</span><button className="stop-button" onClick={() => setView("recommendation")}><Pause size={15} /> Stop for now</button></div>
          <section className="guided-card">
            <div className="guided-orb"><span className="orb-ring orb-ring--one" /><span className="orb-ring orb-ring--two" /><RoseMark /></div><p className="eyebrow">{recommendation.displayName}</p><h1>{visibleSteps[activeStep].title}</h1><p className="guided-instruction">{visibleSteps[activeStep].instruction}</p>
            <div className="step-progress"><span style={{ width: `${((activeStep + 1) / visibleSteps.length) * 100}%` }} /></div>
            <div className="practice-controls"><button className="secondary-button" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}>Previous</button><button className="primary-button" onClick={() => activeStep < visibleSteps.length - 1 ? setActiveStep((step) => step + 1) : setView("complete")}>{activeStep < visibleSteps.length - 1 ? "Next step" : "I completed this"}<ArrowRight size={18} /></button></div>
            <button className="overwhelmed-button" onClick={() => setView("safety")}>I feel more overwhelmed</button>
          </section>
        </main>
      )}

      {view === "complete" && (
        <main className="flow-screen complete-screen"><AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} /><section className="complete-card"><div className="completion-flower"><Flower2 size={39} /></div><p className="eyebrow">PRACTICE COMPLETE</p><h1>How do you feel now?</h1><p>{recommendation.closingCheckIn}</p><div className="completion-options"><button onClick={() => setView("home")}>More grounded</button><button onClick={() => setView("home")}>About the same</button><button onClick={() => setView("safety")}>More overwhelmed</button><button onClick={() => setView("home")}>I’m not sure</button></div>{pathway === "hygiene" && <div className="commitment-box"><div><b>A seven-day intention</b><span>Repeat this practice when the pattern appears.</span></div><button className={commitment ? "commitment-active" : ""} onClick={() => setCommitment((value) => !value)}>{commitment ? <Check size={16} /> : "Choose this"}</button></div>}<button className="text-button" onClick={() => setView("home")}>Return home</button></section></main>
      )}

      {view === "safety" && (
        <main className="safety-screen"><AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} /><section className="safety-card"><div className="safety-symbol"><ShieldCheck size={34} /></div><p className="eyebrow">PAUSE HERE</p><h1>You can stop this practice.</h1><p>This is a general wellness and spiritual support tool. It cannot assess what you need in an emergency.</p><div className="orientation-note"><b>For this moment</b><span>With your eyes open, notice one stable object and one point of support beneath or beside you.</span></div><p>If you feel physically unsafe, in immediate danger, or unable to stay safe, please move toward a safer place and contact appropriate personal, professional, medical, crisis, or emergency support.</p><button className="primary-button primary-button--wide" onClick={() => beginPathway("emergency")}>Try a one-minute orientation <ArrowRight size={18} /></button><button className="text-button" onClick={() => setView("home")}>Return home</button></section></main>
      )}

      {view === "settings" && (
        <main className="flow-screen settings-screen"><AppHeader onHome={() => setView("home")} onSettings={() => setView("settings")} /><section className="settings-card"><div className="settings-heading"><div><p className="eyebrow">YOUR PREFERENCES</p><h1>Settings</h1></div><button className="icon-button" onClick={() => setView("home")}><X size={20} /></button></div><div className="setting-group"><h2>Practice style preference</h2>{styleOptions.map((style) => <button key={style.id} className={`setting-choice ${settingsStyle === style.id ? "selected" : ""}`} onClick={() => setSettingsStyle(style.id)}><span><b>{style.label}</b><small>{style.note}</small></span><i>{settingsStyle === style.id && <Check size={16} />}</i></button>)}</div><div className="setting-group"><h2>Accessibility</h2><label className="switch-row"><span><b>Reduced motion</b><small>Keep transitions subtle and still.</small></span><input checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} type="checkbox" /><i /></label><div className="text-size-row"><span><b>Text size</b><small>Choose a comfortable reading size.</small></span><div className="segmented"><button className={textSize === "standard" ? "active" : ""} onClick={() => setTextSize("standard")}>A</button><button className={textSize === "large" ? "active" : ""} onClick={() => setTextSize("large")}>A+</button></div></div></div><div className="wellness-note"><Sparkles size={19} /><p><b>Wellness &amp; safety</b>This app supports grounding and reflection. It does not diagnose, treat, or replace professional care.</p></div><button className="secondary-button secondary-button--wide" onClick={() => setView("home")}><HomeIcon size={17} /> Back to home</button></section></main>
      )}
    </div>
  );
}

