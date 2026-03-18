const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const RAW_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const MODEL_NAME = RAW_MODEL_NAME.replace(/^models\//, '');

// Configure multer for file uploads
const uploadsDir = path.resolve(__dirname, 'uploads');
const upload = multer({ dest: uploadsDir });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in backend/.env');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to convert file to base64
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
            mimeType
        },
    };
}

// Helper to clean up uploaded files
function cleanupFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}

function extractImagePartFromResponse(response) {
    const candidates = response?.candidates;
    if (!candidates || candidates.length === 0) return null;
    const parts = candidates[0]?.content?.parts || [];
    return parts.find(part => part.inlineData) || null;
}

function getPngDimensions(buffer) {
    // PNG width/height are stored in IHDR at bytes 16..23
    if (buffer.length < 24) return null;
    const pngSignature = '89504e470d0a1a0a';
    if (buffer.subarray(0, 8).toString('hex') !== pngSignature) return null;
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

function getJpegDimensions(buffer) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    let i = 2;
    while (i < buffer.length) {
        if (buffer[i] !== 0xff) {
            i += 1;
            continue;
        }
        const marker = buffer[i + 1];
        i += 2;

        // SOF markers that contain dimensions
        const isSof =
            marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
            marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
            marker === 0xc9 || marker === 0xca || marker === 0xcb ||
            marker === 0xcd || marker === 0xce || marker === 0xcf;

        if (isSof) {
            if (i + 7 >= buffer.length) return null;
            const height = buffer.readUInt16BE(i + 3);
            const width = buffer.readUInt16BE(i + 5);
            return { width, height };
        }

        // Markers without payload length
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
            continue;
        }

        if (i + 1 >= buffer.length) return null;
        const segmentLength = buffer.readUInt16BE(i);
        if (segmentLength < 2) return null;
        i += segmentLength;
    }
    return null;
}

function getImageDimensions(buffer, mimeType) {
    if (!buffer || buffer.length === 0) return null;
    if (mimeType === 'image/png') {
        return getPngDimensions(buffer);
    }
    // Default to JPEG parser, since Gemini typically returns jpeg.
    return getJpegDimensions(buffer);
}

function isDesiredPortrait(dimensions) {
    if (!dimensions) return false;
    const { width, height } = dimensions;
    if (!width || !height) return false;
    if (height <= width) return false; // Must be portrait
    const ratio = width / height;
    const target = 9 / 16;
    return Math.abs(ratio - target) <= 0.035;
}

function normalizeAdditionalNotes(rawNotes) {
    const notes = String(rawNotes || '').trim().replace(/\s+/g, ' ');
    if (!notes) return '';
    return notes.slice(0, 600);
}

function buildAdditionalNotesSection(notes) {
    if (!notes) {
        return '- Additional notes: none.';
    }
    return `- Additional notes (strict requirements): ${notes}`;
}

function logPrompt(attemptLabel, prompt) {
    console.log(`Prompt (${attemptLabel}):\n${prompt}`);
}

async function generateImageWithStructuredPrompt(model, userPrompt, imageParts = []) {
    return model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [{ text: userPrompt }, ...imageParts]
            }
        ],
        generationConfig: {
            temperature: 0.4,
            topP: 0.95,
            topK: 40
        }
    });
}

// Virtual Try-On endpoint
app.post('/api/virtual-tryon', upload.any(), async (req, res) => {
    const uploadedFiles = req.files || [];
    
    try {
        console.log('Received request:', {
            body: req.body,
            files: uploadedFiles.map(f => ({ fieldname: f.fieldname, originalname: f.originalname }))
        });

        // Extract parameters
        const {
            gender = 'Female',
            clothChoice = '',
            size = 'M',
            backgroundScene = 'Studio',
            additionalNotes = ''
        } = req.body;
        const normalizedClothChoice = String(clothChoice || 'outfit').trim();
        const normalizedAdditionalNotes = normalizeAdditionalNotes(additionalNotes);
        const additionalNotesSection = buildAdditionalNotesSection(normalizedAdditionalNotes);

        // Find model image and cloth images (model image is optional)
        const modelImageFile = uploadedFiles.find(f =>
            f.fieldname === 'model_image' ||
            f.fieldname === 'modelImage' ||
            f.fieldname === 'model'
        );
        const referenceImageFiles = uploadedFiles.filter(f => f.fieldname.startsWith('cloth_images'));

        if (referenceImageFiles.length === 0) {
            cleanupFiles(uploadedFiles);
            return res.status(400).json({ error: 'At least one reference image is required' });
        }

        // Prepare images for Gemini
        const modelPart = modelImageFile ? fileToGenerativePart(modelImageFile.path, 'image/jpeg') : null;
        const referenceParts = referenceImageFiles.map(f => fileToGenerativePart(f.path, 'image/jpeg'));
        if (!modelPart) {
            console.log('No model image provided; proceeding with cloth reference image(s) only.');
        }

        // Build prompt
        const prompt = `You are an expert fashion AI assistant specializing in virtual try-on visualization.

Task: Generate a single photorealistic image for virtual try-on.

Details:
- Gender: ${gender}
- Clothing Choice: ${normalizedClothChoice}
- Size/Fit: ${size}
- Background Scene: ${backgroundScene}
${additionalNotesSection}

Instructions:
1. Always use all provided reference image(s) as the primary source of truth. Never ignore them.
2. Analyze the provided reference image(s). If they are clothing images, apply the exact texture, color, and pattern.
3. If a reference image is not clothing (for example landscape/object/photo), still generate a valid outfit by using the image as visual inspiration (palette, mood, texture cues), and DO NOT ask for another image.
4. ${modelPart ? "Use the provided model image as identity reference and preserve the person's face, body proportions, pose, and lighting." : "No model image is provided; generate a realistic female fashion model that matches the requested size/fit and garment styling."}
5. The final outfit must strictly match Clothing Choice "${normalizedClothChoice}" and must not change to any other garment type.
6. Ensure the clothing fit follows size ${size} and drapes naturally.
7. Use a ${backgroundScene.toLowerCase()} background setting.
8. Produce a clean, high-detail, studio-quality output with realistic shadows and edges.
9. Generate the image in portrait 1080x1920 (9:16) composition.
10. Strictly follow Additional notes together with all primary prompt constraints.
11. Additional notes are mandatory and must be applied, but without violating identity preservation, garment type, fit, and reference-image fidelity.
12. Return an image output directly.

Output: A single high-quality, photorealistic image showing the complete virtual try-on result.`;

        console.log(`Calling Gemini model "${MODEL_NAME}" for image generation...`);

        // Model is configurable via GEMINI_MODEL env var
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        console.log('Prompt config:', {
            clothChoice: normalizedClothChoice,
            hasModelImage: Boolean(modelPart),
            referenceImages: referenceParts.length,
            size,
            backgroundScene,
            additionalNotes: normalizedAdditionalNotes || 'none'
        });

        const inputImageParts = [...(modelPart ? [modelPart] : []), ...referenceParts];
        console.log('Gemini attempt 1: primary prompt');
        logPrompt('attempt 1', prompt);
        const result = await generateImageWithStructuredPrompt(model, prompt, inputImageParts);
        let response = await result.response;

        let imagePart = extractImagePartFromResponse(response);
        let text = response.text ? response.text() : '';

        if (!imagePart) {
            console.log('Gemini text-only response. Retrying once with strict image-only instruction...');
            const retryPrompt = `Generate exactly one photorealistic fashion image now.
- Never ask for another input.
- Always use all provided reference image(s) as primary source of truth and never ignore them.
- If reference image is not clothing, infer outfit design from its colors/textures and create wearable ${normalizedClothChoice}.
- Keep garment type strictly as: ${normalizedClothChoice}.
- ${modelPart ? "Preserve the model identity, face, body shape, pose, and lighting from the model image." : "Create a realistic female fashion model."}
- Size: ${size}
- Background: ${backgroundScene}
- Gender: ${gender}
- Additional notes (strict requirements): ${normalizedAdditionalNotes || 'None'}
- Strictly follow additional notes together with all primary constraints.
- Additional notes must be applied, but without violating identity, garment type, fit, or reference-image fidelity.
- Resolution/composition: portrait 1080x1920 (9:16).
Output must be an image only.`;

            logPrompt('attempt 2', retryPrompt);
            console.log('Gemini attempt 2: strict no-image fallback');
            const retryResult = await generateImageWithStructuredPrompt(model, retryPrompt, inputImageParts);
            response = await retryResult.response;
            imagePart = extractImagePartFromResponse(response);
            text = response.text ? response.text() : text;
        }

        if (imagePart && imagePart.inlineData) {
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
            const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
            const dimensions = getImageDimensions(imageBuffer, mimeType);
            console.log('Generated image dimensions:', dimensions || 'unknown');

            console.log('Done: Gemini returned image output successfully.');

            cleanupFiles(uploadedFiles);

            res.set('Content-Type', mimeType);
            res.set('Content-Length', imageBuffer.length);
            return res.send(imageBuffer);
        }

        console.log('Gemini response (text only):', text);
        
        cleanupFiles(uploadedFiles);

        res.status(502).json({
            success: false,
            error: 'Image generation returned text-only responses',
            description: text,
            note: 'Tried primary prompt + one strict no-image fallback. Consider changing model/provider if this persists.'
        });

    } catch (error) {
        console.error('Error processing try-on:', error);
        cleanupFiles(uploadedFiles);
        res.status(500).json({
            error: 'Failed to generate virtual try-on',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Virtual Try-On API server running on http://0.0.0.0:${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: Use your local IP address`);
});
