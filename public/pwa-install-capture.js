(function () {
  window.__coreDeferredPrompt = window.__coreDeferredPrompt || null;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__coreDeferredPrompt = event;
    window.dispatchEvent(new Event("core:pwa-install-ready"));
  });

  window.addEventListener("appinstalled", function () {
    window.__coreDeferredPrompt = null;
    window.dispatchEvent(new Event("core:pwa-installed"));
  });
})();
