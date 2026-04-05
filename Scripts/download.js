function sanitizeFilePart(value) {
    return String(value || 'character')
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '')
        .slice(0, 48) || 'character';
}

function waitForImageLoad(img) {
    return new Promise(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 1800);
    });
}

const EXPORT_BASE_WIDTH = 1920;
const EXPORT_BASE_HEIGHT = 1080;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

function createExportClone(card, preset, viewport) {
    const stage = document.createElement('div');
    stage.className = 'export-stage';

    const clone = card.cloneNode(true);
    clone.removeAttribute('tabindex');
    clone.id = 'selectedCardExport';
    clone.dataset.exportPreset = preset || 'balanced';
    clone.dataset.exportViewport = viewport || 'large';

    stage.appendChild(clone);
    document.body.appendChild(stage);

    const cloneImage = clone.querySelector('.selected-image');
    if (cloneImage) {
        cloneImage.style.cssText += ';position:absolute;left:-4%;right:-8%;top:-2%;bottom:-2%;overflow:hidden;';
        const img = cloneImage.querySelector('img.selected-img');
        if (img) {
            img.style.cssText += ';width:102%;height:100%;object-fit:contain;object-position:24% center;transform:none;filter:none;';
        }
    }

    clone.style.cssText += `;width:${EXPORT_BASE_WIDTH}px;max-width:${EXPORT_BASE_WIDTH}px;height:${EXPORT_BASE_HEIGHT}px;min-height:${EXPORT_BASE_HEIGHT}px;overflow:hidden;margin:0;border-radius:28px;`;

    return { stage, clone };
}

document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download');
    const card = document.getElementById('selectedCard');
    const nameEl = document.getElementById('selectedName');
    const presetEl = document.getElementById('downloadPreset');
    const viewportEl = document.getElementById('downloadViewport');

    if (!downloadButton || !card || !nameEl) return;

    function isCharacterSelected() {
        return nameEl.textContent.trim() !== 'Select a character to preview';
    }

    async function waitForAssets(root) {
        const fontsReadyPromise = document.fonts?.ready;
        if (fontsReadyPromise instanceof Promise) {
            try { await fontsReadyPromise; } catch (e) { console.warn('Font readiness check failed:', e); }
        }
        const images = Array.from(root.querySelectorAll('img')).filter(img => img.src);
        const pending = images.filter(img => !img.complete);
        if (pending.length) await Promise.all(pending.map(waitForImageLoad));
    }

    function setDownloadState(isWorking) {
        const textEl = downloadButton.querySelector('.text');
        downloadButton.disabled = isWorking || !isCharacterSelected();
        downloadButton.classList.toggle('is-working', isWorking);
        if (textEl) textEl.textContent = isWorking ? 'Rendering PNG...' : 'Download Image';
    }

    async function exportCardAsPng() {
        if (!globalThis.domtoimage) { alert('dom-to-image-more is not loaded.'); return; }
        if (!isCharacterSelected()) { alert('Select a character first.'); return; }

        setDownloadState(true);
        let exportStage;

        try {
            document.body.classList.add('export-capture');

            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => requestAnimationFrame(r));

            const preset = presetEl?.value === 'lightcone' ? 'lightcone' : 'balanced';
            const viewport = viewportEl?.value === 'small' ? 'small' : 'large';
            const { stage, clone } = createExportClone(card, preset, viewport);
            exportStage = stage;

            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => requestAnimationFrame(r));
            await waitForAssets(clone);

            const dataUrl = await globalThis.domtoimage.toPng(clone, {
                width: EXPORT_BASE_WIDTH,
                height: EXPORT_BASE_HEIGHT,
                quality: 1,
                cacheBust: true,
                bgcolor: '#120d1f',
                style: {
                    width: `${EXPORT_BASE_WIDTH}px`,
                    height: `${EXPORT_BASE_HEIGHT}px`,
                    transform: 'none'
                }
            });

            const rendered = new Image();
            rendered.src = dataUrl;
            await waitForImageLoad(rendered);

            const output = document.createElement('canvas');
            output.width = OUTPUT_WIDTH;
            output.height = OUTPUT_HEIGHT;
            const ctx = output.getContext('2d');
            if (!ctx) { alert('Canvas context unavailable.'); return; }
            ctx.drawImage(rendered, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

            const namePart = sanitizeFilePart(nameEl.textContent);
            const fileName = `card-${namePart}.png`;

            const link = document.createElement('a');
            link.href = output.toDataURL('image/png');
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('download error:', err);
            alert('Could not generate image. Check console for details.');
        } finally {
            exportStage?.remove();
            document.body.classList.remove('export-capture');
            setDownloadState(false);
        }
    }

    downloadButton.addEventListener('click', exportCardAsPng);
    document.addEventListener('cardSelected', () => setDownloadState(false));
    setDownloadState(false);
});