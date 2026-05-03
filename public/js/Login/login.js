document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // ⚙️ إعدادات
    // =========================
    const MAX_ATTEMPTS = 4;

    // =========================
    // 🎯 العناصر
    // =========================
    const form = document.getElementById("loginForm");
    const usernameInput = form.elements["username"];
    const passwordInput = form.elements["password"];
    const submitButton = document.getElementById("submit");

    const infoDiv = document.getElementById("infoBox");
    const messageBox = document.getElementById("messageBox");

    let timer = null;

    // =========================
    // 💬 UI
    // =========================
    const showMessage = (message, color = "#f44336") => {
        messageBox.textContent = message;
        infoDiv.style.backgroundColor = color;
        infoDiv.style.opacity = "1";
        infoDiv.style.color = "#fff";
    };

    const hideMessage = () => {
        infoDiv.style.opacity = "0";
    };

    const disableForm = () => {
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        submitButton.disabled = true;
    };

    const enableForm = () => {
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        submitButton.disabled = false;
    };

    // =========================
    // 💾 STORAGE (موحد)
    // =========================
    const getState = () => {
        return (
            JSON.parse(localStorage.getItem("authState")) || {
                attempts: 0,
                blockUntil: 0
            }
        );
    };

    const setState = (attempts = 0, blockUntil = 0) => {
        localStorage.setItem(
            "authState",
            JSON.stringify({ attempts, blockUntil })
        );
    };

    const clearState = () => {
        localStorage.removeItem("authState");
    };

    // =========================
    // 🔒 BLOCK SYSTEM
    // =========================
    const lockForm = (minutes, message) => {
        const blockUntil = Date.now() + minutes * 60 * 1000;

        setState(0, blockUntil);

        showMessage(message, "#ff9800");
        disableForm();

        startTimer();
    };

    const startTimer = () => {
        if (timer) clearTimeout(timer);

        const state = getState();
        const now = Date.now();

        if (state.blockUntil && now < state.blockUntil) {
            const remaining = state.blockUntil - now;

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            showMessage(
                `🚫 تم حظر الوصول. الوقت المتبقي: ${minutes} دقيقة و ${seconds} ثانية`,
                "#ff9800"
            );

            disableForm();

            timer = setTimeout(startTimer, 1000);
        } else {
            clearState();
            enableForm();
            hideMessage();
        }
    };

    // =========================
    // 🔐 LOGIN
    // =========================
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const state = getState();

        // 🔒 إذا محظور
        if (state.blockUntil && Date.now() < state.blockUntil) {
            startTimer();
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();

            // =========================
            // Canvas Fingerprint
            // =========================
            function canvasFP() {
                try {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    ctx.textBaseline = "top";
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#f60";
                    ctx.fillRect(0, 0, 100, 50);

                    ctx.fillStyle = "#069";
                    ctx.fillText("FingerprintJS-Canvas", 2, 2);

                    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
                    ctx.fillText("DeviceCheck", 4, 20);

                    return canvas.toDataURL();
                } catch (e) {
                    return "canvas-error";
                }
            }

            // =========================
            // SHA-256 HASH
            // =========================
            async function sha256(str) {
                const buffer = new TextEncoder().encode(str);
                const hash = await crypto.subtle.digest("SHA-256", buffer);
                return [...new Uint8Array(hash)]
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");
            }

            // =========================
            // Extra signals
            // =========================
            const extra = {
                lang: navigator.language,
                cores: navigator.hardwareConcurrency,
                memory: navigator.deviceMemory || 0,
                screen: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                canvas: canvasFP()
            };

            // =========================
            // Build raw fingerprint
            // =========================
            const rawString = JSON.stringify({
                fp: result.visitorId,
                ...extra
            });

            // =========================
            // Strong Device ID
            // =========================
            const deviceId = await sha256(rawString);

            console.log("Strong Device ID:", deviceId);

            // =========================
            // LOGIN REQUEST
            // =========================
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, deviceId })
            });

            const data = await res.json();
            const status = data.status;

            // =========================
            // ❌ NEW DEVICE
            // =========================
            if (status === "new_device") {
                lockForm(
                    2,
                    "📱 الدخول غير مسموح من هذا الجهاز. اتصل بالإدارة."
                );

                const phone = "212601862102";

                const msg = encodeURIComponent(
                    `🔔 *إشعار نظام التسجيل*
---------------------------------
👤 الاسم:
📱 المعرّف: ${data.deviceId}
🔄 الحالة: #قيد_المراجعة
----------------------------------`
                );

                const intentUrl = `intent://send?phone=${phone}&text=${msg}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
                const webUrl = `https://wa.me/${phone}?text=${msg}`;

                window.location.href = intentUrl;

                setTimeout(() => {
                    window.location.href = webUrl;
                }, 1500);

                return;
            }

            // =========================
            // ❌ WRONG CREDENTIALS
            // =========================
            if (status === "wrong_credentials" || status === "user_not_found") {
                const newAttempts = state.attempts + 1;

                if (newAttempts >= MAX_ATTEMPTS) {
                    lockForm(
                        20,
                        "🚫 تجاوزت الحد المسموح من المحاولات. الحساب محظور لمدة 20 دقيقة."
                    );
                } else {
                    setState(newAttempts, 0);
                    showMessage(
                        `❌ الحد مسموح به (${newAttempts}/${MAX_ATTEMPTS})`,
                        "#f44336"
                    );
                }

                return;
            }

            // =========================
            // ❌ BLOCKED
            // =========================
            if (status === "blocked") {
                lockForm(20, "🚫 تم تقييد الوصول: صلاحيات غير كافية");
                return;
            }

            // =========================
            // ✅ SUCCESS
            // =========================
            if (status === "ok") {
                clearState();

                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }

                enableForm();
                hideMessage();

                showMessage("✅ تم تسجيل الدخول بنجاح", "#4CAF50");

                setTimeout(() => {
                    window.location.href =
                        data.role === "vendeur" ? "/prixVen" : "/prix";
                }, 800);

                return;
            }

            // =========================
            // ERROR
            // =========================
            showMessage("❌ Erreur serveur", "#f44336");
        } catch (err) {
            console.error(err);
            showMessage("❌ خطأ في الاتصال");
        }
    });

    // =========================
    // 🚀 INIT
    // =========================
    startTimer();
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(() => console.log("Service Worker registered"))
            .catch(err => console.error("SW registration failed:", err));
    }
});
