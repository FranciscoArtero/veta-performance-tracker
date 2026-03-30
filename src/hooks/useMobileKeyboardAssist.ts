"use client";

import { useCallback, useEffect } from "react";

function isFocusableInput(element: Element | null): element is HTMLElement {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable) return true;
    const tag = element.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function getKeyboardInset() {
    if (typeof window === "undefined" || !window.visualViewport) return 0;
    const viewport = window.visualViewport;
    return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

export function useMobileKeyboardAssist() {
    const ensureVisible = useCallback((target?: HTMLElement | null) => {
        if (typeof window === "undefined") return;
        const element = target || (document.activeElement as HTMLElement | null);
        if (!isFocusableInput(element)) return;

        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const keyboardInset = getKeyboardInset();
        const safeBottom = viewportHeight - Math.max(12, keyboardInset * 0.12);
        const rect = element.getBoundingClientRect();

        if (rect.bottom > safeBottom || rect.top < 8) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
        }
    }, []);

    const dismissKeyboard = useCallback(() => {
        if (typeof document === "undefined") return;
        const active = document.activeElement;
        if (isFocusableInput(active)) {
            active.blur();
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
        if (!isTouchDevice) return;

        const onFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (!isFocusableInput(target)) return;
            window.setTimeout(() => ensureVisible(target), 30);
            window.setTimeout(() => ensureVisible(target), 180);
        };

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest("input, textarea, select, [contenteditable='true']")) return;
            dismissKeyboard();
        };

        const onViewportChange = () => ensureVisible();

        document.addEventListener("focusin", onFocusIn, true);
        document.addEventListener("pointerdown", onPointerDown, true);
        window.visualViewport?.addEventListener("resize", onViewportChange);
        window.visualViewport?.addEventListener("scroll", onViewportChange);

        return () => {
            document.removeEventListener("focusin", onFocusIn, true);
            document.removeEventListener("pointerdown", onPointerDown, true);
            window.visualViewport?.removeEventListener("resize", onViewportChange);
            window.visualViewport?.removeEventListener("scroll", onViewportChange);
        };
    }, [dismissKeyboard, ensureVisible]);

    return { ensureVisible, dismissKeyboard };
}
