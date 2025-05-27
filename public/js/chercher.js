$(document).ready(function () {
    var table = $("#example").DataTable({
        processing: true,
        serverSide: true,
        searching: false, // إيقاف البحث الافتراضي، لأننا نستخدم حقول مخصصة
        ajax: {
            url: "/api/products",
            type: "POST",
            data: function (d) {
                d.fournisseur = $("#fournisseurFilter").val();
                d.search.value = $("#globalSearch").val(); // نمرر القيمة من حقل البحث العام
            },
            dataSrc: "data"
        },
        columns: [
            { data: "LIBELLE" },
            { data: "GENCOD_P" },
            { data: "ANPF" },
            { data: "FOURNISSEUR_P" },
            { data: "REFFOUR_P" },
            { data: "STOCK" }
        ],
        scrollX: true,
        autoWidth: true,
        select: true,
        paging: true,
        dom: "Bfrtip",
        buttons: [
            {
                extend: "colvis",
                text: '<i class="fa fa-eye-slash"></i> Colonnes',
                className: "btn btn-danger"
            },
            {
                extend: "copyHtml5",
                text: '<i class="fa fa-copy"></i> Copier',
                className: "btn btn-primary"
            },
            {
                extend: "excelHtml5",
                text: '<i class="fa fa-file-excel-o"></i> Excel',
                className: "btn btn-success"
            },
            {
                text: '<i class="fa fa-whatsapp"></i> WhatsApp',
                className: "btn btn-success",
                action: function () {
                    var selectedData = table
                        .rows({ selected: true })
                        .data()
                        .toArray();
                    if (selectedData.length === 0) {
                        alert("اختر صفًا أولاً");
                        return;
                    }
                    let message = selectedData
                        .map(row => Object.values(row).join(" | "))
                        .join("\n");
                    let encoded = encodeURIComponent(message);
                    let whatsappUrl = `https://wa.me/?text=${encoded}`;
                    window.open(whatsappUrl, "_blank");
                },
                attr: { id: "whatsappButton" }
            }
        ]
    });

    // تأخير إعادة التحميل عند كتابة البحث
    let typingTimerGlobal;
    $("#globalSearch")
        .on("keyup", function () {
            clearTimeout(typingTimerGlobal);
            typingTimerGlobal = setTimeout(() => {
                table.ajax.reload();
            }, 500);
        })
        .on("keydown", function () {
            clearTimeout(typingTimerGlobal);
        });

    let typingTimerFournisseur;
    $("#fournisseurFilter")
        .on("keyup", function () {
            clearTimeout(typingTimerFournisseur);
            typingTimerFournisseur = setTimeout(() => {
                table.ajax.reload();
            }, 500);
        })
        .on("keydown", function () {
            clearTimeout(typingTimerFournisseur);
        });
});
