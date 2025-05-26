/*!
Swaying photo gallery - scroll event
Created on AUGUST 29, 2023
Copyright (c) 2023 by Wakana Y.K. (https://codepen.io/wakana-k/pen/WNLrWMm)
*/
/*
Related works : 
Portforio design @wakana-k - https://codepen.io/wakana-k/pen/BaxKKvE
Swaying photo gallery - hover event @wakana-k - https://codepen.io/wakana-k/pen/oNJxbPw
*/
"use strict";
(function () {
    window.onload = () => {
        const obj = document.querySelector("#gallery");
        const time = 10000;
        function animStart() {
            if (obj.classList.contains("active") == false) {
                obj.classList.add("active");
                setTimeout(() => {
                    animEnd();
                }, time);
            }
        }
        function animEnd() {
            obj.classList.remove("active");
            obj.offsetWidth;
        }
        document.addEventListener("scroll", function () {
            // scroll or scrollend
            animStart();
        });
        window.addEventListener("resize", animStart);
        animStart();
    };
})();


    // منع مفاتيح النسخ واللقطة
    function blockKeys(e) {
      // اختصارات Ctrl+S, Ctrl+U, Ctrl+C, Ctrl+P
      if ((e.ctrlKey && ['s', 'u', 'c', 'p'].includes(e.key.toLowerCase())) || 
          e.key === 'PrintScreen') {
        alert("غير مسموح بذلك!");
        return false;
      }
    }

    // محاولة حذف لقطة الشاشة بوضع شاشة سوداء مؤقتة
    document.addEventListener('keyup', function (e) {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        alert("تم منع لقطة الشاشة!");
      }
    });

    // إظهار شاشة سوداء مؤقتة أثناء الضغط على PrtSc
    window.addEventListener('keydown', function (e) {
      if (e.key === 'PrintScreen') {
        let black = document.createElement("div");
        black.style.position = "fixed";
        black.style.top = "0";
        black.style.left = "0";
        black.style.width = "100vw";
        black.style.height = "100vh";
        black.style.background = "black";
        black.style.zIndex = "9999";
        document.body.appendChild(black);
        setTimeout(() => {
          document.body.removeChild(black);
        }, 1000);
      }
    });
    
    
   