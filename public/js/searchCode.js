JsBarcode('.barcode').init();

// عندما تكتمل الصفحة وكل العناصر
window.addEventListener('load', function () {
  const loader = document.getElementById('wifi-loader');

  // إخفاء الـ Loader
  loader.style.display = 'none';
});

document.querySelectorAll('.copy-btn').forEach((button) => {
  button.addEventListener('click', function () {
    const productCard = this.closest('.wsk-cp-product');

    const title = productCard.querySelector('.title-product h3').textContent.trim();
    const barcode = productCard.querySelector('.barcode').getAttribute('jsbarcode-value');

    const message = `🛍️ *Produit:* ${title}\n🆔 *Code:* ${barcode}`;
    const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, '_blank');
  });
});

const menuToggle = document.querySelector(".menu-toggle");
const menuRound = document.querySelector(".menu-round");
const menuLines = document.querySelectorAll(".menu-line");
const btnApp = document.querySelectorAll(".btn-app");
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("open");
    menuRound.classList.toggle("open");
    menuLines.forEach(line => line.classList.toggle("open"));

    btnApp.forEach(e => {
        e.classList.toggle("active");
    });
});
}