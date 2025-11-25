const icon = document.querySelector('.icon');
const readerDiv = document.getElementById('reader');
const input = document.querySelector('.input');
const ticket = document.querySelector('.ticket');
const btnFermer = document.querySelector('.fermer');
let html5QrCode = null;
let isScanning = false;

function showReader() {
  const readerDiv = document.getElementById('reader');
  const btnFermer = document.querySelector('.fermer');
  const input = document.querySelector('.input');
  const beepSound = new Audio('/sounds/beep.mp3');

  readerDiv.style.display = 'block';
  btnFermer.style.display = 'block';

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('reader', {
      verbose: false,
    });
  }

  if (isScanning) return;
  isScanning = true;

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (!devices || devices.length === 0) {
        alert('🚫 لا توجد كاميرات متاحة. تأكد من منح الإذن!');
        isScanning = false;
        hideReader();
        return;
      }

      const backCamera =
        devices.find((device) => device.label.toLowerCase().includes('back')) || devices[0];

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.7778, // 16:9 مثالي للآيفون
        facingMode: { exact: 'environment' },
      };

      html5QrCode
        .start(
          { deviceId: { exact: backCamera.id } },
          config,
          (decodedText, decodedResult) => {
            beepSound.play();

            html5QrCode.stop().then(() => {
              html5QrCode.clear();
              input.value = decodedText;
              isScanning = false;
              hideReader();

              const searchButton = document.querySelector('.Subscribe-btn');
              if (searchButton) searchButton.click();
            });
          },
          (errorMessage) => {
            // يمكن تجاهل أخطاء القراءة المؤقتة
          }
        )
        .catch((err) => {
          console.error('📷 فشل بدء الكاميرا:', err);
          alert('📵 تعذر فتح الكاميرا. تأكد من منح الصلاحيات أو استخدام متصفح يدعم الكاميرا.');
          isScanning = false;
          hideReader();
        });
    })
    .catch((err) => {
      console.error('⚠️ خطأ في الحصول على الكاميرات:', err);
      alert('⚠️ تعذر الوصول إلى الكاميرات. قد تحتاج إلى تغيير المتصفح أو السماح بالوصول.');
      isScanning = false;
      hideReader();
    });
}

function stopReader() {
  const instance = window._qrCodeInstance;
  if (instance && instance._isScanning) {
    instance.stop().then(() => {
      instance.clear();
      delete window._qrCodeInstance;
      hideReader();
    });
  } else {
    hideReader();
  }
}

function hideReader() {
  readerDiv.style.display = 'none';
  btnFermer.style.display = 'none';
}

window.onload = function () {
  icon.addEventListener('click', showReader);
};

btnFermer.addEventListener('click', stopReader);

document.querySelector('.Subscribe-btn').addEventListener('click', () => {
  if (input.value === '') {
    hideReader();
  }
});

input.addEventListener('focus', hideReader);

document.querySelector('.Subscribe-btn').addEventListener('click', function () {
  const searchText = document.querySelector('input[name="text"]').value.trim().toLowerCase();

  if (!searchText) {
    showModalMessage('🛍️ من فضلك أدخل اسم المنتج أو رمزه قبل المتابعة!');
    return;
  }

  fetch(`/api/search?q=${encodeURIComponent(searchText)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('لم يتم العثور على المنتج');
      }
      document.querySelector('.ticket').style.display = 'block';
      document.querySelector('input').value = '';
      return response.json();
    })
    .then((products) => {
      if (!products || products.length === 0) {
        throw new Error('لم يتم العثور على المنتج');
      }
      const product = products[0];

      const ticketDiv = document.querySelector('.ticket');
      ticketDiv.innerHTML = `
       <div class="imgPromo">
      <img
        src="https://cdn.pixabay.com/photo/2022/09/23/09/13/promotion-7474039_1280.png"
        alt="promo"
      />
    </div>
    <h4><span>LIBELLE :</span> ${product.LIBELLE}</h4>
    <div class="date">Dernière mise à jour le :<span>${formatDate(product.createdAt)}</span></div>
    <div class="items">
      <div><span class="i1">GenCode</span><span class="i2"><i class="fa-solid fa-barcode"></i></span><span class="i3">${
        product.GENCOD_P
      }</span></div>
      <div><span class="i1">ANPF</span><span class="i2"><i class="fa-solid fa-qrcode"></i></span><span class="i3">${
        product.ANPF
      }</span></div>
      <div><span class="i1">Fourni</span><span class="i2"><i class="fa-solid fa-user-tie"></i></span><span class="i3">${
        product.FOURNISSEUR_P
      }</span></div>
      <div><span class="i1">ReF-Four</span><span class="i2"><i class="fa-solid fa-users-gear"></i></span><span class="i3">${
        product.REFFOUR_P
      }</span></div>
      <div><span class="i1">Stock</span><span class="i2"><i class="fa-solid
      fa-boxes-stacked"></i></span><span id="stk" class="i3">${product.STOCK}</span></div>
      <div><span class="i1">Status</span><span class="i2"><i class="fas fa-exclamation-triangle"></i></span><span class="i3" id="etatProduit" ></span></div>
    </div>
    <div class="total">
      <span class="i1">prix</span><span class="i3 i4"id="prixTotal">${product.PV_TTC} DH</span>
    </div>
    <div class="PrixPromo">
      <span class="i3 i4" id="promo">${product.PRIXVT} DH<i class="fa-solid fa-tag"></i></span>
    </div>
    <div class="footer">Dernière mise à jour il y a <span> ${daysSince(
      product.createdAt
    )}</span>jours</div>
`;
      let divPromo = document.querySelector('.PrixPromo');
      let prixPromo = document.querySelector('#promo');
      let prixTotal = document.querySelector('#prixTotal');
      let imgPromo = document.querySelector('.imgPromo');

      if (parseInt(prixPromo.textContent) === 0) {
        imgPromo.style.display = 'none';
        divPromo.style.display = 'none';
      } else {
        divPromo.style.display = 'block';
        imgPromo.style.display = 'block';
        prixTotal.classList.add('activePromo');
      }
      function daysSince(dateString) {
        const createdDate = new Date(dateString);
        const today = new Date();

        // حساب الفرق بالملي ثانية
        const diffTime = today - createdDate;

        // تحويل إلى أيام
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
      }

      function formatDate(dateString) {
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }

      const etatElement = document.getElementById('etatProduit');
      const libelle = product?.LIBELLE?.trim();

      if (etatElement && libelle) {
        if (/\[\s*GA\s*\]$/.test(libelle)) {
          etatElement.textContent = 'Produit Désactivé';
          etatElement.style.setProperty('background-color', 'orange', 'important');
          etatElement.style.setProperty('font-size', '16px', 'important');
          etatElement.style.setProperty('color', 'red', 'important');
        } else if (/\[\s*A\s*\]$/.test(libelle)) {
          etatElement.textContent = 'Produit Active';
          etatElement.style.setProperty('background-color', '#fff', 'important');
          etatElement.style.setProperty('font-size', '16px', 'important');
          etatElement.style.setProperty('color', 'green', 'important');
        }
      }

      const stockValue = parseInt(product.STOCK);
      const stockElement = document.getElementById('stk');

      if (stockValue <= 0) {
        stockElement.style.setProperty('background-color', 'red', 'important');
        stockElement.style.setProperty('color', 'white', 'important');
      } else if (stockValue > 0 && stockValue <= 20) {
        stockElement.style.setProperty('background-color', 'orange', 'important');
        stockElement.style.setProperty('color', 'white', 'important');
      } else if (stockValue > 20) {
        stockElement.style.setProperty('background-color', 'green', 'important');
        stockElement.style.setProperty('color', 'white', 'important');
      }
    })
    .catch((err) => {
      showModalMessage('🔍 لم نجد أي منتج مطابق لـ: ' + searchText);
      console.error('Erreur:', err);
    });
});

function showModalMessage(msg) {
  const modal = document.getElementById('modalMessage');
  const modalText = document.getElementById('modalText');
  modalText.textContent = msg;
  modal.style.display = 'flex';

  // زر الإغلاق
  const closeBtn = document.getElementById('modalCloseBtn');
  closeBtn.onclick = () => {
    modal.style.display = 'none';
    window.location.reload();
  };

  // إغلاق عند الضغط خارج المودال
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

// عندما تكتمل الصفحة وكل العناصر
window.addEventListener('load', function () {
  const loader = document.getElementById('wifi-loader');

  // إخفاء الـ Loader
  loader.style.display = 'none';
});

$('.menu-toggle').click(function () {
  $('.menu-toggle').toggleClass('open');
  $('.menu-round').toggleClass('open');
  $('.menu-line').toggleClass('open');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.error('SW registration failed:', err));
}