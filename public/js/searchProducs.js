
      const pasteBtn = document.getElementById('pasteBtn');
      const input = document.getElementById('searchInput');

      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          input.value = text.trim();
          input.dispatchEvent(new Event('input'));
          showAlert('Le contenu a été collé et la recherche est en cours.. !', 'success');
        } catch {
          showAlert("Impossible d'accéder au presse-papiers !", 'error');
        }
      });

      const resultsDiv = document.getElementById('results');
      const paginationDiv = document.getElementById('pagination');
      const alertContainer = document.getElementById('alertContainer');
      const imageOverlay = document.getElementById('imageOverlay');
      const overlayImg = document.getElementById('overlayImg');
      const closeOverlay = document.getElementById('closeOverlay');

      let timer;
      let currentPage = 1;
      const itemsPerPage = 5;
      let currentData = [];

      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(fetchResults, 300);
      });

      function fetchResults() {
        const query = input.value.trim();
        if (query.length < 2) {
          resultsDiv.innerHTML = '';
          paginationDiv.innerHTML = '';
          return;
        }

        fetch('/api/searchee?s=' + encodeURIComponent(query))
          .then((res) => res.json())
          .then((data) => {
            if (!data.results || data.results.length === 0) {
              resultsDiv.innerHTML = '';
              paginationDiv.innerHTML = '';
              showAlert('Aucun résultat !', 'error');
              return;
            }

            currentData = data.results;
            currentPage = 1;
            showPage(currentPage);
          })
          .catch((err) => {
            showAlert('Erreur de connexion !', 'error');
            console.error(err);
          });
      }

      function showPage(page) {
        // تأكد من أن الصفحة ضمن الحدود
        const totalPages = Math.ceil(currentData.length / itemsPerPage);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        currentPage = page; // تحديث الصفحة الحالية

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = currentData.slice(start, end);

        resultsDiv.innerHTML = pageData
          .map((item) => {
            const thumb = item.thumb || 'https://via.placeholder.com/100?text=No+Image';
            return `
        <div class="item">
          <img src="${thumb}" alt="">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="desc">${item.desc || ''}</div>
            <div class="price">السعر: ${item.price}</div>
            <div class="anpf">ANPF: ${item.sku}</div>
            <div class="source">${item.source || ''}</div>
          </div>
        </div>`;
          })
          .join('');

        // تكبير الصورة
        document.querySelectorAll('.item img').forEach((img, i) => {
          img.addEventListener('click', () => {
            overlayImg.src = pageData[i].full_image || pageData[i].thumb;
            imageOverlay.style.display = 'flex';
          });
        });

        createPagination();
      }

      function createPagination() {
        const totalPages = Math.ceil(currentData.length / itemsPerPage);
        const maxButtons = 5;

        paginationDiv.innerHTML = ''; // إعادة البناء بالكامل

        const addButton = (text, page, active = false, disabled = false) => {
          const btn = document.createElement('button');
          btn.textContent = text;
          if (active) btn.classList.add('active');
          if (disabled) btn.disabled = true;
          btn.addEventListener('click', () => showPage(page));
          paginationDiv.appendChild(btn);
        };

        // زر Previous
        addButton('⬅ Précédent', currentPage - 1, false, currentPage === 1);

        // حساب نطاق الأزرار
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
          startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // أزرار الصفحات
        for (let i = startPage; i <= endPage; i++) {
          addButton(i, i, i === currentPage);
        }

        // زر Next
        addButton('Suivant ➡', currentPage + 1, false, currentPage === totalPages);
      }

      function showPage(page) {
        const totalPages = Math.ceil(currentData.length / itemsPerPage);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        currentPage = page;

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = currentData.slice(start, end);

        resultsDiv.innerHTML = pageData
          .map((item) => {
            const thumb = item.thumb || 'https://via.placeholder.com/100?text=No+Image';
            return `
        <div class="item">
          <img src="${thumb}" alt="">
          <div class="info">
            <div class="title">${item.title}</div>
            <div class="desc">${item.desc || ''}</div>
            <div class="price">السعر: ${item.price}</div>
            <div class="anpf">ANPF: ${item.sku}</div>
            <div class="source">${item.source || ''}</div>
          </div>
        </div>`;
          })
          .join('');

        // تكبير الصورة
        document.querySelectorAll('.item img').forEach((img, i) => {
          img.addEventListener('click', () => {
            overlayImg.src = pageData[i].full_image || pageData[i].thumb;
            imageOverlay.style.display = 'flex';
          });
        });

        createPagination();
      }

      function showAlert(message, type) {
        alertContainer.innerHTML = `<div class="alert ${type}">${message}</div>`;
        setTimeout(() => (alertContainer.innerHTML = ''), 2500);
      }

      closeOverlay.addEventListener('click', () => {
        imageOverlay.style.display = 'none';
      });

      document.querySelector('.return').addEventListener('click', (e) => {
        e.preventDefault();
        window.history.back();
      });

      const menuToggle = document.querySelector('.menu-toggle');
const menuRound = document.querySelector('.menu-round');
const menuLines = document.querySelectorAll('.menu-line');

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  menuRound.classList.toggle('open');
  menuLines.forEach(line => line.classList.toggle('open'));
});

    
    
    if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}