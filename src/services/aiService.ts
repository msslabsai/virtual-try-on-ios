export interface TryOnRequest {
    gender: string;
    clothType: string;
    fabricImage?: string; // URI
    modelImage?: string; // URI
    upperFabricImage?: string; // URI
    bottomFabricImage?: string; // URI
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
    // Replace with your actual webhook URL
    // Note: If running on a physical device, replace 'localhost' with your computer's IP address (e.g., 192.168.1.x)
    const WEBHOOK_URL = 'https://sahilpandey2004.app.n8n.cloud/webhook/168e5b99-ebb5-406c-af43-982a709c9e1a';

    if (!WEBHOOK_URL) {
        console.error('Webhook URL not configured');
        return {
            success: false,
            error: 'Webhook URL not configured.',
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

        appendImage('image', request.fabricImage);
        appendImage('model_image', request.modelImage);
        appendImage('upper_fabric', request.upperFabricImage);
        appendImage('bottom_fabric', request.bottomFabricImage);

        formData.append('gender', request.gender);
        formData.append('clothType', request.clothType);
        formData.append('size', request.modelFit || 'M');
        formData.append('backgroundScene', request.backgroundScene || 'Studio');
        if (request.additionalNotes) {
            formData.append('additionalNotes', request.additionalNotes);
        }

        console.log('Sending request to webhook...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Accept': 'image/*',
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Webhook request failed: ${response.status} ${errorText}`);
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
