/* jshint esversion: 11 */
(function() {
    // All your variables and functions are now private to this module.
    const tabs = Array.from(document.querySelectorAll('#nav [role="tab"][data-type="nav"]'));
    const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

    const showTab = (tab) => {
        const targetId = tab?.getAttribute('aria-controls');
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;

        tabs.forEach(t => {
            const selected = (t === tab);
            t.setAttribute('aria-selected', selected);
            t.tabIndex = selected ? 0 : -1;
        });
        panels.forEach(p => {
            p.hidden = (p !== target);
        });
    };

    // Clicks: only nav tabs
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[role="tab"][data-type="nav"]');
        if (!tab) return;
        e.preventDefault();
        showTab(tab);
        tab.focus();
    });

    // Keyboard: Left/Right + Space/Enter
    document.getElementById('nav')?.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            const next = tabs[(i + dir + tabs.length) % tabs.length];
            showTab(next);
            next.focus();
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const tab = document.activeElement.closest('[role="tab"][data-type="nav"]');
            if (tab) showTab(tab);
        }
    });

    // Initial state: honor aria-selected="true", else first tab
    (function initTabs() {
        const initial = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
        if (initial) showTab(initial);
    })();
})();
