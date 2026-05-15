'use client'

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

// Maps teen mood IDs → DB Mood enum values
const MOOD_MAP = {
  good: "happy", chill: "calm", anxious: "anxious",
  frustrated: "angry", down: "sad", drained: "tired",
};

const MOODS = [
  { id: "good",       emoji: "🙂", label: "Good",       color: "#34D399", desc: "Things feel positive." },
  { id: "chill",      emoji: "😌", label: "Chill",      color: "#60A5FA", desc: "Relaxed, low-key." },
  { id: "anxious",    emoji: "😬", label: "Anxious",    color: "#FBBF24", desc: "Stressed or on edge." },
  { id: "frustrated", emoji: "😤", label: "Frustrated", color: "#F87171", desc: "Something feels off." },
  { id: "down",       emoji: "😔", label: "Down",       color: "#A78BFA", desc: "Heavy or low energy." },
  { id: "drained",    emoji: "🥱", label: "Drained",    color: "#94A3B8", desc: "Running on empty." },
];

// Activity assigned to each mood
const ACTIVITY = {
  good:       { name: "Gratitude Check",  type: "reflection", color: "#34D399" },
  chill:      { name: "Gratitude Check",  type: "reflection", color: "#60A5FA" },
  anxious:    { name: "4-7-8 Breathing",  type: "breathing",  color: "#FBBF24",
                phases: [{ label: "Inhale",  duration: 4 }, { label: "Hold", duration: 7 }, { label: "Exhale", duration: 8 }] },
  frustrated: { name: "5-4-3-2-1 Ground", type: "grounding",  color: "#F87171" },
  down:       { name: "Self-Check",       type: "reflection", color: "#A78BFA" },
  drained:    { name: "Box Breathing",    type: "breathing",  color: "#94A3B8",
                phases: [{ label: "Inhale", duration: 4 }, { label: "Hold", duration: 4 }, { label: "Exhale", duration: 4 }, { label: "Rest", duration: 4 }] },
};

const REFLECTION_PROMPTS = {
  good:  ["Something that went well today", "Someone you appreciate", "A moment you enjoyed recently"],
  chill: ["Something you're grateful for",  "A person who makes things easier", "One thing you're looking forward to"],
  down:  ["One thing that isn't your fault", "Someone who cares about you", "One small thing you can do for yourself"],
};

const GROUNDING_STEPS = [
  { icon: "👁️", prompt: "Name 5 things you can see right now" },
  { icon: "✋", prompt: "Notice 4 things you can physically feel" },
  { icon: "👂", prompt: "Listen for 3 sounds around you" },
  { icon: "👃", prompt: "Identify 2 smells, or notice the air" },
  { icon: "👅", prompt: "Notice 1 taste, or just your breath" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Styles ─────────────────────────────────────────────────────────────

const card = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
};

function pill(color) {
  return {
    display: "inline-block", padding: "4px 12px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 700, fontSize: "0.75rem",
    border: `1px solid ${color}44`,
  };
}

function btn(color) {
  return {
    width: "100%", padding: "14px", borderRadius: "12px", border: "none",
    background: color, color: "white", fontFamily: "'Outfit', sans-serif",
    fontWeight: 700, fontSize: "1rem", cursor: "pointer",
    boxShadow: `0 4px 20px ${color}44`, transition: "opacity 0.15s",
  };
}

function ghostBtn() {
  return {
    background: "none", border: "none", color: "#64748B",
    fontFamily: "'Outfit', sans-serif", fontSize: "0.85rem",
    cursor: "pointer", padding: "8px 0",
  };
}

// ── Activity components ────────────────────────────────────────────────

function BreathingActivity({ activity, onComplete }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count,    setCount]    = useState(activity.phases[0].duration);
  const [round,    setRound]    = useState(0);
  const [done,     setDone]     = useState(false);
  const ROUNDS = 3;

  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => {
        if (c > 1) return c - 1;
        const nextPhase = (phaseIdx + 1) % activity.phases.length;
        if (nextPhase === 0) {
          const nextRound = round + 1;
          if (nextRound >= ROUNDS) { clearInterval(t); setDone(true); return 0; }
          setRound(nextRound);
        }
        setPhaseIdx(nextPhase);
        return activity.phases[nextPhase].duration;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseIdx, round, activity.phases]);

  const phase = activity.phases[phaseIdx];
  const isExpand = phase.label === "Inhale" || phase.label === "Hold";
  const scale = isExpand ? 1.35 : 0.75;

  if (done) return (
    <div style={{ textAlign: "center", padding: "2rem 0" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
      <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        {ROUNDS} cycles complete
      </div>
      <div style={{ color: "#64748B", fontSize: "0.85rem", marginBottom: "2rem" }}>
        Breathing resets your nervous system.
      </div>
      <button onClick={() => onComplete()} style={btn(activity.color)}>Done</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem 0" }}>
      <div style={{ fontSize: "0.78rem", color: "#64748B", marginBottom: "2rem" }}>
        Round {round + 1} of {ROUNDS}
      </div>
      <div style={{
        width: "140px", height: "140px", borderRadius: "50%",
        background: `radial-gradient(circle, ${activity.color}55, ${activity.color}18)`,
        border: `2px solid ${activity.color}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: `transform ${phase.duration * 0.9}s ease`,
        transform: `scale(${scale})`,
        marginBottom: "2.5rem",
        boxShadow: `0 0 40px ${activity.color}33`,
      }}>
        <span style={{ fontSize: "2rem" }}>🫧</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: activity.color, marginBottom: "0.5rem" }}>
        {phase.label}
      </div>
      <div style={{ fontSize: "3rem", fontWeight: 800, color: "#F1F5F9" }}>{count}</div>
    </div>
  );
}

function GroundingActivity({ activity, onComplete }) {
  const [step, setStep] = useState(0);
  const current = GROUNDING_STEPS[step];

  function next() {
    if (step < GROUNDING_STEPS.length - 1) setStep(s => s + 1);
    else onComplete();
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {GROUNDING_STEPS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "3px", borderRadius: "2px",
            background: i <= step ? activity.color : "rgba(255,255,255,0.1)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      <div style={{ ...card, padding: "2rem 1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{current.icon}</div>
        <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.5 }}>
          {current.prompt}
        </div>
        <div style={{ color: "#64748B", fontSize: "0.8rem", marginTop: "0.75rem" }}>
          Take your time. Tap when ready.
        </div>
      </div>

      <button onClick={next} style={btn(activity.color)}>
        {step < GROUNDING_STEPS.length - 1 ? "Next →" : "Done"}
      </button>
    </div>
  );
}

function ReflectionActivity({ moodId, activity, onComplete }) {
  const prompts = REFLECTION_PROMPTS[moodId] ?? REFLECTION_PROMPTS.good;
  const [step, setStep] = useState(0);

  function next() {
    if (step < prompts.length - 1) setStep(s => s + 1);
    else onComplete();
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {prompts.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "3px", borderRadius: "2px",
            background: i <= step ? activity.color : "rgba(255,255,255,0.1)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      <div style={{ ...card, padding: "2rem 1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748B", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
          Think about this
        </div>
        <div style={{ color: "#F1F5F9", fontWeight: 600, fontSize: "1.1rem", lineHeight: 1.6 }}>
          {prompts[step]}
        </div>
      </div>

      <button onClick={next} style={btn(activity.color)}>
        {step < prompts.length - 1 ? "Next →" : "Done"}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function TeenMode({ childId }) {
  const [screen,       setScreen]       = useState("checkin");
  const [selectedMood, setSelectedMood] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!childId) return;
    const supabase = createClient();
    supabase.from("sessions").select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .then(({ count }) => setSessionCount(count ?? 0));
  }, [childId]);

  const mood     = selectedMood ? MOODS.find(m => m.id === selectedMood) : null;
  const activity = selectedMood ? ACTIVITY[selectedMood] : null;

  function selectMood(id) {
    setSelectedMood(id);
    setScreen("activity");
  }

  function handleComplete() {
    if (childId && selectedMood) {
      const supabase = createClient();
      const now = new Date();
      supabase.from("sessions").insert({
        child_id:  childId,
        mood:      MOOD_MAP[selectedMood],
        stars:     3,
        game:      ACTIVITY[selectedMood]?.name ?? "",
        world:     "",
        played_at: now.toISOString(),
        day_label: DAY_LABELS[now.getDay()],
      }).then(({ error }) => {
        if (!error) {
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ childId }),
          }).catch(() => {});
        }
      });
    }
    setSessionCount(n => n + 1);
    setScreen("done");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.85); opacity: 0; } 80% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
        .mood-card:hover { transform: translateY(-2px) !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        fontFamily: "'Outfit', sans-serif",
        color: "#F1F5F9",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "1.5rem 1rem",
      }}>
        <div style={{ width: "100%", maxWidth: "420px", animation: "fadeUp 0.4s ease" }}>

          {/* ── Check-in screen ────────────────────────── */}
          {screen === "checkin" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.6rem", margin: "0 auto 1rem",
                }}>🧠</div>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#F1F5F9", marginBottom: "0.4rem" }}>
                  Daily Check-in
                </h1>
                <p style={{ fontSize: "0.9rem", color: "#64748B" }}>
                  A quick moment to notice how you&apos;re doing.
                </p>
              </div>

              {sessionCount > 0 && (
                <div style={{ ...card, padding: "12px 20px", display: "inline-flex", gap: "20px", marginBottom: "2rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#818CF8" }}>{sessionCount}</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Check-ins</div>
                  </div>
                </div>
              )}

              <button onClick={() => setScreen("mood")} style={btn("#6366F1")}>
                How am I feeling?
              </button>
            </div>
          )}

          {/* ── Mood picker ────────────────────────────── */}
          {screen === "mood" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#F1F5F9", marginBottom: "0.3rem" }}>
                  Right now I feel…
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#64748B" }}>Pick the closest one.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    className="mood-card"
                    onClick={() => selectMood(m.id)}
                    style={{
                      ...card,
                      padding: "16px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "12px",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      border: `1px solid ${m.color}33`,
                    }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>{m.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#F1F5F9" }}>{m.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "2px" }}>{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Activity ───────────────────────────────── */}
          {screen === "activity" && mood && activity && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                <button onClick={() => setScreen("mood")} style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
                  color: "#94A3B8", fontSize: "1rem",
                }}>←</button>
                <div>
                  <div style={{ fontWeight: 700, color: "#F1F5F9" }}>{activity.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.85rem" }}>{mood.emoji}</span>
                    <span style={pill(mood.color)}>{mood.label}</span>
                  </div>
                </div>
              </div>

              {activity.type === "breathing" && (
                <BreathingActivity activity={activity} onComplete={handleComplete} />
              )}
              {activity.type === "grounding" && (
                <GroundingActivity activity={activity} onComplete={handleComplete} />
              )}
              {activity.type === "reflection" && (
                <ReflectionActivity moodId={selectedMood} activity={activity} onComplete={handleComplete} />
              )}
            </div>
          )}

          {/* ── Done screen ────────────────────────────── */}
          {screen === "done" && mood && (
            <div style={{ textAlign: "center", animation: "pop 0.5s ease" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F1F5F9", marginBottom: "0.4rem" }}>
                Check-in complete
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#64748B", marginBottom: "2rem" }}>
                Logged and saved. Good job showing up for yourself.
              </p>

              <div style={{ ...card, padding: "16px", marginBottom: "2rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748B", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Today&apos;s mood
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.8rem" }}>{mood.emoji}</span>
                  <span style={pill(mood.color)}>{mood.label}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setSelectedMood(null); setScreen("mood"); }} style={{
                  ...btn(mood.color), flex: 1,
                }}>
                  Check in again
                </button>
                <button onClick={() => setScreen("checkin")} style={{
                  flex: 1, padding: "14px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94A3B8", fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                  fontSize: "1rem", cursor: "pointer",
                }}>
                  Home
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
