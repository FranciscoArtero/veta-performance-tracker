import { useState, useEffect, useRef, useCallback } from "react";

export type FocusState = "idle" | "focus" | "short_break" | "long_break";

export type FocusSettings = {
    focusDuration: number; // in minutes
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
};

const DEFAULT_SETTINGS: FocusSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
};

type TimerData = {
    state: FocusState;
    targetTime: number | null; // epoch ms when the timer finishes
    pausedLeft: number | null; // ms left if paused
    pomodorosCompleted: number;
    settings: FocusSettings;
};

const STORAGE_KEY = "core_os_focus_timer";

export function useFocusTimer() {
    // ─── State ──────────────────────────────────────────────────────────────
    const [timerState, setTimerState] = useState<FocusState>("idle");
    const [timeLeftMs, setTimeLeftMs] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
    const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);

    // Refs for real-time engine
    const targetTimeRef = useRef<number | null>(null);
    const pausedLeftRef = useRef<number | null>(null);
    const rAFRef = useRef<number | null>(null);

    // ─── Initialization (Client-side only) ──────────────────────────────────
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data: TimerData = JSON.parse(saved);
                setTimerState(data.state);
                setPomodorosCompleted(data.pomodorosCompleted || 0);
                setSettings(data.settings || DEFAULT_SETTINGS);

                if (data.pausedLeft !== null) {
                    // It was explicitly paused
                    pausedLeftRef.current = data.pausedLeft;
                    setIsPaused(true);
                    setTimeLeftMs(data.pausedLeft);
                } else if (data.targetTime !== null) {
                    // It was running
                    const now = Date.now();
                    const left = data.targetTime - now;
                    if (left > 0) {
                        targetTimeRef.current = data.targetTime;
                        setTimeLeftMs(left);
                        setIsPaused(false);
                    } else {
                        // Finished while away
                        handleComplete(data.state, data.pomodorosCompleted || 0, data.settings || DEFAULT_SETTINGS);
                    }
                } else {
                    setTimeLeftMs((data.settings?.focusDuration || 25) * 60 * 1000);
                }
            } catch (e) {
                console.error("Failed to parse focus timer data", e);
                resetToIdle(DEFAULT_SETTINGS);
            }
        } else {
            resetToIdle(DEFAULT_SETTINGS);
        }

        // Request notification permission early
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Persistence ────────────────────────────────────────────────────────
    const persist = useCallback((
        st: FocusState,
        target: number | null,
        paused: number | null,
        completed: number,
        sets: FocusSettings
    ) => {
        const data: TimerData = {
            state: st,
            targetTime: target,
            pausedLeft: paused,
            pomodorosCompleted: completed,
            settings: sets,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, []);

    // ─── Audio & Notifications ──────────────────────────────────────────────
    const playBell = useCallback(() => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Reverb / Body
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            // Attack / Ting
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "triangle";
            osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            // Envelope 1
            gain1.gain.setValueAtTime(0, ctx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 4);

            // Envelope 2
            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 4.1);
            osc2.stop(ctx.currentTime + 1.6);
        } catch (e) {
            console.warn("AudioContext not supported or blocked", e);
        }
    }, []);

    const sendNotification = useCallback((title: string, body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body,
                icon: "/icon.svg",
            });
        }
    }, []);

    const resetToIdle = useCallback((sets: FocusSettings, completed = 0) => {
        targetTimeRef.current = null;
        pausedLeftRef.current = null;
        setTimerState("idle");
        setIsPaused(false);
        setPomodorosCompleted(completed);
        setTimeLeftMs(sets.focusDuration * 60 * 1000);
        persist("idle", null, null, completed, sets);
    }, [persist]);

    // ─── State Transitions ──────────────────────────────────────────────────
    const handleComplete = useCallback((currentState: FocusState, completed: number, currentSettings: FocusSettings) => {
        playBell();
        let nextState: FocusState = "idle";
        let title = "";
        let body = "";
        let newCompleted = completed;

        if (currentState === "focus") {
            newCompleted++;
            if (newCompleted % currentSettings.longBreakInterval === 0) {
                nextState = "long_break";
                title = "¡Descanso Largo!";
                body = `Gran trabajo. Te ganaste ${currentSettings.longBreakDuration} minutos de recreo.`;
            } else {
                nextState = "short_break";
                title = "¡Descanso Corto!";
                body = `Mente fría. Tomate ${currentSettings.shortBreakDuration} minutos.`;
            }
        } else {
            // Finished a break
            nextState = "idle";
            title = "A trabajar";
            body = "El recreo terminó. Es hora de volver al Focus.";
        }

        sendNotification(title, body);

        setTimerState(nextState);
        setPomodorosCompleted(newCompleted);
        setIsPaused(false);

        let durationMs = 0;
        if (nextState !== "idle") {
            const minutes = nextState === "short_break" ? currentSettings.shortBreakDuration : currentSettings.longBreakDuration;
            durationMs = minutes * 60 * 1000;
            targetTimeRef.current = Date.now() + durationMs;
            pausedLeftRef.current = null;
            persist(nextState, targetTimeRef.current, null, newCompleted, currentSettings);
            // Engine will catch up via targetTimeRef in the next rAF tick, but we set it here too
            setTimeLeftMs(durationMs);
        } else {
            resetToIdle(currentSettings, newCompleted);
        }
    }, [playBell, sendNotification, persist, resetToIdle]);

    // ─── Engine Tick ────────────────────────────────────────────────────────
    const tick = useCallback(() => {
        if (!targetTimeRef.current) return;

        const now = Date.now();
        const left = targetTimeRef.current - now;

        if (left <= 0) {
            // We reached 0!
            targetTimeRef.current = null;
            setTimeLeftMs(0);
            handleComplete(timerState, pomodorosCompleted, settings);
            return;
        }

        setTimeLeftMs(left);
        rAFRef.current = requestAnimationFrame(tick);
    }, [timerState, pomodorosCompleted, settings, handleComplete]);

    // Cleanup rAF
    useEffect(() => {
        if (!isPaused && targetTimeRef.current) {
            rAFRef.current = requestAnimationFrame(tick);
        }
        return () => {
            if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        };
    }, [tick, isPaused]);



    // ─── Controls ───────────────────────────────────────────────────────────
    const start = useCallback(() => {
        if (isPaused && pausedLeftRef.current) {
            // Resume
            targetTimeRef.current = Date.now() + pausedLeftRef.current;
            pausedLeftRef.current = null;
            setIsPaused(false);
            persist(timerState, targetTimeRef.current, null, pomodorosCompleted, settings);
        } else if (timerState === "idle") {
            // Start fresh
            const target = Date.now() + settings.focusDuration * 60 * 1000;
            targetTimeRef.current = target;
            setIsPaused(false);
            setTimerState("focus");
            persist("focus", target, null, pomodorosCompleted, settings);
        }
    }, [isPaused, timerState, pomodorosCompleted, settings, persist]);

    const pause = useCallback(() => {
        if (!targetTimeRef.current) return;
        const left = targetTimeRef.current - Date.now();
        pausedLeftRef.current = Math.max(0, left);
        targetTimeRef.current = null;
        setIsPaused(true);
        persist(timerState, null, pausedLeftRef.current, pomodorosCompleted, settings);
    }, [timerState, pomodorosCompleted, settings, persist]);

    const skip = useCallback(() => {
        // Forcibly jump to completion of current state
        if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        handleComplete(timerState, pomodorosCompleted, settings);
    }, [timerState, pomodorosCompleted, settings, handleComplete]);

    const stop = useCallback(() => {
        if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        resetToIdle(settings, pomodorosCompleted);
    }, [settings, pomodorosCompleted, resetToIdle]);

    const updateSettings = useCallback((newSettings: Partial<FocusSettings>) => {
        const merged = { ...settings, ...newSettings };
        setSettings(merged);
        if (timerState === "idle") {
            setTimeLeftMs(merged.focusDuration * 60 * 1000);
            persist("idle", null, null, pomodorosCompleted, merged);
        } else {
            // Just update settings, don't mess with running timer
            persist(timerState, targetTimeRef.current, pausedLeftRef.current, pomodorosCompleted, merged);
        }
    }, [settings, timerState, pomodorosCompleted, persist]);

    // ─── Formatting ─────────────────────────────────────────────────────────
    const minutes = Math.floor(timeLeftMs / 60000);
    const seconds = Math.floor((timeLeftMs % 60000) / 1000);
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    let progress = 0;
    if (timerState === "focus") {
        progress = 1 - (timeLeftMs / (settings.focusDuration * 60 * 1000));
    } else if (timerState === "short_break") {
        progress = 1 - (timeLeftMs / (settings.shortBreakDuration * 60 * 1000));
    } else if (timerState === "long_break") {
        progress = 1 - (timeLeftMs / (settings.longBreakDuration * 60 * 1000));
    }

    return {
        mounted,
        timerState,
        timeLeftMs,
        formattedTime,
        progress: Math.max(0, Math.min(1, progress)),
        isPaused: isPaused || (!isPaused && targetTimeRef.current === null && timerState !== "idle"),
        pomodorosCompleted,
        settings,
        start,
        pause,
        skip,
        stop,
        updateSettings,
    };
}
