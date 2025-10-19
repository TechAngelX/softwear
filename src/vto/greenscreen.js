// src/vto/greenscreen.js

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

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.drawImage(tempCanvas, 0, 0);

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

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(segmentationMask, 0, 0, canvas.width, canvas.height);

    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();
};
