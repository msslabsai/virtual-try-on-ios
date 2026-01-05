import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Share, ScrollView, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { generateVirtualTryOn } from '../services/aiService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function PreviewScreen({ route, navigation }: any) {
    const { previews, modelConfig } = route.params;

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [backgroundScene, setBackgroundScene] = useState('Studio');
    const [modelFit, setModelFit] = useState('M');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    const mainPreview = generatedImage;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateVirtualTryOn({
                gender: modelConfig.selectedGender,
                clothType: modelConfig.selectedAttire,
                fabricImage: previews.fabric,
                modelImage: previews.model,
                upperFabricImage: previews.upper,
                bottomFabricImage: previews.bottom,
                modelFit,
                backgroundScene,
                additionalNotes
            });

            if (result.success && result.imageUrl) {
                setGeneratedImage(result.imageUrl);
            } else {
                Alert.alert('Generation Failed', result.error || 'Unknown error');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while generating.');
        } finally {
            setIsGenerating(false);
        }
    };

    const saveImageToCache = async (imageUri: string) => {
        try {
            const filename = `try-on-${Date.now()}.jpg`;
            const fileUri = FileSystem.cacheDirectory + filename;

            if (imageUri.startsWith('data:')) {
                const base64Data = imageUri.split(',')[1];
                await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return fileUri;
            } else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
                const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
                return downloadResult.uri;
            } else {
                return imageUri;
            }
        } catch (error) {
            console.error('Save to cache error:', error);
            throw error;
        }
    };

    const handleShare = async () => {
        if (!generatedImage) return;
        try {
            const localUri = await saveImageToCache(generatedImage);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Share your Virtual Try-On'
                });
            } else {
                await Share.share({
                    url: localUri,
                    message: Platform.OS === 'android' ? 'Check out my virtual try-on!' : undefined,
                    title: 'Virtual Try-On Result'
                });
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'Failed to share image. Please try again.');
        }
    };

    const handleDownload = async () => {
        if (!generatedImage) return;

        try {
            const localUri = await saveImageToCache(generatedImage);

            if (Platform.OS === 'android') {
                try {
                    if (permissionResponse?.status !== 'granted') {
                        const { status } = await requestPermission();
                        if (status !== 'granted') {
                            throw new Error('Permission not granted');
                        }
                    }
                    const asset = await MediaLibrary.createAssetAsync(localUri);
                    await MediaLibrary.createAlbumAsync('Virtual Try-On', asset, false);
                    Alert.alert('Success', 'Image saved to gallery!');
                } catch (e) {
                    console.error('MediaLibrary error:', e);
                    if (await Sharing.isAvailableAsync()) {
                        Alert.alert(
                            'Save Image',
                            'Direct save failed. Would you like to share to save instead?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Share to Save',
                                    onPress: async () => {
                                        await Sharing.shareAsync(localUri, {
                                            mimeType: 'image/jpeg',
                                            dialogTitle: 'Save Image'
                                        });
                                    }
                                }
                            ]
                        );
                    } else {
                        Alert.alert('Error', 'Failed to save image. Please try sharing instead.');
                    }
                }
            } else {
                await Sharing.shareAsync(localUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Save Image'
                });
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to process image. Please try again.');
        }
    };

    return (
        <View className="flex-1 bg-background-dark w-full">
            <LinearGradient
                colors={['#0f172a', '#1e1b4b']}
                className="flex-1 w-full"
            >
                <SafeAreaView className="flex-1 w-full">
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between w-full z-10">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/10 rounded-full">
                            <MaterialIcons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
                            <Text className="text-white text-lg font-bold">Preview</Text>
                        </View>
                        <View className="w-10" />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="flex-1 w-full"
                        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                    >
                        <ScrollView
                            className="flex-1 w-full"
                            contentContainerStyle={{ paddingBottom: 100 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="w-full px-4 pt-6 pb-6 items-center">
                                <View className="aspect-[3/4] w-full max-w-md bg-black/40 rounded-3xl overflow-hidden border border-white/10 relative justify-center items-center">
                                    {isGenerating ? (
                                        <View className="items-center">
                                            <ActivityIndicator size="large" color="#9333ea" />
                                            <Text className="text-white mt-4 font-bold">Generating Try-On...</Text>
                                            <Text className="text-white/60 text-xs mt-1">Weaving fabric onto model</Text>
                                        </View>
                                    ) : mainPreview ? (
                                        <Image
                                            source={{ uri: mainPreview }}
                                            className="w-full h-full"
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <View className="items-center p-6">
                                            <MaterialIcons name="auto-awesome" size={48} color="#475569" />
                                            <Text className="text-slate-500 mt-4 text-center font-medium">
                                                Your virtual try-on will appear here.
                                            </Text>
                                            <Text className="text-slate-600 text-xs mt-1 text-center">
                                                Click "Generate Try-On" to see the magic!
                                            </Text>
                                        </View>
                                    )}

                                    {generatedImage && !isGenerating && (
                                        <View className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-lg z-30 pointer-events-none">
                                            <Text className="text-white text-xs font-bold">Generated Result</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View className="px-6 pb-8 gap-6 w-full max-w-md self-center">
                                <View className="w-full">
                                    <Text className="text-slate-400 mb-3 text-sm font-bold uppercase">Background Scene</Text>
                                    <View className="flex-row bg-surface-dark p-1 rounded-xl border border-white/10 w-full">
                                        {['Studio', 'Outdoor'].map((scene) => (
                                            <TouchableOpacity
                                                key={scene}
                                                onPress={() => setBackgroundScene(scene)}
                                                className="flex-1 py-3 rounded-lg flex-row items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor: backgroundScene === scene ? 'white' : 'transparent',
                                                    shadowOpacity: backgroundScene === scene ? 0.1 : 0,
                                                }}
                                            >
                                                <MaterialIcons
                                                    name={scene === 'Studio' ? 'photo-camera' : 'wb-sunny'}
                                                    size={18}
                                                    color={backgroundScene === scene ? '#9333ea' : '#94a3b8'}
                                                />
                                                <Text
                                                    className="font-bold"
                                                    style={{ color: backgroundScene === scene ? '#9333ea' : '#94a3b8' }}
                                                >
                                                    {scene}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View className="w-full">
                                    <Text className="text-slate-400 mb-3 text-sm font-bold uppercase">Model Size</Text>
                                    <View className="flex-row gap-3 w-full">
                                        {['S', 'M', 'L', 'XL'].map((size) => (
                                            <TouchableOpacity
                                                key={size}
                                                onPress={() => setModelFit(size)}
                                                className="flex-1 h-12 rounded-xl items-center justify-center border"
                                                style={{
                                                    backgroundColor: modelFit === size ? '#9333ea' : 'rgba(255,255,255,0.05)',
                                                    borderColor: modelFit === size ? '#9333ea' : 'rgba(255,255,255,0.1)',
                                                }}
                                            >
                                                <Text
                                                    className="font-bold"
                                                    style={{ color: modelFit === size ? 'white' : '#94a3b8' }}
                                                >
                                                    {size}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View className="w-full">
                                    <View className="flex-row justify-between mb-3">
                                        <Text className="text-slate-400 text-sm font-bold uppercase">Additional Notes</Text>
                                        <Text className="text-slate-500 text-xs">{additionalNotes.length}/100</Text>
                                    </View>
                                    <TextInput
                                        value={additionalNotes}
                                        onChangeText={setAdditionalNotes}
                                        placeholder="E.g. Make it tighter, brighter colors..."
                                        placeholderTextColor="#64748b"
                                        multiline
                                        maxLength={100}
                                        numberOfLines={3}
                                        className="w-full bg-surface-dark border border-white/10 rounded-xl p-4 text-white"
                                        style={{ textAlignVertical: 'top', minHeight: 80 }}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full h-14 rounded-2xl items-center justify-center shadow-lg flex-row gap-2"
                                    style={{
                                        backgroundColor: isGenerating ? '#334155' : '#9333ea',
                                        shadowOpacity: isGenerating ? 0 : 0.3,
                                    }}
                                >
                                    {!isGenerating && <MaterialIcons name="auto-awesome" size={24} color="white" />}
                                    <Text className="text-white text-lg font-bold">
                                        {isGenerating ? 'Processing...' : 'Generate Try-On'}
                                    </Text>
                                </TouchableOpacity>

                                {generatedImage && (
                                    <View className="flex-row gap-4 w-full">
                                        <TouchableOpacity
                                            onPress={handleDownload}
                                            className="flex-1 h-12 rounded-xl items-center justify-center border border-white/20 bg-white/5 flex-row gap-2"
                                        >
                                            <MaterialIcons name="file-download" size={20} color="white" />
                                            <Text className="text-white font-bold">Download</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleShare}
                                            className="flex-1 h-12 rounded-xl items-center justify-center border border-white/20 bg-white/5 flex-row gap-2"
                                        >
                                            <MaterialIcons name="share" size={20} color="white" />
                                            <Text className="text-white font-bold">Share</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}
