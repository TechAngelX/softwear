// src/vto/greenscreen.js

// Module-level cached temp canvas to avoid creating a new one every frame
let tempCanvas = null;
let tempCtx = null;

const getTempCanvas = (width, height) => {
    if (!tempCanvas || tempCanvas.width !== width || tempCanvas.height !== height) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx = tempCanvas.getContext('2d');
    }
    return { canvas: tempCanvas, ctx: tempCtx };
};

/**
 * Digital greenscreen utility for the 'virtual wardrobe'. Applies a segmentation mask to a canvas context to
 * create a virtual background effect. This function effectively "cuts out" the person from the camera
 * feed, allowing a CSS background on the parent element to show through.
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {Object} results - The results object from a MediaPipe Holistic call.
 * @property {ImageBitmap} results.segmentationMask - The mask containing the user's silhouette.
 * @property {ImageBitmap} results.image - The raw camera video frame.
 */
export const applySegmentation = (ctx, results) => {
    const canvas = ctx.canvas;
    const { segmentationMask, image } = results;

    ctx.save();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';

    const temp = getTempCanvas(canvas.width, canvas.height);
    temp.ctx.clearRect(0, 0, canvas.width, canvas.height);

    temp.ctx.globalCompositeOperation = 'source-over';
    temp.ctx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

    temp.ctx.globalCompositeOperation = 'source-in';
    temp.ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.drawImage(temp.canvas, 0, 0);

    ctx.restore();
};

/**
 * Enhanced segmentation with canvas-based background
 * Draws a background image behind the segmented person
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {Object} results - The results object from a MediaPipe Holistic call.
 * @param {HTMLImageElement} backgroundImage - The background image to draw behind the person.
 */
export const applySegmentationWithBackground = (ctx, results, backgroundImage = null) => {
    const canvas = ctx.canvas;
    const { segmentationMask, image } = results;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    const temp = getTempCanvas(canvas.width, canvas.height);
    temp.ctx.clearRect(0, 0, canvas.width, canvas.height);

    temp.ctx.globalCompositeOperation = 'source-over';
    temp.ctx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

    temp.ctx.globalCompositeOperation = 'source-in';
    temp.ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.drawImage(temp.canvas, 0, 0);

    ctx.restore();
};
