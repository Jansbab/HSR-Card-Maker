const mihomoForm = document.getElementById('mihomoForm');
const uidInputEl = document.getElementById('uidInput');
const submitBtn = document.querySelector('#mihomoForm button[type="submit"]');
const mihomoConfirmation = document.getElementById('mihomoConfirmation');

if (!mihomoForm) {
    console.error('mihomoForm not found');
}
if (!uidInputEl) {
    console.error('uidInput not found');
}

let isFetching = false;

function setMihomoConfirmation(message, options = {}) {
    if (!mihomoConfirmation) return;

    const { type = 'info', html = false } = options;
    mihomoConfirmation.classList.add('mihomo-confirmation');
    mihomoConfirmation.classList.remove('is-success', 'is-error', 'is-info');
    mihomoConfirmation.classList.add(`is-${type}`);

    if (html) {
        mihomoConfirmation.innerHTML = message;
        return;
    }

    mihomoConfirmation.textContent = message;
}

const MAINSTAT_FIELD_ID_BY_SLOT = {
    3: {
        hp: 1,
        atk: 2,
        def: 3,
        crit_rate: 4,
        crit_dmg: 5,
        heal_rate: 6,
        effect_hit: 7
    },
    4: {
        hp: 1,
        atk: 2,
        def: 3,
        spd: 4
    },
    5: {
        hp: 1,
        atk: 2,
        def: 3,
        physical_dmg: 4,
        fire_dmg: 5,
        ice_dmg: 6,
        lightning_dmg: 7,
        wind_dmg: 8,
        quantum_dmg: 9,
        imaginary_dmg: 10
    },
    6: {
        break_dmg: 1,
        sp_rate: 2,
        hp: 3,
        atk: 4,
        def: 5
    }
};

const SUBSTAT_ID_BY_FIELD = {
    hp: 1,
    atk: 2,
    def: 3,
    spd: 7,
    crit_rate: 8,
    crit_dmg: 9,
    effect_hit: 10,
    effect_res: 11,
    break_dmg: 12
};

function toSafeInt(value, fallback = null) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

function getMainStatId(slot, mainAffix) {
    const slotNum = toSafeInt(slot, 0);
    if (slotNum === 1 || slotNum === 2) return 1;

    const field = String(mainAffix?.field || '').trim();
    const bySlot = MAINSTAT_FIELD_ID_BY_SLOT[slotNum] || {};
    return bySlot[field] || 1;
}

function getSubStatId(subAffix) {
    const type = String(subAffix?.type || '');
    const field = String(subAffix?.field || '').trim();

    if (field === 'hp' || field === 'atk' || field === 'def') {
        if (type.includes('AddedRatio')) {
            return field === 'hp' ? 4 : field === 'atk' ? 5 : 6;
        }
        return field === 'hp' ? 1 : field === 'atk' ? 2 : 3;
    }

    return SUBSTAT_ID_BY_FIELD[field] || 1;
}

function relicToLegacyString(relic) {
    const setId = toSafeInt(relic?.set_id, 0);
    const slot = toSafeInt(relic?.type, 0);
    const level = toSafeInt(relic?.level, 0);
    if (!setId || !slot) return null;

    const token = `6${String(setId).padStart(3, '0')}${slot}`;
    const mainStatId = getMainStatId(slot, relic?.main_affix);

    const subAffix = Array.isArray(relic?.sub_affix) ? relic.sub_affix : [];
    const subTokens = subAffix.map(sub => {
        const id = getSubStatId(sub);
        const upgrades = Math.max(1, toSafeInt(sub?.count, 1));
        const step = Math.max(0, toSafeInt(sub?.step, 0));
        const roll = upgrades + step;
        return `${id}:${upgrades}:${roll}`;
    });

    return [token, level, mainStatId, subTokens.length, ...subTokens].join(',');
}

function normalizeMihomoCharacter(character) {
    const relics = (Array.isArray(character?.relics) ? character.relics : [])
        .map(relicToLegacyString)
        .filter(Boolean);

    return {
        id: toSafeInt(character?.id),
        name: character?.name || '',
        hp: null,
        sp: null,
        level: toSafeInt(character?.level),
        promotion: toSafeInt(character?.promotion),
        rank: toSafeInt(character?.rank),
        lightcone: character?.light_cone ? {
            id: toSafeInt(character.light_cone.id),
            rank: toSafeInt(character.light_cone.rank),
            level: toSafeInt(character.light_cone.level),
            promotion: toSafeInt(character.light_cone.promotion)
        } : null,
        relics,
        use_technique: false,
        buff_id_list: []
    };
}

function applyMihomoCharacters(characters) {
    const avatars = (Array.isArray(characters) ? characters : [])
        .map(normalizeMihomoCharacter)
        .filter(c => Number.isFinite(c.id));

    globalThis.avatarConfig = avatars;
    document.dispatchEvent(new CustomEvent('avatarConfigImported', { detail: avatars }));

    return avatars;
}

mihomoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isFetching) return;

    const uid = uidInputEl?.value?.trim() || '';
    if (!uid) {
        console.warn('Empty UID');
        setMihomoConfirmation('Please enter a UID', { type: 'error' });
        showAllCards();
        return;
    }
    if (!/^\d+$/.test(uid)) {
        console.warn('Invalid UID');
        setMihomoConfirmation('Invalid UID', { type: 'error' });
        showAllCards();
        return;
    }

    isFetching = true;
    if (submitBtn) submitBtn.disabled = true;
    setMihomoConfirmation('Searching player...', { type: 'info' });

    try {
        const res = await fetch(`/api/mihomo/sr_info_parsed/${encodeURIComponent(uid)}?lang=en`);
        if (!res.ok) {
            setMihomoConfirmation('Player not found.', { type: 'error' });
            showAllCards();
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const player = await res.json();
        showAllCards();
        handlePlayerData(player);
    } catch (err) {
        console.error('Error fetching player:', err);
        setMihomoConfirmation('Could not fetch player data. Please try again.', { type: 'error' });
    } finally {
        isFetching = false;
        if (submitBtn) submitBtn.disabled = false;
    }
});

function handlePlayerData(pd) {
    if (!pd) return;
    const playerData = pd.player;
    const charactersData = Array.isArray(pd.characters) ? pd.characters : [];

    applyMihomoCharacters(charactersData);

    setMihomoConfirmation(
        `Player found: <strong>${playerData?.nickname ?? '—'}</strong><br>` +
        `Showing ${charactersData.length} character${charactersData.length === 1 ? '' : 's'}.<br>` +
        `To see more characters, add them to your <em>Character Showcase</em> in your in-game profile settings and log out of the game to refresh your data.`,
        { type: 'success', html: true }
    );

    filterCardsByPlayerIds(charactersData);
}

function filterCardsByPlayerIds(charactersData) {
    const playerIdSet = new Set((charactersData || []).map(c => Number(c.id)));
    let firstVisibleCard = null;

    document.querySelectorAll('.char-card').forEach(card => {
        const id = Number(card.dataset.id);
        const shouldShow = playerIdSet.has(id);
        card.style.display = shouldShow ? '' : 'none';
        if (shouldShow && !firstVisibleCard) {
            firstVisibleCard = card;
        }
    });

    if (firstVisibleCard) {
        firstVisibleCard.click();
    }
}

function showAllCards() {
    document.querySelectorAll('.char-card').forEach(card => {
        card.style.display = '';
    });
}
