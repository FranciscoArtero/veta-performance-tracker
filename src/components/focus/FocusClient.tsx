"use client";

import { useFocusTimer } from "@/hooks/useFocusTimer";
import { Play, Pause, SkipForward, Settings2, Moon, CloudRain, Waves, Target, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState, useRef, useTransition } from "react";
import { toggleTask } from "@/app/actions/tasks";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Reliable Wikimedia Commons URLs for ambient noise
const AMBIENT_SOUNDS = {
    none: "",
    rain: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Rain_sound.ogg",
    noise: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Brown_noise.ogg",
};

type AmbientType = keyof typeof AMBIENT_SOUNDS;

type TaskItem = { id: string; title: string; completed: boolean };

export default function FocusClient({ initialTasks = [] }: { initialTasks?: TaskItem[] }) {
    const timer = useFocusTimer();
    const [ambient, setAmbient] = useState<AmbientType>("none");
    const [volume, setVolume] = useState(0.5);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Task Linking
    const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
    const pendingTasks = tasks.filter(t => !t.completed);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [showTaskPrompt, setShowTaskPrompt] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Track state transitions for prompt
    const [prevTimerState, setPrevTimerState] = useState(timer.timerState);

    // Synchronous Audio Handler (Browser requires user interaction to play audio)
    const handleAmbientChange = (type: AmbientType) => {
        setAmbient(type);

        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
        }

        const audio = audioRef.current;

        if (type === "none") {
            audio.pause();
        } else {
            // Only update src if changed
            if (audio.src !== AMBIENT_SOUNDS[type]) {
                audio.src = AMBIENT_SOUNDS[type];
            }
            audio.volume = volume;

            if (timer.isPaused && timer.timerState !== "idle") {
                audio.pause();
            } else {
                audio.play().catch(console.warn);
            }
        }
    };

    // Timer Auto-Pause/Play audio sync effect
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || ambient === "none") return;

        if (timer.isPaused && timer.timerState !== "idle") {
            audio.pause();
        } else {
            audio.play().catch(console.warn);
        }
    }, [timer.timerState, timer.isPaused, ambient]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    // Timer Transition Effect for Task Prompt
    useEffect(() => {
        if (prevTimerState === "focus" && timer.timerState !== "focus") {
            // A focus session just finished
            if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)?.completed) {
                setShowTaskPrompt(true);
            }
        }
        setPrevTimerState(timer.timerState);
    }, [timer.timerState, prevTimerState, selectedTaskId, tasks]);

    const handleTaskCompletion = (completed: boolean) => {
        setShowTaskPrompt(false);
        if (completed && selectedTaskId) {
            // Optimistically update
            setTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, completed: true } : t));
            setSelectedTaskId(null);
            startTransition(async () => {
                await toggleTask(selectedTaskId);
            });
        }
    };

    if (!timer.mounted) return <div className="min-h-screen bg-zinc-950" />;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
            {/* Minimal Header */}
            <header className="flex h-16 items-center justify-between px-6 lg:px-12 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Moon className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="font-medium tracking-wide text-zinc-300">Sanctuary</span>
                </div>

                {/* Settings Trigger */}
                <Dialog>
                    <DialogTrigger asChild>
                        <button title="Ajustes de Focus" className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 bg-white/5 transition-all text-zinc-300">
                            <Settings2 className="h-5 w-5" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border border-white/10 text-zinc-100 sm:max-w-[480px] rounded-2xl p-0 overflow-hidden shadow-2xl">
                        <div className="p-6 bg-white/5 border-b border-white/5">
                            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-zinc-400" />
                                Configuración de Sanctuary
                            </DialogTitle>
                        </div>
                        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-zinc-300">Tiempo de Focus</label>
                                    <span className="text-xs text-zinc-500 font-mono">{timer.settings.focusDuration} min</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={120}
                                    step={5}
                                    value={timer.settings.focusDuration}
                                    onChange={(e) => timer.updateSettings({ focusDuration: Number(e.target.value) })}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                />
                                <div className="flex justify-between text-xs text-zinc-600 font-medium">
                                    <span>5m</span>
                                    <span>60m</span>
                                    <span>120m</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-zinc-300">Descanso Corto</label>
                                    <span className="text-xs text-zinc-500 font-mono">{timer.settings.shortBreakDuration} min</span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    step={1}
                                    value={timer.settings.shortBreakDuration}
                                    onChange={(e) => timer.updateSettings({ shortBreakDuration: Number(e.target.value) })}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-zinc-300">Descanso Largo</label>
                                    <span className="text-xs text-zinc-500 font-mono">{timer.settings.longBreakDuration} min</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={60}
                                    step={5}
                                    value={timer.settings.longBreakDuration}
                                    onChange={(e) => timer.updateSettings({ longBreakDuration: Number(e.target.value) })}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Main Timer Display */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20 relative overflow-hidden">
                {/* Background ambient glow based on state */}
                <div
                    className="absolute inset-0 opacity-20 transition-colors duration-1000"
                    style={{
                        background: timer.timerState === "focus"
                            ? "radial-gradient(circle at center, rgba(167,139,250,0.15) 0%, transparent 60%)" // violet
                            : timer.timerState === "short_break"
                                ? "radial-gradient(circle at center, rgba(52,211,153,0.15) 0%, transparent 60%)" // emerald
                                : timer.timerState === "long_break"
                                    ? "radial-gradient(circle at center, rgba(96,165,250,0.15) 0%, transparent 60%)" // blue
                                    : "transparent"
                    }}
                />

                <div className="relative z-10 flex flex-col items-center">
                    {/* Status Badge */}
                    <div className="mb-8 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-xs font-medium tracking-widest uppercase text-zinc-400">
                            {timer.timerState === "idle" ? "Listo para empezar"
                                : timer.timerState === "focus" ? "Enfoque Profundo"
                                    : timer.timerState === "short_break" ? "Recreo Corto"
                                        : "Recreo Largo"}
                        </span>
                    </div>

                    {/* Task Selector */}
                    {timer.timerState === "idle" && (
                        <div className="mb-4">
                            <select
                                title="Seleccionar tarea"
                                value={selectedTaskId || ""}
                                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                                className="bg-zinc-900/50 border border-white/10 rounded-full px-5 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500 hover:bg-white/10 transition-all appearance-none cursor-pointer text-center max-w-[250px] truncate shadow-lg"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-400">Sin tarea vinculada</option>
                                {pendingTasks.map(t => (
                                    <option key={t.id} value={t.id} className="bg-zinc-900 text-zinc-100">
                                        Vincular: {t.title}
                                    </option>
                                ))}
                                {pendingTasks.length === 0 && (
                                    <option disabled className="bg-zinc-900 text-zinc-500">No hay tareas pendientes</option>
                                )}
                            </select>
                        </div>
                    )}
                    {timer.timerState !== "idle" && selectedTaskId && (
                        <div className="mb-4 flex items-center gap-2 text-zinc-400 text-sm">
                            <Target className="h-4 w-4 text-violet-500" />
                            <span className="truncate max-w-[200px]">
                                {tasks.find(t => t.id === selectedTaskId)?.title}
                            </span>
                        </div>
                    )}

                    {/* Giant Clock */}
                    {/* Using tabular-nums ensures digits do not shift width during countdown */}
                    <h1 className="text-[120px] md:text-[180px] font-light tracking-tighter tabular-nums leading-none">
                        {timer.formattedTime}
                    </h1>

                    {/* Progress Bar under clock */}
                    <div className="w-64 h-1 bg-zinc-900 rounded-full mt-8 overflow-hidden relative">
                        <div
                            className="absolute inset-y-0 left-0 bg-zinc-400 transition-all duration-1000 ease-linear rounded-full"
                            style={{ width: `${timer.progress * 100}%` }}
                        />
                    </div>

                    <p className="mt-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                        Sesiones Completadas: {timer.pomodorosCompleted}
                    </p>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-6 mt-16">
                        {timer.timerState === "idle" || timer.isPaused ? (
                            <button
                                title="Iniciar"
                                onClick={timer.start}
                                className="h-16 w-16 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                            >
                                <Play className="h-6 w-6 ml-1" fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                title="Pausar"
                                onClick={timer.pause}
                                className="h-16 w-16 rounded-full border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-800 active:scale-95 transition-all"
                            >
                                <Pause className="h-6 w-6" fill="currentColor" />
                            </button>
                        )}

                        {timer.timerState !== "idle" && (
                            <button
                                title="Saltar etapa"
                                onClick={timer.skip}
                                className="h-12 w-12 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                <SkipForward className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Ambient Sound Controls (Bottom pinned) */}
                <div className="absolute bottom-12 z-20 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-md">
                        <button
                            onClick={() => handleAmbientChange("none")}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${ambient === "none" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                        >
                            Off
                        </button>
                        <button
                            onClick={() => handleAmbientChange("rain")}
                            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all ${ambient === "rain" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                        >
                            <CloudRain className="h-3 w-3" /> Lluvia
                        </button>
                        <button
                            onClick={() => handleAmbientChange("noise")}
                            className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all ${ambient === "noise" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                        >
                            <Waves className="h-3 w-3" /> Ruido Blanco
                        </button>
                    </div>

                    {ambient !== "none" && (
                        <input
                            title="Volumen ambiental"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-32 hover:opacity-100 opacity-50 transition-opacity accent-zinc-500"
                        />
                    )}
                </div>

                {/* Task Completion Prompt Overlay */}
                {showTaskPrompt && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                            <Target className="h-8 w-8 text-violet-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-zinc-100 mb-2">¡Tiempo terminado!</h3>
                            <p className="text-sm text-zinc-400 mb-6">¿Pudiste completar la tarea: <span className="text-zinc-200 font-medium">&quot;{tasks.find(t => t.id === selectedTaskId)?.title}&quot;</span>?</p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleTaskCompletion(false)}
                                    disabled={isPending}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-zinc-200 transition-smooth"
                                >
                                    <XCircle className="h-4 w-4" /> Aún no
                                </button>
                                <button
                                    onClick={() => handleTaskCompletion(true)}
                                    disabled={isPending}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm text-zinc-950 bg-violet-400 hover:bg-violet-300 transition-smooth"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> Completada
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
