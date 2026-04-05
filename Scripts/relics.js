const RELIC_SLOTS = ['Head', 'Hands', 'Body', 'Feet', 'Sphere', 'Rope'];
const MAINSTAT_BY_SLOT = {
    1: { 1: 'HP' },
    2: { 1: 'ATK' },
    3: {
        1: 'HP%',
        2: 'ATK%',
        3: 'DEF%',
        4: 'Crit Rate',
        5: 'Crit DMG',
        6: 'Outgoing Healing',
        7: 'Effect HIT Rate'
    },
    4: {
        1: 'HP%',
        2: 'ATK%',
        3: 'DEF%',
        4: 'Speed'
    },
    5: {
        1: 'HP%',
        2: 'ATK%',
        3: 'DEF%',
        4: 'Physical Damage',
        5: 'Fire Damage',
        6: 'Ice Damage',
        7: 'Lightning Damage',
        8: 'Wind Damage',
        9: 'Quantum Damage',
        10: 'Imaginary Damage'
    },
    6: {
        1: 'Break Effect',
        2: 'Energy Regeneration Rate',
        3: 'HP%',
        4: 'ATK%',
        5: 'DEF%'
    }
};

const MAINSTAT_FALLBACK = {
    1: 'HP%',
    2: 'ATK%',
    3: 'DEF%',
    4: 'Crit Rate',
    5: 'Crit DMG',
    6: 'Outgoing Healing',
    7: 'Effect HIT Rate'
};
const SUBSTAT_NAMES = {
    1: 'HP',
    2: 'ATK',
    3: 'DEF',
    4: 'HP%',
    5: 'ATK%',
    6: 'DEF%',
    7: 'Speed',
    8: 'Crit Rate',
    9: 'Crit DMG',
    10: 'Effect HIT Rate',
    11: 'Effect RES',
    12: 'Break Effect'
};

const MAINSTAT_BASE_KEY_MAP = {
    'Physical Damage': 'Physical DMG',
    'Fire Damage': 'Fire DMG',
    'Ice Damage': 'Ice DMG',
    'Wind Damage': 'Wind DMG',
    'Lightning Damage': 'Lightning DMG',
    'Quantum Damage': 'Quantum DMG',
    'Imaginary Damage': 'Imaginary DMG',
    'Energy Regeneration Rate': 'Energy Regen Rate'
};

const SUBSTAT_BASE_KEY_MAP = {
    'Crit Rate': 'Crit Rate%',
    'Crit DMG': 'Crit DMG%',
    'Effect HIT Rate': 'Effect HIT%',
    'Effect RES': 'Effect RES%',
    'Break Effect': 'Break Effect%'
};

const FLAT_STAT_KEYS = new Set(['HP', 'ATK', 'DEF', 'Speed']);

let relicSetMap = new Map();
let relicBaseStats5 = { main: {}, sub: {} };
let avatarRelicsById = new Map();

const relicDataLoaded = Promise.all([
    fetch('Assets/data_relics.json')
        .then(res => {
            if (!res.ok) throw new Error(`relics load: ${res.status}`);
            return res.json();
        })
        .then(data => {
            const list = Array.isArray(data?.relics) ? data.relics : [];
            relicSetMap = new Map(list.map(r => [Number(r.id), r.name]));
        }),
    fetch('Assets/relic_base_stats.json')
        .then(res => {
            if (!res.ok) throw new Error(`relic base stats load: ${res.status}`);
            return res.json();
        })
        .then(data => {
            relicBaseStats5 = {
                main: data?.main_stat_values?.['5star'] || {},
                sub: data?.substat_values?.['5star'] || {}
            };
        })
]).catch(err => {
    console.warn('Could not load relic metadata:', err);
});

function parseItemToken(token) {
    const tok = String(token ?? '');
    if (tok.length < 5) {
        return { token: tok, setId: null, slotIndex: null };
    }

    const setId = Number(tok.slice(1, 4));
    const slotIndex = Number(tok.slice(4));
    return {
        token: tok,
        setId: Number.isNaN(setId) ? null : setId,
        slotIndex: Number.isNaN(slotIndex) ? null : slotIndex
    };
}

function parseRelicString(str) {
    if (!str || typeof str !== 'string') return null;

    const parts = str.split(',').map(s => s.trim());
    if (parts.length < 5) return null;

    const [itemToken, levelStr, mainStatIdStr, subCountStr, ...subTokens] = parts;
    const itemInfo = parseItemToken(itemToken);

    const level = Number(levelStr);
    const mainStatId = Number(mainStatIdStr);
    const subCount = Number(subCountStr);

    const substats = subTokens
        .filter(Boolean)
        .map(token => {
            const [idStr, upgradesStr, rollsStr] = token.split(':').map(x => x.trim());
            const id = Number(idStr);
            const upgrades = Number(upgradesStr);
            const rolls = Number(rollsStr);
            return {
                raw: token,
                id: Number.isNaN(id) ? null : id,
                name: SUBSTAT_NAMES[id] ?? 'Unknown',
                upgrades: Number.isNaN(upgrades) ? 0 : upgrades,
                rolls: Number.isNaN(rolls) ? 0 : rolls
            };
        });

    return {
        raw: str,
        itemToken: itemInfo.token,
        setId: itemInfo.setId,
        slotIndex: itemInfo.slotIndex,
        slotName: RELIC_SLOTS[(itemInfo.slotIndex ?? 0) - 1] ?? 'Unknown',
        level: Number.isNaN(level) ? null : level,
        mainStatId: Number.isNaN(mainStatId) ? null : mainStatId,
        mainStatName: getMainStatName(itemInfo.slotIndex, mainStatId),
        subCount: Number.isNaN(subCount) ? null : subCount,
        substats
    };
}

function parseAvatarRelics(avatar) {
    const relics = Array.isArray(avatar?.relics) ? avatar.relics : [];
    return relics.map(parseRelicString).filter(Boolean);
}

function updateAvatarRelicCache(avatars) {
    avatarRelicsById = new Map();
    (Array.isArray(avatars) ? avatars : []).forEach(avatar => {
        const avatarId = Number(avatar?.id);
        if (Number.isNaN(avatarId)) return;
        avatarRelicsById.set(avatarId, parseAvatarRelics(avatar));
    });
}

function getAvatarRelics(avatarId) {
    return avatarRelicsById.get(Number(avatarId)) || [];
}

function getSetName(setId) {
    const id = Number(setId);
    if (Number.isNaN(id)) return '—';
    return relicSetMap.get(id) || `Set ${id}`;
}

function getRelicIconPath(setId, slotIndex) {
    const id = Number(setId);
    const slot = Number(slotIndex);
    if (Number.isNaN(id) || Number.isNaN(slot)) return 'Assets/icon/None.png';

    if (slot >= 1 && slot <= 4) {
        return `Assets/icon/relic/${id}_${slot - 1}.png`;
    }

    if (slot === 5 || slot === 6) {
        return `Assets/icon/relic/${id}_${slot - 5}.png`;
    }

    return 'Assets/icon/None.png';
}

function getRelicFallbackIconPath(setId, slotIndex) {
    const id = Number(setId);
    const slot = Number(slotIndex);
    if (Number.isNaN(id) || Number.isNaN(slot)) return 'Assets/icon/None.png';

    if (slot === 5 || slot === 6) {
        return `Assets/icon/relic/${id}_${slot - 5}.png`;
    }

    return 'Assets/icon/None.png';
}

function getMainStatBaseKey(mainStatName) {
    return MAINSTAT_BASE_KEY_MAP[mainStatName] || mainStatName;
}

function getSubStatBaseKey(subStatName) {
    return SUBSTAT_BASE_KEY_MAP[subStatName] || subStatName;
}

function isPercentStatKey(baseKey) {
    return !FLAT_STAT_KEYS.has(baseKey);
}

function formatStatValue(baseKey, value) {
    if (!Number.isFinite(Number(value))) return '—';
    const rounded = Number(value).toFixed(1);
    return isPercentStatKey(baseKey) ? `${rounded}%` : rounded;
}

function getMainStatComputedValue(mainStatName, level) {
    const baseKey = getMainStatBaseKey(mainStatName);
    const lv = Number(level);
    const statData = relicBaseStats5.main?.[baseKey];
    if (!statData || Number.isNaN(lv)) {
        return { key: baseKey, value: null, formatted: '—' };
    }

    const value = Number(statData.base) + (Number(statData.per_lv) * lv);
    return {
        key: baseKey,
        value,
        formatted: formatStatValue(baseKey, value)
    };
}

function getSubstatComputedValue(subStatName, upgrades, rolls) {
    const baseKey = getSubStatBaseKey(subStatName);
    const upg = Number(upgrades);
    const roll = Number(rolls);
    const statData = relicBaseStats5.sub?.[baseKey];

    if (!statData || Number.isNaN(upg) || Number.isNaN(roll) || upg <= 0) {
        return { key: baseKey, tier: null, value: null, formatted: '—' };
    }

    let tier = 'mid';
    if (roll < upg) tier = 'low';
    else if (roll > upg) tier = 'high';

    const rollValue = Number(statData[tier]);
    if (Number.isNaN(rollValue)) {
        return { key: baseKey, tier, value: null, formatted: '—' };
    }

    const value = rollValue * upg;
    return {
        key: baseKey,
        tier,
        value,
        formatted: formatStatValue(baseKey, value)
    };
}

function getMainStatName(slotIndex, mainStatId) {
    const slot = Number(slotIndex);
    const statId = Number(mainStatId);
    if (Number.isNaN(slot) || Number.isNaN(statId)) return '—';

    const bySlot = MAINSTAT_BY_SLOT[slot];
    if (bySlot && bySlot[statId]) {
        return bySlot[statId];
    }

    return MAINSTAT_FALLBACK[statId] || `Stat ${mainStatId}`;
}

document.addEventListener('avatarConfigImported', e => {
    updateAvatarRelicCache(e.detail || []);
});

if (Array.isArray(globalThis.avatarConfig)) {
    updateAvatarRelicCache(globalThis.avatarConfig);
}

globalThis.RELIC_SLOTS = RELIC_SLOTS;
globalThis.parseRelicString = parseRelicString;
globalThis.parseAvatarRelics = parseAvatarRelics;
globalThis.getAvatarRelics = getAvatarRelics;
globalThis.getSetName = getSetName;
globalThis.getRelicIconPath = getRelicIconPath;
globalThis.getRelicFallbackIconPath = getRelicFallbackIconPath;
globalThis.getMainStatName = getMainStatName;
globalThis.getMainStatComputedValue = getMainStatComputedValue;
globalThis.getSubstatComputedValue = getSubstatComputedValue;
globalThis.ensureRelicDataLoaded = () => relicDataLoaded;
