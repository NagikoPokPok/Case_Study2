function initDashboard() {
  const container = document.querySelector('.span9');
  // Xóa sạch nội dung cũ (nếu có)
  container.innerHTML = '';

  fetch("content.html")
    .then(resp => resp.text())
    .then(html => {
      container.innerHTML = html;
      loadScriptsAfterContent();
    })
    .catch(err => console.error("Lỗi khi load content.html:", err));
}

function loadScriptsAfterContent() {
  const scripts = [
    "/Scripts/jquery-1.9.1.min.js",
    "/Scripts/jquery-ui-1.10.1.custom.min.js" ,
    "/bootstrap/js/bootstrap.min.js" ,
    "/Scripts/flot/jquery.flot.js" ,
    "/Scripts/flot/jquery.flot.resize.js" ,
    "/Scripts/datatables/jquery.dataTables.js" ,
    "/Scripts/common.js" ,
    
  ];

  // Đánh dấu những script đã load để không chèn trùng
  if (!window._loadedScripts) window._loadedScripts = new Set();

  scripts.forEach(src => {
    if (!window._loadedScripts.has(src)) {
      const s = document.createElement('script');
      s.src = src;
      s.type = "text/javascript";
      document.body.appendChild(s);
      window._loadedScripts.add(src);
    }
  });
}

// Chạy lần đầu khi DOM được build xong
window.addEventListener("DOMContentLoaded", initDashboard);

// Bắt pageshow để cover cả trường hợp back/forward cache
window.addEventListener("pageshow", function(event) {
  // event.persisted = true khi page phục hồi từ bfcache
  // hoặc bạn có thể bỏ điều kiện nếu muốn luôn reload
  if (event.persisted) {
    initDashboard();
  }
});
