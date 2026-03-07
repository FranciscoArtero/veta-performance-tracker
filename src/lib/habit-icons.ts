import {
    Dumbbell,
    BookOpen,
    Brain,
    Droplets,
    Footprints,
    Target,
    PenLine,
    Moon,
    Salad,
    Music,
    Smartphone,
    Zap,
    Heart,
    Bike,
    Coffee,
    Flame,
    type LucideIcon,
} from "lucide-react";

/**
 * Mapping from legacy emoji icon strings → lucide icon components.
 * Used across dashboard, habit dialog, and day detail modal.
 */
export const HABIT_ICONS: { key: string; icon: LucideIcon; label: string }[] = [
    { key: "dumbbell", icon: Dumbbell, label: "Gym" },
    { key: "book", icon: BookOpen, label: "Leer" },
    { key: "brain", icon: Brain, label: "Meditar" },
    { key: "droplets", icon: Droplets, label: "Agua" },
    { key: "footprints", icon: Footprints, label: "Caminar" },
    { key: "target", icon: Target, label: "Meta" },
    { key: "pen", icon: PenLine, label: "Escribir" },
    { key: "moon", icon: Moon, label: "Dormir" },
    { key: "salad", icon: Salad, label: "Comer sano" },
    { key: "music", icon: Music, label: "Música" },
    { key: "smartphone", icon: Smartphone, label: "Screen" },
    { key: "zap", icon: Zap, label: "Energía" },
    { key: "heart", icon: Heart, label: "Salud" },
    { key: "bike", icon: Bike, label: "Bici" },
    { key: "coffee", icon: Coffee, label: "Café" },
    { key: "flame", icon: Flame, label: "Fuego" },
];

/** Emoji → icon key fallback map for existing data */
const EMOJI_TO_KEY: Record<string, string> = {
    "💪": "dumbbell",
    "📖": "book",
    "🧘": "brain",
    "💧": "droplets",
    "🏃": "footprints",
    "🎯": "target",
    "✍️": "pen",
    "💤": "moon",
    "🥗": "salad",
    "🧠": "brain",
    "🎵": "music",
    "📱": "smartphone",
};

/**
 * Resolve an icon key (or legacy emoji) to a LucideIcon component.
 * Returns the Target icon as fallback.
 */
export function resolveHabitIcon(iconKey: string): LucideIcon {
    // Try direct key match
    const byKey = HABIT_ICONS.find((i) => i.key === iconKey);
    if (byKey) return byKey.icon;

    // Try emoji fallback
    const mapped = EMOJI_TO_KEY[iconKey];
    if (mapped) {
        const byMapped = HABIT_ICONS.find((i) => i.key === mapped);
        if (byMapped) return byMapped.icon;
    }

    return Target; // fallback
}
