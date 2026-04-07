const configImportButton = document.getElementById('configImport');
const configFileInput = document.getElementById('configFileInput');
const uidImportButton = document.getElementById('uidImport');
const uidInput = document.getElementById('uidInput');

configImportButton?.addEventListener('click', () => {
    showAllCards();
    uidInput?.style.setProperty('display', 'none');
    uidInput.value = '';
    if (mihomoConfirmation) {
        mihomoConfirmation.textContent = '';
        mihomoConfirmation.classList.remove('mihomo-confirmation', 'is-success', 'is-error', 'is-info');
    }
    configFileInput?.click();
})

uidImportButton?.addEventListener('click', () => {
    uidInput?.style.setProperty('display', 'block');
})

configFileInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const isJsonMime = file.type === 'application/json';
    const isJsonExt = /\.json$/i.test(file.name);

    if (!isJsonMime && !isJsonExt) {
        alert('Please select a json file');
        configFileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const jsonData = JSON.parse(reader.result);
            handleImportedConfig(jsonData);
            console.log('JSON imported successfully', jsonData);
        } catch (err) {
            alert('Invalid JSON file: ' + err.message);
            configFileInput.value = '';
        }
    };
    reader.onerror = () => {
        alert('Error reading file');
        configFileInput.value = '';
    };

    reader.readAsText(file);
});

function handleImportedConfig(jsonData) {
    if (!jsonData) return [];

    let raw = jsonData.avatar_config;

    if (!raw) {
        console.warn('avatar_config not found in JSON');
        return [];
    }

    if (!Array.isArray(raw) && typeof raw === 'object') {
        raw = Object.values(raw);
    }

    if (!Array.isArray(raw)) {
        console.warn('avatar_config is not an array');
        return [];
    }

    const avatars = raw.map(av => ({
        id: av.id ?? null,
        name: av.name ?? '',
        hp: av.hp ?? null,
        sp: av.sp ?? null,
        level: av.level ?? null,
        promotion: av.promotion ?? null,
        rank: av.rank ?? null,
        lightcone: av.lightcone ? {
            id: av.lightcone.id ?? null,
            rank: av.lightcone.rank ?? null,
            level: av.lightcone.level ?? null,
            promotion: av.lightcone.promotion ?? null
        } : null,
        relics: Array.isArray(av.relics) ? av.relics.slice() : [],
        use_technique: !!av.use_technique,
        buff_id_list: Array.isArray(av.buff_id_list) ? av.buff_id_list.slice() : []
    }));

    globalThis.avatarConfig = avatars;
    document.dispatchEvent(new CustomEvent('avatarConfigImported', { detail: avatars }));

    return avatars;
}
