// src/utils/SelfieService.js
export class SelfieService {
    static async saveToDevice(blob, filename) {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
            const file = new File([blob], filename, { type: 'image/png' });
            try {
                await navigator.share({
                    title: 'softWEAR Virtual Try-On',
                    text: 'Check out my virtual try-on selfie!',
                    files: [file]
                });
                return { success: true, method: 'share' };
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('Share failed, falling back to download:', err);
                }
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, method: 'download' };
    }

    static generateFilename(garmentName, gender) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const cleanGarmentName = garmentName ? garmentName.replace(/[^a-zA-Z0-9]/g, '_') : 'garment';
        return `softwear_${gender}_${cleanGarmentName}_${timestamp}.png`;
    }

    static async copyToClipboard(blob) {
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return true;
            } catch (err) {
                console.warn('Clipboard write failed:', err);
            }
        }
        return false;
    }
}
