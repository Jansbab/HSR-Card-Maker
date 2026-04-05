(async () => {
    try {
        const avatars = await getAllAvatars();
        const input = document.getElementById('searchInput');
        const resultsCont = document.getElementById('searchResults');
        if (!input || !resultsCont) return;

        let items = [];
        let activeIndex = -1;
        let selectedId = null;
        const MAX_RESULTS = 8;

        function highlightMatch(name, q) {
            if (!q) return name;
            const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'ig');
            return name.replace(regex, '<span class="hl">$1</span>');
        }

        function renderResults(list, query) {
            if (!list || list.length === 0) {
                resultsCont.innerHTML = '';
                return;
            }
            const html = `<div class="results-list" role="listbox">
        ${list.map((a, i) => `
          <div class="item ${i === activeIndex ? 'active' : ''}" role="option" data-id="${a.id}" data-index="${i}">
            <div class="id">#${a.id}</div>
            <div class="name">${highlightMatch(a.name, query)}</div>
          </div>
        `).join('')}
      </div>`;
            resultsCont.innerHTML = html;
        }

        function closeResults() {
            resultsCont.innerHTML = '';
            activeIndex = -1;
            items = [];
        }

        input.addEventListener('input', (e) => {
            const q = (e.target.value || '').trim();
            if (!q) {
                closeResults();
                selectedId = null;
                return;
            }
            const ql = q.toLowerCase();
            const filtered = avatars.filter(a =>
                a.name.toLowerCase().includes(ql) || String(a.id).startsWith(q)
            ).slice(0, MAX_RESULTS);
            items = filtered;
            activeIndex = -1;
            renderResults(items, q);
        });

        resultsCont.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            if (!item) return;
            const id = Number(item.dataset.id);
            const idx = Number(item.dataset.index);
            selectItem(idx);
        });

        input.addEventListener('keydown', (e) => {
            if (!items || items.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                renderResults(items, input.value.trim());
                scrollActiveIntoView();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                renderResults(items, input.value.trim());
                scrollActiveIntoView();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < items.length) {
                    selectItem(activeIndex);
                } else if (items.length === 1) {
                    selectItem(0);
                }
            } else if (e.key === 'Escape') {
                closeResults();
            }
        });

        function scrollActiveIntoView() {
            const active = resultsCont.querySelector('.item.active');
            if (active) active.scrollIntoView({ block: 'nearest' });
        }

        function selectItem(index) {
            const a = items[index];
            if (!a) return;
            input.value = a.name;
            selectedId = a.id;
            closeResults();
            console.log('Selected', a.id, a.name);
            const evt = new CustomEvent('characterSelected', { detail: { id: a.id, name: a.name } });
            input.dispatchEvent(evt);
        }

        document.addEventListener('click', (e) => {
            if (!resultsCont.contains(e.target) && e.target !== input) {
                closeResults();
            }
        });
    } catch (err) {
        console.error('Search init error:', err);
    }
})();
