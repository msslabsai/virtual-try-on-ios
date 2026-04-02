import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FabricUploadScreen({ route, navigation }: any) {
    const { modelConfig } = route.params;
    const [modelImage, setModelImage] = useState<string | null>(null);
    const [designImage, setDesignImage] = useState<string | null>(null);
    const [clothImages, setClothImages] = useState<string[]>([]);

    const pickImage = async (useCamera: boolean, onPick: (uri: string) => void) => {
        try {
            let result;
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Permission Required', 'Please allow camera access to take photos.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: 'images',
                    quality: 0.8,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    quality: 0.8,
                });
            }

            if (!result.canceled) {
                onPick(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleNext = () => {
        if (clothImages.length === 0) {
            Alert.alert(
                'Missing Images',
                'Please upload at least one cloth image to continue.'
            );
            return;
        }

        // Pass files directly via navigation params
        navigation.navigate('Preview', {
            previews: {
                model: modelImage,
                designImage,
                clothImages: clothImages
            },
            modelConfig
        });
    };

    return (
        <View className="flex-1 bg-background-dark">
            <LinearGradient
                colors={['#0f172a', '#1e1b4b']}
                className="flex-1"
            >
                <SafeAreaView className="flex-1">
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/10 rounded-full">
                            <MaterialIcons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-lg font-bold">Upload Details</Text>
                        <View className="w-10" />
                    </View>

                    <ScrollView className="flex-1 px-6 pt-6">
                        <Text className="text-2xl font-bold text-white mb-2">
                            Upload Outfit Details
                        </Text>
                        <Text className="text-slate-400 mb-8">
                            Add an optional model photo, an optional design image, and up to 3 cloth images.
                        </Text>

                        <View className="gap-6 pb-8">
                            <View className="bg-surface-dark border border-white/10 rounded-2xl p-4">
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                                            <MaterialIcons name="person" size={20} color="#9333ea" />
                                        </View>
                                        <View>
                                            <Text className="text-white font-bold">Model Photo</Text>
                                            <Text className="text-slate-500 text-xs">Optional</Text>
                                        </View>
                                    </View>
                                    {modelImage && (
                                        <TouchableOpacity
                                            onPress={() => setModelImage(null)}
                                            className="bg-red-500/20 p-2 rounded-full"
                                        >
                                            <MaterialIcons name="delete" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {modelImage ? (
                                    <View className="w-full h-48 rounded-xl overflow-hidden bg-black/50">
                                        <Image source={{ uri: modelImage }} className="w-full h-full" resizeMode="cover" />
                                    </View>
                                ) : (
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity
                                            onPress={() => pickImage(false, (uri) => setModelImage(uri))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Gallery</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => pickImage(true, (uri) => setModelImage(uri))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Camera</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View className="bg-surface-dark border border-white/10 rounded-2xl p-4">
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                                            <MaterialIcons name="design-services" size={20} color="#9333ea" />
                                        </View>
                                        <View>
                                            <Text className="text-white font-bold">Design</Text>
                                            <Text className="text-slate-500 text-xs">Optional</Text>
                                        </View>
                                    </View>
                                    {designImage && (
                                        <TouchableOpacity
                                            onPress={() => setDesignImage(null)}
                                            className="bg-red-500/20 p-2 rounded-full"
                                        >
                                            <MaterialIcons name="delete" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {designImage ? (
                                    <View className="w-full h-48 rounded-xl overflow-hidden bg-black/50">
                                        <Image source={{ uri: designImage }} className="w-full h-full" resizeMode="cover" />
                                    </View>
                                ) : (
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity
                                            onPress={() => pickImage(false, (uri) => setDesignImage(uri))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Gallery</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => pickImage(true, (uri) => setDesignImage(uri))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Camera</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View className="bg-surface-dark border border-white/10 rounded-2xl p-4">
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                                            <MaterialIcons name="checkroom" size={20} color="#9333ea" />
                                        </View>
                                        <View>
                                            <Text className="text-white font-bold">Cloth Images</Text>
                                            <Text className="text-slate-500 text-xs">Up to 3</Text>
                                        </View>
                                    </View>
                                    <Text className="text-slate-500 text-xs">{clothImages.length}/3</Text>
                                </View>

                                {clothImages.length > 0 && (
                                    <View className="gap-3 mb-4">
                                        {clothImages.map((uri, index) => (
                                            <View key={`${uri}-${index}`} className="w-full h-40 rounded-xl overflow-hidden bg-black/50 relative">
                                                <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                                                <TouchableOpacity
                                                    onPress={() => setClothImages(prev => prev.filter((_, i) => i !== index))}
                                                    className="absolute top-3 right-3 bg-red-500/80 p-2 rounded-full"
                                                >
                                                    <MaterialIcons name="close" size={16} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {clothImages.length < 3 && (
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity
                                            onPress={() => pickImage(false, (uri) => setClothImages(prev => [...prev, uri]))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Add from Gallery</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => pickImage(true, (uri) => setClothImages(prev => [...prev, uri]))}
                                            className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                        >
                                            <Text className="text-white font-medium">Add from Camera</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>

                    <View className="p-6 border-t border-white/10 bg-background-dark/80">
                        <TouchableOpacity
                            onPress={handleNext}
                            className="w-full bg-primary h-14 rounded-2xl items-center justify-center shadow-lg shadow-primary/30"
                        >
                            <Text className="text-white text-lg font-bold">Visualize Try-On</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}
