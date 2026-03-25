// Hydration Smart Notification Worker Extension
// This code is appended to the service worker by next-pwa's customWorkerSrc

// Listen for hydration check messages from the client
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "CHECK_HYDRATION") {
        checkHydrationStatus();
    }
});

// Periodic check — triggered via setInterval from the client page
async function checkHydrationStatus() {
    try {
        const response = await fetch("/api/hydration/status");
        if (!response.ok) return;

        const data = await response.json();

        if (data.enabled && data.isBehind) {
            const remaining = data.goalMl - data.totalMl;
            await self.registration.showNotification("💧 ¡Hora de hidratarte!", {
                body: `Llevas ${data.totalMl}ml de ${data.goalMl}ml. Te faltan ${remaining}ml para tu objetivo.`,
                icon: "/icon.svg",
                badge: "/icon.svg",
                tag: "hydration-reminder",
                renotify: false,
                data: { url: "/" },
            });
        }
    } catch (e) {
        // Silently fail — network may be unavailable
    }
}

// Handle notification click — navigate to dashboard
self.addEventListener("notificationclick", (event) => {
    if (event.notification.tag === "hydration-reminder") {
        event.notification.close();
        event.waitUntil(
            self.clients.matchAll({ type: "window" }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes("/") && "focus" in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow("/");
                }
            })
        );
    }
});
