export interface TryOnRequest {
    gender: string;
    clothChoice?: string;
    fabricImage?: string; // URI (legacy)
    modelImage?: string; // URI
    upperFabricImage?: string; // URI (legacy)
    bottomFabricImage?: string; // URI (legacy)
    clothImages?: string[]; // URIs
    modelFit?: string;
    backgroundScene?: string;
    additionalNotes?: string;
}

export interface TryOnResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
    processingTime?: number;
}

/**
 * Generate virtual try-on by sending data to webhook endpoint
 */
export async function generateVirtualTryOn(
    request: TryOnRequest
): Promise<TryOnResponse> {
<<<<<<< HEAD
    // Only allow Expo public env var so we never read stale server-side/private keys.
    const configuredUrl = process.env.EXPO_PUBLIC_TRYON_API_URL?.trim() || '';
    const API_URL = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : '';
=======
    // IMPORTANT: Replace this IP with your computer's local IP address
    // Find it with: hostname -I (Linux) or ipconfig (Windows) or ifconfig (Mac)
    // On physical device with Expo Go, use your computer's IP (e.g., 10.243.49.135)
    const API_URL = process.env.EXPO_PUBLIC_TRYON_API_URL;
>>>>>>> cfed5f0 (Remove .env file and update .gitignore to exclude environment files; modify aiService to use API_URL directly from environment variables.)

    console.log('Using API URL:', API_URL);

    if (!API_URL) {
        console.error('API URL not configured');
        return {
            success: false,
            error: 'API URL not configured. Set EXPO_PUBLIC_TRYON_API_URL in the root .env file.',
        };
    }

    try {
        const startTime = Date.now();
        const formData = new FormData();

        const appendImage = (name: string, uri: string | undefined) => {
            if (!uri) return;
            // @ts-ignore: React Native FormData expects this object shape
            formData.append(name, {
                uri: uri,
                name: `${name}.jpg`,
                type: 'image/jpeg',
            });
        };

        appendImage('model_image', request.modelImage);

        // Legacy single images
        appendImage('image', request.fabricImage);
        appendImage('upper_fabric', request.upperFabricImage);
        appendImage('bottom_fabric', request.bottomFabricImage);

        // Multiple cloth images
        if (request.clothImages && request.clothImages.length > 0) {
            request.clothImages.forEach((uri, index) => {
                appendImage(`cloth_images[${index}]`, uri);
            });
        }

        formData.append('gender', request.gender);
        if (request.clothChoice) {
            formData.append('clothChoice', request.clothChoice);
        }
        formData.append('size', request.modelFit || 'M');
        formData.append('backgroundScene', request.backgroundScene || 'Studio');
        if (request.additionalNotes) {
            formData.append('additionalNotes', request.additionalNotes);
        }

        console.log('Sending request to API...', { 
            url: API_URL,
            modelImage: !!request.modelImage,
            clothImagesCount: request.clothImages?.length || 0
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('API Error:', errorText);
            throw new Error(`API request failed: ${response.status} ${errorText}`);
        }

        // Get the binary image response
        const blob = await response.blob();

        // Convert blob to base64 for display in React Native
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const processingTime = Date.now() - startTime;

        return {
            success: true,
            imageUrl: imageUrl,
            processingTime,
        };
    } catch (error) {
        console.error('Error generating try-on:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
