import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FabricUploadScreen({ route, navigation }: any) {
    const { modelConfig } = route.params;
    const [files, setFiles] = useState<{ [key: string]: string | null }>({});

    const isShirt = ['shirt', 'tshirt'].includes(modelConfig.selectedAttire);

    const slots = isShirt
        ? [
            { id: 'fabric', label: 'Fabric Image', required: true, icon: 'texture' },
            { id: 'model', label: 'Model Photo', required: true, icon: 'person' }
        ]
        : [
            { id: 'model', label: 'Model Photo', required: true, icon: 'person' },
            { id: 'upper', label: 'Upper Wear Fabric', required: true, icon: 'checkroom' },
            { id: 'bottom', label: 'Bottom Wear Fabric', required: true, icon: 'checkroom' }
        ];

    const pickImage = async (slotId: string, useCamera: boolean) => {
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
                setFiles(prev => ({ ...prev, [slotId]: result.assets[0].uri }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleNext = () => {
        const missingRequired = slots.filter(slot => slot.required && !files[slot.id]);

        if (missingRequired.length > 0) {
            Alert.alert(
                'Missing Images',
                `Please upload images for: ${missingRequired.map(s => s.label).join(', ')}`
            );
            return;
        }

        // Pass files directly via navigation params
        navigation.navigate('Preview', {
            previews: files,
            modelConfig
        });
    };

    const hasAnyFile = Object.values(files).some(uri => uri !== null);

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
                            Upload {isShirt ? 'Shirt' : 'Outfit'} Details
                        </Text>
                        <Text className="text-slate-400 mb-8">
                            {isShirt
                                ? 'Provide fabric texture and optional model photo.'
                                : 'Provide model photo and fabrics for upper/bottom wear.'}
                        </Text>

                        <View className="gap-6 pb-8">
                            {slots.map((slot) => (
                                <View key={slot.id} className="bg-surface-dark border border-white/10 rounded-2xl p-4">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                                                <MaterialIcons name={slot.icon as any} size={20} color="#9333ea" />
                                            </View>
                                            <View>
                                                <Text className="text-white font-bold">{slot.label}</Text>
                                                <Text className="text-slate-500 text-xs">{slot.required ? 'Required' : 'Optional'}</Text>
                                            </View>
                                        </View>
                                        {files[slot.id] && (
                                            <TouchableOpacity
                                                onPress={() => setFiles(prev => ({ ...prev, [slot.id]: null }))}
                                                className="bg-red-500/20 p-2 rounded-full"
                                            >
                                                <MaterialIcons name="delete" size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {files[slot.id] ? (
                                        <View className="w-full h-48 rounded-xl overflow-hidden bg-black/50">
                                            <Image source={{ uri: files[slot.id]! }} className="w-full h-full" resizeMode="cover" />
                                        </View>
                                    ) : (
                                        <View className="flex-row gap-3">
                                            <TouchableOpacity
                                                onPress={() => pickImage(slot.id, false)}
                                                className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                            >
                                                <Text className="text-white font-medium">Gallery</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => pickImage(slot.id, true)}
                                                className="flex-1 bg-white/5 py-3 rounded-xl items-center justify-center border border-white/10"
                                            >
                                                <Text className="text-white font-medium">Camera</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ))}
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
