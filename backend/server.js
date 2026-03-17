require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
            clothChoices = '[]',
            size = 'M',
            backgroundScene = 'Studio',
            additionalNotes = ''
        } = req.body;

        const parsedClothChoices = JSON.parse(clothChoices);

        // Find model image and cloth images
        const modelImageFile = uploadedFiles.find(f => f.fieldname === 'model_image');
        const clothImageFiles = uploadedFiles.filter(f => f.fieldname.startsWith('cloth_images'));

        if (!modelImageFile) {
            cleanupFiles(uploadedFiles);
            return res.status(400).json({ error: 'Model image is required' });
        }

        if (clothImageFiles.length === 0) {
            cleanupFiles(uploadedFiles);
            return res.status(400).json({ error: 'At least one cloth image is required' });
        }

        // Prepare images for Gemini
        const modelPart = fileToGenerativePart(modelImageFile.path, 'image/jpeg');
        const clothParts = clothImageFiles.map(f => fileToGenerativePart(f.path, 'image/jpeg'));

        // Build prompt
        const prompt = `You are an expert fashion AI assistant specializing in virtual try-on visualization.

Task: Generate a photorealistic image showing the person from the model photo wearing the clothes from the provided cloth images.

Details:
- Gender: ${gender}
- Clothing Types: ${parsedClothChoices.join(', ')}
- Size/Fit: ${size}
- Background Scene: ${backgroundScene}
${additionalNotes ? `- Additional Requirements: ${additionalNotes}` : ''}

Instructions:
1. Analyze the model photo to understand the person's body shape, pose, and lighting
2. Analyze the cloth images to understand fabric texture, color, pattern, and style
3. Generate a realistic image where the person is wearing the provided clothes
4. Maintain the person's identity, pose, and overall appearance
5. Apply the fabric textures and patterns accurately
6. Match the lighting and ensure shadows are realistic
7. Use a ${backgroundScene.toLowerCase()} background setting
8. Ensure the clothing fits naturally according to the ${size} size specification

Output: A single high-quality, photorealistic image showing the complete virtual try-on result.`;

        console.log('Calling Gemini 3 Pro Image Preview for image generation...');

        // Use Gemini 3 Pro Image Preview (returns image binary output)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
        
        const result = await model.generateContent([
            prompt,
            modelPart,
            ...clothParts
        ]);

        const response = await result.response;
        
        // Check if response contains image data
        const candidates = response.candidates;
        if (candidates && candidates.length > 0 && candidates[0].content.parts) {
            const imagePart = candidates[0].content.parts.find(part => part.inlineData);
            
            if (imagePart && imagePart.inlineData) {
                // Return binary image
                const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
                const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
                
                cleanupFiles(uploadedFiles);
                
                res.set('Content-Type', mimeType);
                res.set('Content-Length', imageBuffer.length);
                return res.send(imageBuffer);
            }
        }
        
        // Fallback: if no image generated, return text description
        const text = response.text();
        console.log('Gemini response (text only):', text);
        
        cleanupFiles(uploadedFiles);

        res.status(500).json({
            success: false,
            error: 'Image generation not available with current model',
            description: text,
            note: 'Gemini returned text instead of image. Consider using Imagen 3 API directly or Replicate/HuggingFace for virtual try-on.'
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
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Virtual Try-On API server running on http://0.0.0.0:${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: Use your local IP address`);
});
