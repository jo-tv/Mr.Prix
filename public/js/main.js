const icon = document.querySelector(".icon");
const readerDiv = document.getElementById("reader");
const input = document.querySelector(".input");
const ticket = document.querySelector(".ticket");
const btnFermer = document.querySelector(".fermer");
window.onload = function () {
    icon.addEventListener("click", () => {
        btnFermer.style.display = "block";
        readerDiv.style.display = "block";

        const html5QrCode = new Html5Qrcode("reader");

        html5QrCode
            .start(
                { facingMode: "environment" }, // كاميرا خلفية
                { fps: 10, qrbox: 250 },
                qrCodeMessage => {
                    input.value = qrCodeMessage;
                    html5QrCode.stop().then(() => {
                        readerDiv.style.display = "none";
                    });
                },
                errorMessage => {
                    // تجاهل الأخطاء المؤقتة
                }
            )
            .catch(err => {
                console.error("فشل بدء الكاميرا:", err);
            });
    });
};

document.querySelector(".Subscribe-btn").addEventListener("click", () => {
    if (input.value === "") {
        btnFermer.style.display = "none";
    }
});

document.querySelector("input").addEventListener("focus", () => {
    if (readerDiv) {
        readerDiv.style.display = "none";
        btnFermer.style.display = "none";
    }
});

btnFermer.addEventListener("click", () => {
    readerDiv.style.display = "none";
    btnFermer.style.display = "none";
});
