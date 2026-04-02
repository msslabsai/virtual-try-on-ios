import { Platform } from 'react-native';

export interface TryOnRequest {
    gender: string;
    clothChoice?: string;
    fabricImage?: string; // URI (legacy)
    modelImage?: string; // URI
    designImage?: string; // URI (optional design-only reference)
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
    const API_URL_OVERRIDE = process.env.EXPO_PUBLIC_TRYON_API_URL || process.env.EXPO_PUBLIC_API_URL;
    // const API_URL = 'https://virtual-try-on-ios.onrender.com/api/virtual-tryon';
    const API_URL =
        API_URL_OVERRIDE ||
        (Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/virtual-tryon'
            : 'http://localhost:3000/api/virtual-tryon');

    console.log('Using API URL:', API_URL);

    if (!API_URL) {
        console.error('API URL not configured');
        return {
            success: false,
            error: 'API URL not configured.',
        };
    }

    const startTime = Date.now();
    const maxAttempts = 3;

    const buildFormData = () => {
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
        appendImage('design_image', request.designImage);

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
        return formData;
    };

    const isRetryableNetworkError = (message: string) => {
        const lower = message.toLowerCase();
        return (
            lower.includes('network request failed') ||
            lower.includes('failed to fetch') ||
            lower.includes('load failed') ||
            lower.includes('aborterror') ||
            lower.includes('timed out') ||
            lower.includes('socket') ||
            lower.includes('connection')
        );
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
        try {
            const formData = buildFormData();

            console.log('Sending request to API...', {
                url: API_URL,
                modelImage: !!request.modelImage,
                clothImagesCount: request.clothImages?.length || 0,
                attempt,
                maxAttempts
            });

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
            clearTimeout(timeoutId);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const shouldRetry = attempt < maxAttempts && isRetryableNetworkError(errorMessage);

            if (shouldRetry) {
                const delayMs = attempt * 2000;
                console.warn(`Try-on request interrupted; retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }

            console.error('Error generating try-on:', error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    return {
        success: false,
        error: 'Request failed after retries due to network interruption.',
    };
}
