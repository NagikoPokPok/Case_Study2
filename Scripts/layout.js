// Đánh dấu các script đã được tải để tránh tải lại
if (!window._loadedScripts) {
  window._loadedScripts = new Set();
}

// Danh sách các script cần tải theo đúng thứ tự
const requiredScripts = [
  "/Scripts/jquery-1.9.1.min.js",
  "/Scripts/jquery-ui-1.10.1.custom.min.js",
  "/bootstrap/js/bootstrap.min.js",
  "/Scripts/flot/jquery.flot.js",
  "/Scripts/flot/jquery.flot.resize.js",
  "/Scripts/datatables/jquery.dataTables.js",
  "/Scripts/common.js"
];

// Hàm tải từng script với Promise
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window._loadedScripts.has(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = "text/javascript";
    script.onload = () => {
      window._loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => {
      console.error(`Lỗi khi tải script: ${src}`);
      reject(new Error(`Script load failed: ${src}`));
    };
    document.body.appendChild(script);
  });
}

// Hàm tải tuần tự tất cả scripts
async function loadAllScripts() {
  try {
    for (const src of requiredScripts) {
      await loadScript(src);
    }
    console.log('Tất cả scripts đã được tải xong');
    return true;
  } catch (error) {
    console.error('Lỗi khi tải scripts:', error);
    return false;
  }
}

// Hàm khởi tạo dashboard
async function initDashboard() {
  const container = document.querySelector('.span9');
  if (!container) {
    console.error('Không tìm thấy container');
    return;
  }

  // Xóa nội dung cũ
  container.innerHTML = '';

  try {
    // Tải nội dung HTML
    const response = await fetch("content.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    container.innerHTML = html;

    // Tải các script sau khi có nội dung
    await loadAllScripts();

    // Gọi các hàm khởi tạo khác nếu cần
    if (typeof initPageSpecificFunctions === 'function') {
      initPageSpecificFunctions();
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo dashboard:", error);
  }
}

// Sự kiện khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", initDashboard);

// Xử lý trường hợp back/forward cache
window.addEventListener("pageshow", function(event) {
  if (event.persisted) {
    initDashboard();
  }
});

// Kiểm tra nếu DOM đã loaded (phòng trường hợp script được chèn sau khi DOM đã load)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initDashboard();
}