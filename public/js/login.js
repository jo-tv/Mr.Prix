
        
            document.addEventListener("DOMContentLoaded", () => {
                const form = document.getElementById("loginForm");
                const usernameInput = form.elements["username"];
                const passwordInput = form.elements["password"];
                const submitButton = form.querySelector('input[type="submit"]');

                const infoDiv = document.getElementById("infoBox");
                const messageBox = document.getElementById("messageBox");
                const closeBtn = document.getElementById("infoCloseBtn");

                const MAX_ATTEMPTS = 4;
                const BLOCK_MINUTES = 15;

                // عرض رسالة
                const showMessage = (message, color = "#f44336") => {
                    messageBox.textContent = message;
                    infoDiv.style.backgroundColor = color;
                    infoDiv.style.color = "white";
                    infoDiv.style.opacity = "1";
                };

                // إخفاء الرسالة
                const hideMessage = () => {
                    infoDiv.style.opacity = "0";
                };

                closeBtn.onclick = hideMessage;

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

                const getLoginState = () => {
                    const state = localStorage.getItem("loginState");
                    return state
                        ? JSON.parse(state)
                        : { attempts: 0, blockUntil: 0 };
                };

                const setLoginState = (attempts, blockUntil = 0) => {
                    localStorage.setItem(
                        "loginState",
                        JSON.stringify({ attempts, blockUntil })
                    );
                };

                const checkBlockStatus = () => {
                    const { attempts, blockUntil } = getLoginState();
                    const now = Date.now();

                    if (blockUntil && now < blockUntil) {
                        const remaining = Math.ceil((blockUntil - now) / 60000);
                        showMessage(
                            `تم حظرك مؤقتاً. الرجاء الانتظار ${remaining} دقيقة.`,
                            "#ff9800"
                        );
                        disableForm();
                        setTimeout(checkBlockStatus, 60000); // إعادة التحقق كل دقيقة
                    } else {
                        enableForm();
                        hideMessage();
                        setLoginState(0); // إعادة المحاولات
                    }
                };

                form.addEventListener("submit", async e => {
                    e.preventDefault();

                    const { attempts, blockUntil } = getLoginState();
                    const now = Date.now();

                    if (blockUntil && now < blockUntil) {
                        showMessage(
                            `أنت محظور مؤقتًا. الرجاء الانتظار.`,
                            "#ff9800"
                        );
                        return;
                    }

                    const username = usernameInput.value.trim();
                    const password = passwordInput.value.trim();

                    try {
                        const res = await fetch("/login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username, password })
                        });

                        if (res.ok) {
                            localStorage.removeItem("loginState");
                            const result = await res.json();

                            showMessage("تم تسجيل الدخول بنجاح", "#4CAF50");

                            // إعادة التوجيه حسب الدور
                            const roleRes = await fetch("/get-role");
                            const user = await roleRes.json();

                            setTimeout(() => {
                                if (user.role === "vendeur") {
                                    window.location.href = "/prixVen";
                                } else if (user.role === "responsable") {
                                    window.location.href = "/prix";
                                }
                            }, 1000);
                        } else {
                            const message = await res.text();
                            const newAttempts = attempts + 1;

                            if (newAttempts >= MAX_ATTEMPTS) {
                                const newBlockUntil =
                                    Date.now() + BLOCK_MINUTES * 60 * 1000;
                                setLoginState(newAttempts, newBlockUntil);
                                showMessage(
                                    `تم تجاوز عدد المحاولات. الرجاء الانتظار ${BLOCK_MINUTES} دقيقة.`,
                                    "#ff9800"
                                );
                                disableForm();
                                setTimeout(checkBlockStatus, 60000);
                            } else {
                                setLoginState(newAttempts);
                                showMessage(
                                    `بيانات غير صحيحة. المحاولة (${newAttempts}/${MAX_ATTEMPTS})`
                                );
                            }
                        }
                    } catch (err) {
                        console.error(err);
                        showMessage("فشل الاتصال بالخادم. حاول لاحقاً.");
                    }
                });

                // رسالة منع التسجيل
                document.getElementById("signupLink").onclick = e => {
                    e.preventDefault();
                    showMessage(
                        "لا يمكنك التسجيل حالياً، المرجو التواصل معنا",
                        "#2196F3"
                    );
                };

                // رسالة كلمة المرور غير مفعلة
                document.getElementById("forgetPasswordLink").onclick = e => {
                    e.preventDefault();
                    showMessage("هذه الخاصية غير مفعلة حالياً.", "#2196F3");
                };

                checkBlockStatus();
            });

            // عندما تكتمل الصفحة وكل العناصر
            window.addEventListener("load", function () {
                const loader = document.getElementById("wifi-loader");

                // إخفاء الـ Loader
                loader.style.display = "none";
            });
        