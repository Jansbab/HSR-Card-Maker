document.addEventListener('DOMContentLoaded', async () => {
    try {
        await dataLoaded;

        let configAvatars = Array.isArray(globalThis.avatarConfig) ? globalThis.avatarConfig : [];

        const container = document.getElementById('cardContainer');
        if (!container) {
            console.warn('Container not found, skipping cards initialization');
            return;
        }

        document.addEventListener('avatarConfigImported', e => {
            configAvatars = e.detail || [];

            const selected = container.querySelector('.char-card.selected');
            if (selected) {
                selectCard(selected.dataset.id);
            }
        });

        const avatars = await getAllAvatars();
        const lightcones = await getAllLightcones();
        const relicSlots = globalThis.RELIC_SLOTS || ['Head', 'Hands', 'Body', 'Feet', 'Sphere', 'Rope'];

        function formatOneDecimal(value) {
            const num = Number(value);
            return Number.isFinite(num) ? num.toFixed(1) : '—';
        }

        function createCard(a) {
            const el = document.createElement('div');
            el.className = 'char-card';
            el.setAttribute('role', 'button');
            el.tabIndex = 0;
            el.dataset.id = a.id;
            el.innerHTML = `
                <div class="thumb" aria-hidden="true"><img src="Assets/icon/character/${a.id}.png" onerror="this.onerror=null;this.src='Assets/icon/None.png'" alt="Character image"></div>
                <div class="meta">
                    <div class="name">${a.name}</div>
                    <div class="cid">#${a.id}</div>
                </div>
            `;

            el.addEventListener('click', () => selectCard(a.id));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectCard(a.id);
                }
            });

            return el;
        }

        avatars.forEach(a => container.appendChild(createCard(a)));

        function buildRelicIconMarkup(setId, slotIndex, altText) {
            const iconPath = typeof getRelicIconPath === 'function'
                ? getRelicIconPath(setId, slotIndex)
                : 'Assets/icon/None.png';
            const fallbackPath = typeof getRelicFallbackIconPath === 'function'
                ? getRelicFallbackIconPath(setId, slotIndex)
                : 'Assets/icon/None.png';

            return `<img class="relic-icon" src="${iconPath}" data-fallback="${fallbackPath}" alt="${altText}" onerror="if(!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback||'Assets/icon/None.png';}else{this.onerror=null;this.src='Assets/icon/None.png';}">`;
        }

        function buildSubstatsMarkup(substats) {
            const list = Array.isArray(substats) ? substats.filter(Boolean).slice(0, 4) : [];
            if (!list.length) {
                return '<div class="relic-substats"><span class="sub-empty">Subs: —</span></div>';
            }

            return `
                <div class="relic-substats">
                    ${list.map(s => {
                        const name = s?.name || `Sub ${s?.id ?? '—'}`;
                        const upgrades = Number.isFinite(Number(s?.upgrades)) ? Number(s.upgrades) : 0;
                        const rolls = Number.isFinite(Number(s?.rolls)) ? Number(s.rolls) : 0;
                        const computed = typeof getSubstatComputedValue === 'function'
                            ? getSubstatComputedValue(name, upgrades, rolls)
                            : null;
                        const valueText = computed?.formatted ?? '—';
                        return `<span class="sub-pill">${name}: ${valueText}</span>`;
                    }).join('')}
                </div>
            `;
        }

        function buildLightconeStatsMarkup(hp, atk, def) {
            return `
                <span class="lc-pill">HP ${hp}</span>
                <span class="lc-pill">ATK ${atk}</span>
                <span class="lc-pill">DEF ${def}</span>
            `;
        }

        async function renderRelics(avatarId, cfg) {
            const relicsEl = document.getElementById('selectedRelics');
            if (!relicsEl) return;

            if (typeof ensureRelicDataLoaded === 'function') {
                await ensureRelicDataLoaded();
            }

            const parsedRelics = typeof getAvatarRelics === 'function'
                ? getAvatarRelics(avatarId)
                : (Array.isArray(cfg?.relics) ? cfg.relics.map(parseRelicString).filter(Boolean) : []);

            const relicBySlot = new Map(parsedRelics.map(r => [Number(r.slotIndex), r]));

            relicsEl.innerHTML = relicSlots.map((slotName, idx) => {
                const slotIndex = idx + 1;
                const relic = relicBySlot.get(slotIndex);
                if (!relic) {
                    return `
                        <div class="relic-item">
                            <div class="relic-row">
                                <div>
                                    <div class="slot">${slotName}</div>
                                    <div class="name">—</div>
                                </div>
                                ${buildRelicIconMarkup(null, null, `${slotName} icon`)}
                            </div>
                            <div class="main">Main: —</div>
                            ${buildSubstatsMarkup([])}
                        </div>
                    `;
                }

                const setName = typeof getSetName === 'function' ? getSetName(relic.setId) : `Set ${relic.setId}`;
                const mainText = relic.mainStatName || '—';
                const mainComputed = typeof getMainStatComputedValue === 'function'
                    ? getMainStatComputedValue(mainText, relic.level)
                    : null;
                const mainValueText = mainComputed?.formatted ?? '—';

                return `
                    <div class="relic-item">
                        <div class="relic-row">
                            <div>
                                <div class="slot">${slotName}</div>
                                <div class="name">${setName}</div>
                            </div>
                            ${buildRelicIconMarkup(relic.setId, slotIndex, `${setName} ${slotName}`)}
                        </div>
                        <div class="main">Main: ${mainText}${mainValueText !== '—' ? ` (${mainValueText})` : ''}</div>
                        ${buildSubstatsMarkup(relic.substats)}
                    </div>
                `;
            }).join('');
        }

        async function selectCard(avatarID) {
            const a = avatars.find(x => Number(x.id) === Number(avatarID));
            if (!a) return;

            const cfg = (configAvatars || []).find(ca => Number(ca.id) === Number(avatarID));
            const lcId = Number(cfg?.lightcone?.id) || 'None';
            const l = lightcones.find(x => Number(x.id) === lcId) || { id: 'None', name: '—' };

            container.querySelectorAll('.char-card.selected').forEach(n => n.classList.remove('selected'));
            const el = container.querySelector(`.char-card[data-id="${avatarID}"]`);
            if (el) el.classList.add('selected');

            const nameEl = document.getElementById('selectedName');
            const descEl = document.getElementById('selectedDesc');
            const imgEl = document.querySelector('#selectedCard .selected-image');
            if (nameEl) nameEl.textContent = a.name;
            if (descEl) {
                descEl.textContent = ` Level: ${cfg?.level ?? '—'} | Eidolon: ${cfg?.rank ?? '—'}`;
            }
            if (imgEl) {
                imgEl.innerHTML = '';
                const bigImg = document.createElement('img');
                bigImg.className = 'selected-img';
                bigImg.src = `Assets/character_portrait/${a.id}.png`;
                bigImg.alt = a.name;
                bigImg.onerror = function () {
                    this.onerror = null;
                    this.src = 'Assets/icon/None.png';
                };
                imgEl.appendChild(bigImg);
            }

            const statHp = document.getElementById('statHp');
            const statAtk = document.getElementById('statAtk');
            const statDef = document.getElementById('statDef');
            const statSpd = document.getElementById('statSpd');
            const statCr = document.getElementById('statCr');
            const statCd = document.getElementById('statCd');
            const statEhr = document.getElementById('statEhr');
            const statRes = document.getElementById('statRes');
            const statBe = document.getElementById('statBe');
            if (statHp) statHp.textContent = formatOneDecimal(await getAvatarHp(a.id, l.id));
            if (statAtk) statAtk.textContent = formatOneDecimal(await getAvatarAtk(a.id, l.id));
            if (statDef) statDef.textContent = formatOneDecimal(await getAvatarDef(a.id, l.id));
            if (statSpd) statSpd.textContent = formatOneDecimal(await getAvatarSpd(a.id, l.id));
            if (statCr) statCr.textContent = `${formatOneDecimal(getAvatarCr(a.id))}%`;
            if (statCd) statCd.textContent = `${formatOneDecimal(getAvatarCd(a.id))}%`;
            if (statEhr) statEhr.textContent = `${formatOneDecimal(getAvatarEhr(a.id))}%`;
            if (statRes) statRes.textContent = `${formatOneDecimal(getAvatarRes(a.id))}%`;
            if (statBe) statBe.textContent = `${formatOneDecimal(getAvatarBe(a.id))}%`;

            const lcImg = document.getElementById('selectedLightconeImage');
            const lcName = document.getElementById('selectedLightconeName');
            const lcStats = document.getElementById('selectedLightconeStats');
            if (lcImg) {
                lcImg.src = `Assets/light_cone_preview/${l.id}.png`;
                lcImg.alt = 'Light cone';
                lcImg.onerror = function () {
                    this.onerror = null;
                    this.src = 'Assets/icon/None.png';
                };
            }
            if (lcName) lcName.textContent = l.name ?? '—';
            if (lcStats) {
                const lcHp = formatOneDecimal(await getLightconeHp(l.id));
                const lcAtk = formatOneDecimal(await getLightconeAtk(l.id));
                const lcDef = formatOneDecimal(await getLightconeDef(l.id));
                lcStats.innerHTML = buildLightconeStatsMarkup(lcHp, lcAtk, lcDef);
            }

            await renderRelics(avatarID, cfg);

            const selectedSection = document.getElementById('selectedCard');
            if (selectedSection) selectedSection.focus();

            document.dispatchEvent(new CustomEvent('cardSelected', { detail: { id: a.id, name: a.name } }));
        }

        const input = document.getElementById('searchInput');

        function handleCharacterSelected(e) {
            const idFromDetail = e?.detail?.id;
            if (idFromDetail) {
                selectCard(idFromDetail);
                const card = container.querySelector(`.char-card[data-id="${idFromDetail}"]`);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const val = (input?.value || '').trim();
            if (!val) return;
            const m = val.match(/^(\d+)\s*-\s*(.*)$/);
            let resolved = null;
            if (m) {
                const id = Number(m[1]);
                resolved = avatars.find(a => Number(a.id) === id);
            }
            if (!resolved) {
                resolved = avatars.find(a => a.name === val);
            }
            if (resolved) {
                selectCard(resolved.id);
                const card = container.querySelector(`.char-card[data-id="${resolved.id}"]`);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (input) {
            input.addEventListener('characterSelected', handleCharacterSelected);
            input.addEventListener('change', handleCharacterSelected);
        }
        document.addEventListener('characterSelected', handleCharacterSelected);

    } catch (err) {
        console.error('cards init error:', err);
    }
});
