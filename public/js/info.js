
      async function loadPasswords() {
        const res = await fetch('/get-passwords');
        const data = await res.json();

        const table = document.getElementById('passwordTable');

        const fields = [
          { key: 'pasPageUploade', label: 'Page Upload' },
          { key: 'pasPageInventaire', label: 'Page Inventaire' },
          { key: 'passDeletOneVendeur', label: 'Suppression d’un vendeur' },
          { key: 'passDeletAllVendeur', label: 'Suppression de tous les vendeurs' },
          { key: 'PanneauMotss', label: 'Panneau des mots de passe' },
        ];

        table.innerHTML = '';

        fields.forEach((item) => {
          const tr = document.createElement('tr');

          tr.innerHTML = `
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="togglePassword('${item.key}', '${
            data[item.key]
          }')">
            👁
          </button>
        </td>
        <td>
          <span class="password-box" id="pw_${item.key}">****</span>
        </td>
        <td>${item.label}</td>
      `;

          table.appendChild(tr);
        });

        // تعبئة الفورم بالقيم
        document.querySelector('#pasPageUploade').value = '';
        document.querySelector('#pasPageInventaire').value = '';
        document.querySelector('#passDeletOneVendeur').value = '';
        document.querySelector('#passDeletAllVendeur').value = '';
        document.querySelector('#PanneauMotss').value = '';
      }
      const btn = document.querySelector('#btn');

      // زر إظهار / إخفاء كلمة السر
      function togglePassword(key, value) {
        const span = document.getElementById('pw_' + key);
        span.textContent = span.textContent === '****' ? value : '****';
      }

      // إرسال التعديل للخادم
      document.getElementById('passForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.innerHTML = '<i class="bi bi-floppy2"></i>  enregistré les Mot passe...';
        const formData = Object.fromEntries(new FormData(e.target).entries());

        const res = await fetch('/update-passwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        btn.innerHTML = `<i class="bi bi-save me-2"></i> Sauvegarder les modifications`;

        alert(await res.text());
        loadPasswords();
      });

      // تحميل البيانات عند فتح الصفحة
      loadPasswords();
    
    
    if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.error('SW registration failed:', err));
}