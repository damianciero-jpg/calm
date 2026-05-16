'use client'

import { useState, useEffect, useRef } from "react";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

const MOODS = [
  { id: "happy", emoji: "😄", label: "Happy", color: "#FFD93D", bg: "#FFF9E6", world: "Sunshine Meadow", desc: "You're glowing today!" },
  { id: "calm", emoji: "😌", label: "Calm", color: "#6BCB77", bg: "#F0FFF4", world: "Whispering Forest", desc: "Peaceful and steady." },
  { id: "anxious", emoji: "😟", label: "Worried", color: "#74B9FF", bg: "#EBF5FF", world: "Cloudy Cove", desc: "It's okay to feel this way." },
  { id: "angry", emoji: "😠", label: "Frustrated", color: "#FF6B6B", bg: "#FFF0F0", world: "Volcano Valley", desc: "Big feelings need big breaths." },
  { id: "sad", emoji: "😢", label: "Sad", color: "#A29BFE", bg: "#F3F0FF", world: "Rainy Rainbow", desc: "Sadness is just love with nowhere to go." },
  { id: "tired", emoji: "😴", label: "Tired", color: "#FDCB6E", bg: "#FFFBF0", world: "Sleepy Clouds", desc: "Rest is your superpower." },
];

const MINI_GAMES = {
  happy: {
    name: "Star Collector",
    instruction: "Tap all the stars before time runs out!",
    type: "tap",
    color: "#FFD93D",
    items: ["⭐", "🌟", "✨"],
    bgGradient: "linear-gradient(135deg, #FFF9C4, #FFECB3)",
  },
  calm: {
    name: "Bubble Breath",
    instruction: "Breathe in slowly… now breathe out and pop the bubbles!",
    type: "breath",
    color: "#6BCB77",
    bgGradient: "linear-gradient(135deg, #E8F5E9, #C8E6C9)",
  },
  anxious: {
    name: "Cloud Catcher",
    instruction: "Tap the worries and watch them float away!",
    type: "tap",
    color: "#74B9FF",
    items: ["☁️", "💭", "🌧️"],
    bgGradient: "linear-gradient(135deg, #E3F2FD, #BBDEFB)",
  },
  angry: {
    name: "Volcano Stomp",
    instruction: "Tap the lava blobs to cool them down!",
    type: "tap",
    color: "#FF6B6B",
    items: ["🔥", "💢", "🌋"],
    bgGradient: "linear-gradient(135deg, #FFEBEE, #FFCDD2)",
  },
  sad: {
    name: "Rainbow Painter",
    instruction: "Tap each color to paint your rainbow!",
    type: "rainbow",
    color: "#A29BFE",
    bgGradient: "linear-gradient(135deg, #EDE7F6, #D1C4E9)",
  },
  tired: {
    name: "Dream Catch",
    instruction: "Gently tap the floating dreams!",
    type: "tap",
    color: "#FDCB6E",
    items: ["💤", "🌙", "⭐"],
    bgGradient: "linear-gradient(135deg, #FFFDE7, #FFF9C4)",
  },
};

const REWARDS = ["🏅", "🎖️", "⭐", "🌟", "🏆", "💎", "🎀", "🎊"];

function FloatingItem({ item, x, y, onClick, id }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        fontSize: "2.5rem",
        background: "none",
        border: "none",
        cursor: "pointer",
        animation: `float-${id % 3} 3s ease-in-out infinite`,
        animationDelay: `${(id * 0.3) % 1.5}s`,
        transform: "translate(-50%, -50%)",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
        transition: "transform 0.1s",
        zIndex: 10,
      }}
    >
      {item}
    </button>
  );
}

function TapGame({ game, mood, onComplete }) {
  const [items, setItems] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 15 + Math.random() * 70,
      emoji: game.items[i % game.items.length],
      popped: false,
    }))
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const active = items.filter((i) => !i.popped).length;
    if (active === 0 && items.length > 0) {
      clearInterval(timerRef.current);
      setDone(true);
    }
  }, [items]);

  const popItem = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, popped: true } : item))
    );
    setScore((s) => s + 10);
  };

  if (done) {
    const popped = items.filter((i) => i.popped).length;
    const stars = popped >= 7 ? 3 : popped >= 5 ? 2 : 1;
    return (
      <div style={{ textAlign: "center", padding: "2rem", animation: "popIn 0.5s ease" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
          {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
        </div>
        <div style={{ fontSize: "1.8rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#333", marginBottom: "0.5rem" }}>
          {popped >= 7 ? "Amazing! 🎉" : popped >= 5 ? "Great job! 👏" : "Good try! 💪"}
        </div>
        <div style={{ fontSize: "1.1rem", color: "#666", marginBottom: "2rem", fontFamily: "'Nunito', sans-serif" }}>
          You got {popped} out of {items.length}!
        </div>
        <button onClick={() => onComplete(stars)} style={btnStyle(game.color)}>
          Keep Going! →
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "360px", background: game.bgGradient, borderRadius: "20px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "12px", left: "16px", right: "16px", display: "flex", justifyContent: "space-between", zIndex: 20 }}>
        <div style={hudStyle(game.color)}>⏱ {timeLeft}s</div>
        <div style={hudStyle(game.color)}>✨ {score}</div>
      </div>
      {items.map((item) =>
        !item.popped ? (
          <FloatingItem key={item.id} {...item} item={item.emoji} onClick={popItem} />
        ) : null
      )}
    </div>
  );
}

function BreathGame({ game, onComplete }) {
  const [phase, setPhase] = useState("inhale");
  const [count, setCount] = useState(4);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const totalRounds = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (phase === "inhale") {
            setPhase("hold");
            return 4;
          } else if (phase === "hold") {
            setPhase("exhale");
            return 6;
          } else {
            const nextRound = round + 1;
            if (nextRound >= totalRounds) {
              setDone(true);
              clearInterval(timer);
              return 0;
            }
            setRound(nextRound);
            setPhase("inhale");
            return 4;
          }
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, round]);

  const phaseConfig = {
    inhale: { label: "Breathe In 🌬️", scale: 1.3, color: "#6BCB77" },
    hold: { label: "Hold 🤫", scale: 1.3, color: "#74B9FF" },
    exhale: { label: "Breathe Out 💨", scale: 0.8, color: "#A29BFE" },
  };
  const cfg = phaseConfig[phase];

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", animation: "popIn 0.5s ease" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🌈</div>
        <div style={{ fontSize: "1.8rem", fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: "#333", marginBottom: "0.5rem" }}>
          You did it! So calm! 🌿
        </div>
        <div style={{ fontSize: "1rem", color: "#666", marginBottom: "2rem", fontFamily: "'Nunito', sans-serif" }}>
          3 full breaths complete
        </div>
        <button onClick={() => onComplete(3)} style={btnStyle(game.color)}>Keep Going! →</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", background: game.bgGradient, borderRadius: "20px", minHeight: "320px", justifyContent: "center" }}>
      <div style={{ fontSize: "1rem", color: "#888", marginBottom: "1.5rem", fontFamily: "'Nunito', sans-serif" }}>
        Round {round + 1} of {totalRounds}
      </div>
      <div style={{
        width: "140px", height: "140px", borderRadius: "50%",
        background: `radial-gradient(circle, ${cfg.color}88, ${cfg.color}33)`,
        border: `4px solid ${cfg.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform 1s ease, background 1s ease",
        transform: `scale(${cfg.scale})`,
        marginBottom: "2rem",
        boxShadow: `0 0 30px ${cfg.color}44`,
      }}>
        <span style={{ fontSize: "2.5rem" }}>🫧</span>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Nunito', sans-serif", color: cfg.color, marginBottom: "0.5rem" }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: "3rem", fontWeight: 900, fontFamily: "'Nunito', sans-serif", color: "#333" }}>
        {count}
      </div>
    </div>
  );
}

function RainbowGame({ game, onComplete }) {
  const colors = ["#FF6B6B", "#FF9F43", "#FFD93D", "#6BCB77", "#74B9FF", "#A29BFE"];
  const labels = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
  const [painted, setPainted] = useState([]);

  const paint = (i) => {
    if (!painted.includes(i)) {
      const next = [...painted, i];
      setPainted(next);
      if (next.length === colors.length) {
        setTimeout(() => onComplete(3), 800);
      }
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: game.bgGradient, borderRadius: "20px", textAlign: "center", minHeight: "300px" }}>
      <div style={{ fontSize: "1rem", color: "#888", marginBottom: "1.5rem", fontFamily: "'Nunito', sans-serif" }}>
        Tap each color stripe!
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {colors.map((color, i) => (
          <button
            key={i}
            onClick={() => paint(i)}
            style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: painted.includes(i) ? color : "#ddd",
              border: painted.includes(i) ? `3px solid ${color}` : "3px solid #ccc",
              cursor: "pointer",
              transform: painted.includes(i) ? "scale(1.2)" : "scale(1)",
              transition: "all 0.3s ease",
              boxShadow: painted.includes(i) ? `0 4px 15px ${color}66` : "none",
              fontSize: "1.5rem",
            }}
          >
            {painted.includes(i) ? "✓" : ""}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "1rem" }}>
        {colors.map((color, i) => (
          <div key={i} style={{
            height: "30px", width: `${100 / colors.length - 2}%`,
            background: painted.includes(i) ? color : "#eee",
            borderRadius: "4px",
            transition: "background 0.4s ease",
          }} />
        ))}
      </div>
      <div style={{ fontSize: "1rem", color: "#666", fontFamily: "'Nunito', sans-serif" }}>
        {painted.length}/{colors.length} colors painted!
      </div>
    </div>
  );
}

function hudStyle(color) {
  return {
    background: "white",
    borderRadius: "20px",
    padding: "6px 14px",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    fontSize: "1rem",
    color,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };
}

function btnStyle(color) {
  return {
    background: color,
    color: "white",
    border: "none",
    borderRadius: "50px",
    padding: "14px 36px",
    fontSize: "1.1rem",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: `0 6px 20px ${color}66`,
    transition: "transform 0.15s, box-shadow 0.15s",
  };
}

export default function MoodQuest({ childId }) {
  const [screen, setScreen] = useState("welcome");
  const [selectedMood, setSelectedMood] = useState(null);
  const [gameStars, setGameStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [sessionLog, setSessionLog] = useState([]);

  // Load real star total from DB for this child
  useEffect(() => {
    if (!childId) return;
    const db = getFirebaseDb();
    getDocs(query(collection(db, "sessions"), where("childId", "==", childId)))
      .then((snapshot) => {
        setTotalStars(snapshot.docs.reduce((a, doc) => a + (Number(doc.data().stars) || 0), 0));
      })
      .catch((err) => console.error("Session stars query failed:", err));
  }, [childId]);

  const mood = selectedMood ? MOODS.find((m) => m.id === selectedMood) : null;
  const game = selectedMood ? MINI_GAMES[selectedMood] : null;

  const handleMoodSelect = (id) => {
    setSelectedMood(id);
    setScreen("world");
  };

  const handlePlayGame = () => setScreen("game");

  const handleGameComplete = (stars) => {
    setGameStars(stars);
    setTotalStars((s) => s + stars);
    const badge = REWARDS[Math.floor(Math.random() * REWARDS.length)];
    setEarnedBadge(badge);
    setSessionLog((prev) => [
      ...prev,
      { mood: selectedMood, stars, timestamp: new Date().toLocaleTimeString() },
    ]);
    setScreen("reward");

    if (childId) {
      const db = getFirebaseDb();
      const user = getFirebaseAuth().currentUser;
      const now = new Date();
      const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      addDoc(collection(db, "sessions"), {
          childId,
          parentId: user?.uid ?? "",
          mood: selectedMood,
          stars,
          game: MINI_GAMES[selectedMood]?.name ?? "",
          world: MOODS.find((m) => m.id === selectedMood)?.world ?? "",
          playedAt: now,
          dayLabel: DAY_LABELS[now.getDay()],
          createdAt: serverTimestamp(),
        })
        .catch((err) => console.error("Session insert failed:", err));
    }
  };

  const handlePlayAgain = () => {
    setSelectedMood(null);
    setScreen("mood");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #F7F3FF; }

        @keyframes float-0 {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-12px); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          50% { transform: translate(-50%, -50%) translateY(-8px) rotate(5deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          33% { transform: translate(-50%, -50%) translateY(-6px); }
          66% { transform: translate(-50%, -50%) translateY(-14px); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(162, 155, 254, 0.4); }
          100% { box-shadow: 0 0 0 20px rgba(162, 155, 254, 0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes starSpin {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1); }
        }

        .mood-btn:hover { transform: scale(1.08) !important; }
        .mood-btn:active { transform: scale(0.95) !important; }
        .play-btn:hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 12px 30px rgba(0,0,0,0.2) !important; }
        .play-btn:active { transform: scale(0.97) !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #F7F3FF 0%, #EBF5FF 50%, #F0FFF4 100%)",
        fontFamily: "'Nunito', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}>

        {/* WELCOME */}
        {screen === "welcome" && (
          <div style={{ textAlign: "center", animation: "fadeSlideUp 0.6s ease", maxWidth: "420px", width: "100%" }}>
            <div style={{ fontSize: "5rem", marginBottom: "0.5rem", animation: "bounce 2s ease-in-out infinite" }}>🗺️</div>
            <h1 style={{
              fontFamily: "'Baloo 2', cursive", fontSize: "3rem", fontWeight: 800,
              background: "linear-gradient(135deg, #A29BFE, #74B9FF, #6BCB77)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.1, marginBottom: "0.75rem",
            }}>
              MoodQuest
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#666", marginBottom: "0.5rem", lineHeight: 1.6 }}>
              Your feelings are your superpower! ✨
            </p>
            <p style={{ fontSize: "0.95rem", color: "#999", marginBottom: "2.5rem" }}>
              Tell us how you feel, then go on an adventure!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "2.5rem", flexWrap: "wrap" }}>
              {MOODS.slice(0, 4).map((m) => (
                <div key={m.id} style={{
                  fontSize: "1.8rem", background: "white", borderRadius: "50%",
                  width: "52px", height: "52px", display: "flex", alignItems: "center",
                  justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                  animation: "float-0 3s ease-in-out infinite",
                  animationDelay: `${Math.random() * 1.5}s`,
                }}>
                  {m.emoji}
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "12px 20px", marginBottom: "2rem", display: "inline-flex", gap: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#A29BFE" }}>{totalStars}</div>
                <div style={{ fontSize: "0.75rem", color: "#999" }}>Stars</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#6BCB77" }}>{sessionLog.length}</div>
                <div style={{ fontSize: "0.75rem", color: "#999" }}>Quests</div>
              </div>
            </div>
            <br />
            <button className="play-btn" onClick={() => setScreen("mood")} style={{
              ...btnStyle("#A29BFE"),
              fontSize: "1.25rem", padding: "16px 48px",
              animation: "pulse-ring 2s ease-out infinite",
            }}>
              Start Quest! 🚀
            </button>
          </div>
        )}

        {/* MOOD PICKER */}
        {screen === "mood" && (
          <div style={{ width: "100%", maxWidth: "480px", animation: "fadeSlideUp 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🌈</div>
              <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "1.8rem", fontWeight: 800, color: "#333" }}>
                How are you feeling?
              </h2>
              <p style={{ color: "#888", fontSize: "0.95rem" }}>Tap the one that feels right!</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className="mood-btn"
                  onClick={() => handleMoodSelect(m.id)}
                  style={{
                    background: m.bg,
                    border: `3px solid ${m.color}44`,
                    borderRadius: "20px",
                    padding: "16px 8px",
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "2.5rem" }}>{m.emoji}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#444", fontFamily: "'Nunito', sans-serif" }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WORLD INTRO */}
        {screen === "world" && mood && game && (
          <div style={{ width: "100%", maxWidth: "420px", animation: "fadeSlideUp 0.5s ease", textAlign: "center" }}>
            <div style={{
              background: mood.bg,
              borderRadius: "28px",
              padding: "2.5rem 2rem",
              marginBottom: "1.5rem",
              border: `3px solid ${mood.color}44`,
              boxShadow: `0 8px 30px ${mood.color}22`,
            }}>
              <div style={{ fontSize: "4rem", marginBottom: "0.75rem", animation: "bounce 2s ease-in-out infinite" }}>
                {mood.emoji}
              </div>
              <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "1.7rem", fontWeight: 800, color: "#333", marginBottom: "0.25rem" }}>
                {mood.world}
              </h2>
              <p style={{ color: "#666", fontSize: "1rem", marginBottom: "1.5rem" }}>{mood.desc}</p>
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "14px 20px",
                marginBottom: "0.5rem",
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: mood.color, marginBottom: "4px" }}>
                  🎮 {game.name}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>{game.instruction}</div>
              </div>
            </div>
            <button className="play-btn" onClick={handlePlayGame} style={{
              ...btnStyle(mood.color),
              fontSize: "1.2rem", padding: "15px 44px", width: "100%",
            }}>
              Let's Play! 🎮
            </button>
            <button onClick={() => setScreen("mood")} style={{
              background: "none", border: "none", color: "#aaa", marginTop: "1rem",
              fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            }}>
              ← Choose a different feeling
            </button>
          </div>
        )}

        {/* GAME */}
        {screen === "game" && mood && game && (
          <div style={{ width: "100%", maxWidth: "480px", animation: "fadeSlideUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem", gap: "10px" }}>
              <button onClick={() => setScreen("world")} style={{
                background: "white", border: "none", borderRadius: "50%",
                width: "40px", height: "40px", cursor: "pointer", fontSize: "1.1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}>←</button>
              <div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: "1.2rem", color: "#333" }}>
                  {game.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#999" }}>{mood.world}</div>
              </div>
              <div style={{ marginLeft: "auto", ...hudStyle(mood.color) }}>⭐ {totalStars}</div>
            </div>

            <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
              {game.type === "tap" || game.type === "breath" ? (
                game.type === "tap" ? (
                  <TapGame game={game} mood={mood} onComplete={handleGameComplete} />
                ) : (
                  <BreathGame game={game} onComplete={handleGameComplete} />
                )
              ) : (
                <RainbowGame game={game} onComplete={handleGameComplete} />
              )}
            </div>
          </div>
        )}

        {/* REWARD */}
        {screen === "reward" && mood && (
          <div style={{ width: "100%", maxWidth: "420px", animation: "popIn 0.6s ease", textAlign: "center" }}>
            <div style={{
              background: "white",
              borderRadius: "28px",
              padding: "2.5rem 2rem",
              boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
            }}>
              <div style={{ fontSize: "5rem", marginBottom: "0.5rem", animation: "starSpin 1s ease-out" }}>
                {earnedBadge}
              </div>
              <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: "2rem", fontWeight: 800, color: "#333", marginBottom: "0.5rem" }}>
                Quest Complete!
              </h2>
              <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "1rem", fontSize: "2rem" }}>
                {"⭐".repeat(gameStars)}{"☆".repeat(3 - gameStars)}
              </div>
              <div style={{ fontSize: "1rem", color: "#888", marginBottom: "1.5rem" }}>
                You earned <strong style={{ color: mood.color }}>{gameStars} star{gameStars !== 1 ? "s" : ""}</strong>!
              </div>
              <div style={{
                background: mood.bg,
                borderRadius: "16px",
                padding: "14px",
                border: `2px solid ${mood.color}33`,
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#333", marginBottom: "4px" }}>
                  {mood.emoji} You felt {mood.label.toLowerCase()} today
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  And you completed {mood.world}! 🌟
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="play-btn" onClick={handlePlayAgain} style={{
                ...btnStyle(mood.color),
                flex: 1, fontSize: "1rem", padding: "14px",
              }}>
                Play Again! 🎮
              </button>
              <button className="play-btn" onClick={() => setScreen("welcome")} style={{
                background: "white",
                color: "#666",
                border: "2px solid #eee",
                borderRadius: "50px",
                padding: "14px",
                flex: 1,
                fontSize: "1rem",
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
              }}>
                🏠 Home
              </button>
            </div>

            {sessionLog.length > 0 && (
              <div style={{ marginTop: "1.5rem", background: "white", borderRadius: "16px", padding: "1rem", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#aaa", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Today's Quests
                </div>
                {sessionLog.slice(-3).map((log, i) => {
                  const m = MOODS.find((x) => x.id === log.mood);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < sessionLog.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                      <span style={{ fontSize: "1.2rem" }}>{m?.emoji}</span>
                      <span style={{ fontSize: "0.85rem", color: "#555", flex: 1, fontFamily: "'Nunito', sans-serif" }}>{m?.label} → {"⭐".repeat(log.stars)}</span>
                      <span style={{ fontSize: "0.75rem", color: "#bbb" }}>{log.timestamp}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
