document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tab);

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            target.classList.add('active');
        });
    });

    // Color Mode Switcher
    const colorModeOptions = document.querySelectorAll('.option-card');
    const systemThemeWatcher = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
            updateSystemTheme();
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    function updateSystemTheme() {
        if (document.documentElement.getAttribute('data-theme') === null) {
            const theme = systemThemeWatcher.matches ? 'dark' : 'light';
            // No need to set data-theme attribute here, rely on CSS media query
        }
    }
    
    function saveThemePreference(theme) {
        chrome.storage.local.set({ theme: theme });
    }

    function loadThemePreference() {
        chrome.storage.local.get('theme', (data) => {
            const theme = data.theme || 'system';
            applyTheme(theme);
            updateSelectedCard(theme);
        });
    }
    
    function updateSelectedCard(theme) {
        colorModeOptions.forEach(card => {
            if (card.dataset.mode === theme) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    colorModeOptions.forEach(card => {
        card.addEventListener('click', () => {
            const selectedTheme = card.dataset.mode;
            applyTheme(selectedTheme);
            saveThemePreference(selectedTheme);
            updateSelectedCard(selectedTheme);
        });
    });
    
    systemThemeWatcher.addEventListener('change', updateSystemTheme);

    // Initial load
    loadThemePreference();
}); 