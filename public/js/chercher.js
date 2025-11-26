$(document).ready(function () {
  var table = $('#example').DataTable({
    processing: true,
    serverSide: true,
    searching: false, // إيقاف البحث الافتراضي، لأننا نستخدم حقول مخصصة
    ajax: {
      url: '/api/products',
      type: 'POST',
      data: function (d) {
        d.fournisseur = $('#fournisseurFilter').val();
        d.search.value = $('#globalSearch').val(); // نمرر القيمة من حقل البحث العام
      },
      dataSrc: 'data',
    },
    columns: [
      { data: 'LIBELLE' },
      { data: 'GENCOD_P' },
      { data: 'ANPF' },
      { data: 'FOURNISSEUR_P' },
      { data: 'REFFOUR_P' },
      { data: 'STOCK' },
    ],
    scrollX: true,
    autoWidth: true,
    select: true,
    paging: true,
    dom: 'Bflrtip',
    buttons: [
      {
        extend: 'colvis',
        text: '<i class="fa fa-eye-slash"></i> Colonnes',
        className: 'btn btn-danger btn-show',
      },
      {
        extend: 'copyHtml5',
        text: '<i class="fa fa-copy"></i> Copier',
        className: 'btn btn-primary btn-show',
      },
      {
        extend: 'excelHtml5',
        text: '<i class="fa fa-file-excel-o"></i> Excel',
        className: 'btn btn-success btn-show',
      },
      {
        text: '<i class="fa fa-whatsapp"></i> WhatsApp',
        className: 'btn btn-info btn-show',

        action: function () {
          var selectedData = table.rows({ selected: true }).data().toArray();
          if (selectedData.length === 0) {
            alert('اختر صفًا أولاً');
            return;
          }
          // حدد الأعمدة التي تريد نسخها فقط
          const desiredColumns = ['LIBELLE', 'GENCOD_P']; // استبدل بأسماء الأعمدة التي تريدها بالضبط

          let message = selectedData
            .map((row) => desiredColumns.map((col) => row[col] || '').join(' 🌟🆔 '))
            .join('\n');
          let encoded = encodeURIComponent(message);
          let whatsappUrl = `https://wa.me/?text=${encoded}`;
          window.open(whatsappUrl, '_blank');
        },
        attr: { id: 'whatsappButton' },
      },
    ],
  });
  document.getElementById('searche').addEventListener('click', () => {
    clearTimeout(typingTimerFournisseur);
    clearTimeout(typingTimerGlobal);
    table.ajax.reload();
  });

  // تأخير إعادة التحميل عند كتابة البحث
  let typingTimerGlobal;
  $('#globalSearch')
    .on('keyup', function () {
      clearTimeout(typingTimerGlobal);
      typingTimerGlobal = setTimeout(() => {
        table.ajax.reload();
      }, 400);
    })
    .on('keydown', function () {
      clearTimeout(typingTimerGlobal);
    });

  let typingTimerFournisseur;
  $('#fournisseurFilter')
    .on('keyup', function () {
      clearTimeout(typingTimerFournisseur);
      typingTimerFournisseur = setTimeout(() => {
        table.ajax.reload();
      }, 400);
    })
    .on('keydown', function () {
      clearTimeout(typingTimerFournisseur);
    });
});

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
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}