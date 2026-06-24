(function () {
    const THEME_KEY = 'theme';
    const toggleBtn = document.getElementById('theme-toggle');

    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);

    toggleBtn.addEventListener('click', function () {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });
})();