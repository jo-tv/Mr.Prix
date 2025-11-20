// JS - حركة الصور + منع النسخ واللقطات
"use strict";

window.onload = () => {
    const gallery = document.querySelector("#gallery");
    const animTime = 3000;
    let throttle = false;

    function animateGallery() {
        if (!gallery.classList.contains("active")) {
            gallery.classList.add("active");
            setTimeout(() => gallery.classList.remove("active"), animTime);
        }
    }

    document.addEventListener("scroll", () => {
        if (!throttle) {
            animateGallery();
            throttle = true;
            setTimeout(() => (throttle = false), 2000);
        }
    });

    window.addEventListener("resize", animateGallery);
    animateGallery();
};

// منع النسخ واللقطة
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && ["s", "u", "c", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        alert("غير مسموح بذلك!");
    }

    if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
        alert("تم منع لقطة الشاشة!");
        const black = document.createElement("div");
        black.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: black; z-index: 9999;
        `;
        document.body.appendChild(black);
        setTimeout(() => document.body.removeChild(black), 800);
    }
});

// عندما تكتمل الصفحة وكل العناصر
window.addEventListener("load", function () {
    const loader = document.getElementById("wifi-loader");

    // إخفاء الـ Loader
    loader.style.display = "none";
});

$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});