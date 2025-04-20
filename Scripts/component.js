export function insertNavbar(targetSelector = 'body', position = 'afterbegin') {
    fetch('component.html')
        .then(res => res.text())
        .then(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const navbar = temp.querySelector('#navbar-template').content.cloneNode(true);
            document.querySelector(targetSelector).insertAdjacentElement(position, navbar.children[0]);
        });
}

export function insertFooter(targetSelector = 'body', position = 'beforeend') {
    fetch('component.html')
        .then(res => res.text())
        .then(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const footer = temp.querySelector('#footer-template').content.cloneNode(true);
            document.querySelector(targetSelector).insertAdjacentElement(position, footer.children[0]);
        });
}