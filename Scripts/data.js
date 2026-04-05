let avatarMap = new Map();
let lightconeMap = new Map();
let avatarStats = new Object();
let lightconeStats = new Object();

const dataLoaded = Promise.all([
    fetch("../Assets/data_avatars.json")
        .then(res => {
            if (!res.ok) throw new Error(`avatars load: ${res.status}`);
            return res.json();
        })
        .then(data => {
            avatarMap = new Map(data.avatars.map(a => [Number(a.id), a.name]));
        }),

    fetch("../Assets/data_lightcones.json")
        .then(res => {
            if (!res.ok) throw new Error(`lightcones load: ${res.status}`);
            return res.json();
        })
        .then(data => {
            lightconeMap = new Map(data.lightcones.map(l => [Number(l.id), l.name]));
        }),

    fetch("../Assets/character_base_stats.json")
        .then(res => res.json())
        .then(data => {
            avatarStats = data
        }),

    fetch("../Assets/lightcone_base_stats.json")
        .then(res => res.json())
        .then(data => {
            lightconeStats = data
        })

]).catch(err => {
    console.error("Error while loading the data:", err);
});

async function getAllAvatars() {
    await dataLoaded;
    return Array.from(avatarMap, ([id, name]) => ({id, name}));
}

async function getAllLightcones() {
    await dataLoaded;
    return Array.from(lightconeMap, ([id, name]) => ({id, name}));
}

async function getAvatarStats(id) {
    await dataLoaded;
    String(id)
    return avatarStats[id]
}

async function getAvatarStat(id, stat) {
    const stats = await getAvatarStats(id);
    return stats?.[stat] ?? null;
}

async function getLightconeStats(id) {
    await dataLoaded;
    String(id)
    return lightconeStats[id]
}

async function getLightconeStat(id, stat) {
    const stats = await getLightconeStats(id);
    return stats?.[stat] ?? null;
}