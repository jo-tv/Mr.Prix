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

$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});