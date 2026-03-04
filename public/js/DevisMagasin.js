
/* ===================================== */
/*   DEVlS MAGASIN - SYSTEM SCRIPT       */
/* ===================================== */

let produitActuel = null;
let panier = JSON.parse(localStorage.getItem("panier")) || [];
const TAUX_TVA = 20;
/* ===================================== */
/*  INIT                                 */
/* ===================================== */

document.addEventListener("DOMContentLoaded", function () {
  const btnRecherche = document.getElementById("btnRecherche");
  const btnAjouter = document.querySelector(
    ".article-form .add-btn:last-of-type"
  );

  if (btnRecherche) {
    btnRecherche.addEventListener("click", getProduit);
  }

  if (btnAjouter) {
    btnAjouter.addEventListener("click", ajouterAuTableau);
  }

  afficherPanier();
});

/* ===================================== */
/*  GET PRODUIT                          */
/* ===================================== */

async function getProduit() {
  const code = document.getElementById("code").value.trim();
  if (!code) return alert("Entrer un code");

  try {
    const response = await fetch(`/api/produit/${code}`);

    if (!response.ok) throw new Error("Produit non trouvé");

    const data = await response.json();

    produitActuel = data;


    remplirForm(data);
  } catch (err) {
    alert(err.message);

  }
}

/* ===================================== */
/*  REMPLIR FORM                         */
/* ===================================== */

function remplirForm(data) {
  let libelleClean = data.libelle.replace(/\s*\[[^\]]*\]\s*/g, '').trim();

  let PrixTotal = data.prixPro <= 0 || data.prixPro == "" ? data.prix : data.prixPro
  document.getElementById("anpf").value = data.anpf || "";
  document.getElementById("libelle").value = libelleClean || "";
  document.getElementById("qte").value = 1;
  document.getElementById("prix").value = PrixTotal || 0;
  document.getElementById("taxe").value = data.taxe || 0;
}

/* ===================================== */
/*  AJOUTER AU PANIER                    */
/* ===================================== */

function ajouterAuTableau() {
  if (!produitActuel) {
    return;
  }

  const code = document.getElementById("code").value;
  const anpf = document.getElementById("anpf").value;
  const libelle = document.getElementById("libelle").value;
  const qte = parseFloat(document.getElementById("qte").value);
  const prix = parseFloat(document.getElementById("prix").value);
  const taxe =
    parseFloat(document.getElementById("taxe").value) || 0;

  if (!qte || qte <= 0) {
    alert("Quantité invalide");
    return;
  }

  const exist = panier.find(p => p.code === code);

  if (exist) {
    exist.qte += qte;
  } else {
    panier.push({
      code,
      anpf,
      libelle,
      qte,
      prix,
      taxe

    });
  }

  sauvegarder();
  afficherPanier();
  resetForm();
}

/* ===================================== */
/*  AFFICHER PANIER                      */
/* ===================================== */

function afficherPanier() {
  const tbody = document.getElementById("articleTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  panier.forEach((item, index) => {
    const total = item.qte * item.prix;

    tbody.innerHTML += `
            <tr>
                <td>${item.anpf}</td>
                <td style="text-align: left">${item.libelle}</td>
                <td></td>
                <td>${item.qte}</td>
                <td>${item.prix.toFixed(2)}</td>
                <td>${total.toFixed(3)}</td>
                <td id="sup">
                    <button onclick="supprimer(${index})">❌</button>
                </td>
            </tr>
        `;
  });

  calculerTotaux();
}

/* ===================================== */
/*  SUPPRIMER                            */
/* ===================================== */

function supprimer(index) {
  panier.splice(index, 1);
  sauvegarder();
  afficherPanier();
}

/* ===================================== */
/*  CALCULER TOTAUX                      */
/* ===================================== */

function calculerTotaux() {

  let totalTTC = 0;
  let totalHT = 0;
  let totalTVA = 0;

  panier.forEach(item => {

    const qte = Number(item.qte) || 0;
    const prixTTC = Number(item.prix) || 0;

    const ligneTTC = qte * prixTTC;
    const ligneHT = ligneTTC / (1 + TAUX_TVA / 100);
    const ligneTVA = ligneTTC - ligneHT;

    totalTTC += ligneTTC;
    totalHT += ligneHT;
    totalTVA += ligneTVA;

  });

  document.getElementById("montantHT").textContent = totalHT.toFixed(3);
  document.getElementById("montantTVA").textContent = totalTVA.toFixed(3);
  document.getElementById("totalTTC").textContent = totalTTC.toFixed(3);
  document.getElementById("totalHT2").textContent = totalHT.toFixed(3);
  document.getElementById("tauxTVA").textContent = TAUX_TVA.toFixed(2);
}

/* ===================================== */
/*  RESET FORM                           */
/* ===================================== */

function resetForm() {
  document.getElementById("code").value = "";
  document.getElementById("anpf").value = "";
  document.getElementById("libelle").value = "";
  document.getElementById("qte").value = "";
  document.getElementById("prix").value = "";
  document.getElementById("taxe").value = "";
  produitActuel = null;
}

/* ===================================== */
/* function date                  */
/* ===================================== */
function getFormattedDate() {
  return new Date().toLocaleDateString("fr-FR");
}

document.getElementById("date").innerHTML = getFormattedDate()

/* ===================================== */
/*  SAVE LOCAL STORAGE                   */
/* ===================================== */

function sauvegarder() {
  localStorage.setItem("panier", JSON.stringify(panier));
}


/* ===================================== */
/* ACTION BUTTONS                        */
/* ===================================== */

document.addEventListener("DOMContentLoaded", function () {

  const btnPrint = document.getElementById("btnPrint");
  const btnPDF = document.getElementById("btnPDF");
  const btnScan = document.getElementById("btnScan");
  const btnClear = document.getElementById("btnClear");

  if (btnPrint) {
    btnPrint.addEventListener("click", () => window.print());
  }

  if (btnPDF) {
    btnPDF.addEventListener("click", downloadPDF);
  }

  if (btnScan) {
    btnScan.addEventListener("click", showReader);
  }

  if (btnClear) {
    btnClear.addEventListener("click", viderPanier);
  }

});


async function downloadPDF() {
  // 1️⃣ إخفاء جميع أزرار الحذف في الجدول
  const deleteButtons = document.querySelectorAll("#sup"); // ضع كل أزرار الحذف class="delete-btn"
  deleteButtons.forEach(btn => (btn.style.display = "none"));

  // 2️⃣ تحميل PDF
  const devis = document.getElementById("devisContent");
  if (!devis) return alert("Contenu Devis introuvable");

  const canvas = await html2canvas(devis, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    scrollY: -window.scrollY
  });

  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  const imgProps = { width: canvas.width, height: canvas.height };
  const ratio = (pageWidth - 2 * margin) / imgProps.width;
  const imgWidth = imgProps.width * ratio;
  const imgHeight = imgProps.height * ratio;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 2 * margin;

  while (heightLeft > 0) {
    pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      position - (imgHeight - heightLeft),
      imgWidth,
      imgHeight
    );
    heightLeft -= pageHeight - 2 * margin;
  }

  // 3️⃣ تحميل PDF
  pdf.save("devis.pdf");

  // 4️⃣ إعادة ظهور أزرار الحذف بعد التحويل
  deleteButtons.forEach(btn => (btn.style.display = "inline-block"));
}

function viderPanier() {

  if (!confirm("Voulez-vous vraiment vider le panier ?")) return;

  localStorage.removeItem("panier");
  panier = [];
  afficherPanier();
}

// code scripte scanner code-bare---------->

const scaner = document.getElementById("scan-btn");
const readerDiv = document.getElementById("reader");
const btnFermer = document.querySelector(".fermer");
const containerScan = document.querySelector(".container-scan");
const refInput = document.querySelector(".Ref");

let html5QrCode = null;
let isScanning = false;

function showReader() {

  const readerDiv = document.getElementById("reader");
  const btnFermer = document.querySelector(".fermer");
  const beepSound = new Audio("/sounds/beep.mp3");

  readerDiv.style.display = "block";
  btnFermer.style.display = "block";
  containerScan.style.zIndex = "9999999";

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader", {
      verbose: false
    });
  }

  if (isScanning) return;
  isScanning = true;

  Html5Qrcode.getCameras()
    .then(devices => {
      if (!devices || devices.length === 0) {
        alert(
          "🚫 لا توجد كاميرات متاحة. تأكد من منح الإذن!"
        );
        isScanning = false;
        hideReader();
        return;
      }

      const backCamera =
        devices.find(device =>
          device.label.toLowerCase().includes("back")
        ) || devices[0];

      const config = {
        fps: 10,
        qrbox: { width: 350, height: 350 },
        aspectRatio: 1.7778, // 16:9 مثالي للآيفون
        facingMode: { exact: "environment" }
      };

      html5QrCode.start(
        { deviceId: { exact: backCamera.id } },
        config,
        (decodedText) => {
          beepSound.play();

          html5QrCode.stop().then(() => {
            html5QrCode.clear();

            if (!code) {
              alert("⚠️ لا توجد بطاقة لإدخال الرمز");
              isScanning = false;
              hideReader();
              return;
            }

            // ✨ نضع الكود في آخر كارت
            refInput.value = decodedText;

            const btnRecherche = document.getElementById("btnRecherche");

            if (btnRecherche) btnRecherche.click();

            // محاكاة الضغط على زر Enter
            refInput.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                which: 13,
                keyCode: 13,
                bubbles: true
              })
            );

            // كذلك نطلق change كضمان إضافي
            refInput.dispatchEvent(new Event("change"));

            isScanning = false;
            hideReader();
          });
        },
        errorMessage => {
          // يمكن تجاهل أخطاء القراءة المؤقتة
        }
      )
        .catch(err => {
          console.error("📷 فشل بدء الكاميرا:", err);
          alert(
            "📵 تعذر فتح الكاميرا. تأكد من منح الصلاحيات أو استخدام متصفح يدعم الكاميرا."
          );
          isScanning = false;
          hideReader();
        });
    })
    .catch(err => {
      console.error("⚠️ خطأ في الحصول على الكاميرات:", err);
      alert(
        "⚠️ تعذر الوصول إلى الكاميرات. قد تحتاج إلى تغيير المتصفح أو السماح بالوصول."
      );
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
  readerDiv.style.display = "none";
  btnFermer.style.display = "none";
  containerScan.style.zIndex = "-9999999";

}

btnFermer.addEventListener("click", stopReader);


// code script menu toggel-------------->

const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open'));
}); 