const BASE_CR = 5;
const BASE_CD = 50;

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function getEmptyRelicBonuses() {
    return {
        hpFlat: 0,
        hpPct: 0,
        atkFlat: 0,
        atkPct: 0,
        defFlat: 0,
        defPct: 0,
        spdFlat: 0,
        crPct: 0,
        cdPct: 0,
        ehrPct: 0,
        resPct: 0,
        bePct: 0
    };
}

function addRelicValue(bonuses, key, value) {
    const val = toNumber(value);
    switch (key) {
        case 'HP': bonuses.hpFlat += val; break;
        case 'HP%': bonuses.hpPct += val; break;
        case 'ATK': bonuses.atkFlat += val; break;
        case 'ATK%': bonuses.atkPct += val; break;
        case 'DEF': bonuses.defFlat += val; break;
        case 'DEF%': bonuses.defPct += val; break;
        case 'Speed': bonuses.spdFlat += val; break;
        case 'Crit Rate':
        case 'Crit Rate%': bonuses.crPct += val; break;
        case 'Crit DMG':
        case 'Crit DMG%': bonuses.cdPct += val; break;
        case 'Effect HIT Rate':
        case 'Effect HIT%': bonuses.ehrPct += val; break;
        case 'Effect RES':
        case 'Effect RES%': bonuses.resPct += val; break;
        case 'Break Effect':
        case 'Break Effect%': bonuses.bePct += val; break;
        default: break;
    }
}

function getRelicStatBonuses(avatarId) {
    const bonuses = getEmptyRelicBonuses();
    if (typeof getAvatarRelics !== 'function') return bonuses;

    const relics = getAvatarRelics(avatarId);
    if (!Array.isArray(relics)) return bonuses;

    relics.forEach(relic => {
        const mainComputed = typeof getMainStatComputedValue === 'function'
            ? getMainStatComputedValue(relic?.mainStatName, relic?.level)
            : null;
        if (mainComputed) {
            addRelicValue(bonuses, mainComputed.key, mainComputed.value);
        }

        (Array.isArray(relic?.substats) ? relic.substats : []).forEach(sub => {
            const subComputed = typeof getSubstatComputedValue === 'function'
                ? getSubstatComputedValue(sub?.name, sub?.upgrades, sub?.rolls)
                : null;
            if (subComputed) {
                addRelicValue(bonuses, subComputed.key, subComputed.value);
            }
        });
    });

    return bonuses;
}

async function getAvatarHp(avatarId, lcId) {
    const baseAvatar = toNumber(await getAvatarStat(avatarId, 'hp'));
    const baseLc = toNumber(await getLightconeHp(lcId));
    const base = baseAvatar + baseLc;
    const bonuses = getRelicStatBonuses(avatarId);
    return base * (1 + bonuses.hpPct / 100) + bonuses.hpFlat;
}

async function getAvatarAtk(avatarId, lcId) {
    const baseAvatar = toNumber(await getAvatarStat(avatarId, 'atk'));
    const baseLc = toNumber(await getLightconeAtk(lcId));
    const base = baseAvatar + baseLc;
    const bonuses = getRelicStatBonuses(avatarId);
    return base * (1 + bonuses.atkPct / 100) + bonuses.atkFlat;
}

async function getAvatarDef(avatarId, lcId) {
    const baseAvatar = toNumber(await getAvatarStat(avatarId, 'def'));
    const baseLc = toNumber(await getLightconeDef(lcId));
    const base = baseAvatar + baseLc;
    const bonuses = getRelicStatBonuses(avatarId);
    return base * (1 + bonuses.defPct / 100) + bonuses.defFlat;
}

async function getAvatarSpd(avatarId) {
    const baseSpd = toNumber(await getAvatarStat(avatarId, 'spd'));
    const bonuses = getRelicStatBonuses(avatarId);
    return baseSpd + bonuses.spdFlat;
}

function getAvatarCr(avatarId) {
    const bonuses = getRelicStatBonuses(avatarId);
    return BASE_CR + bonuses.crPct;
}

function getAvatarCd(avatarId) {
    const bonuses = getRelicStatBonuses(avatarId);
    return BASE_CD + bonuses.cdPct;
}

function getAvatarEhr(avatarId) {
    const bonuses = getRelicStatBonuses(avatarId);
    return bonuses.ehrPct;
}

function getAvatarRes(avatarId) {
    const bonuses = getRelicStatBonuses(avatarId);
    return bonuses.resPct;
}

function getAvatarBe(avatarId) {
    const bonuses = getRelicStatBonuses(avatarId);
    return bonuses.bePct;
}

async function getLightconeHp(id) {
    return toNumber(await getLightconeStat(id, 'hp'));
}

async function getLightconeAtk(id) {
    return toNumber(await getLightconeStat(id, 'atk'));
}

async function getLightconeDef(id) {
    return toNumber(await getLightconeStat(id, 'def'));
}