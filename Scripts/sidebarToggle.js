document.addEventListener('DOMContentLoaded', function () {
    const togglePages = document.getElementById('togglePages');
    if (!togglePages) return;
    const links = togglePages.querySelectorAll('li > a');

    links.forEach(a => {
        a.addEventListener('click', function (e) {
            // Remove 'active' class from all <a>
            links.forEach(link => link.classList.remove('active'));
            // Remove bold from all <a>
            links.forEach(link => link.style.fontWeight = 'normal');

            // Add 'active' class and bold to clicked <a>
            a.classList.add('active');
            a.style.fontWeight = 'bold';
        });
    });
});