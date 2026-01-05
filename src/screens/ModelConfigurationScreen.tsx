import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ATTIRE_OPTIONS = [
    { value: 'saree', label: 'Saree', icon: 'checkroom' }, // Using available icons
    { value: 'lehenga', label: 'Lehenga', icon: 'checkroom' },
    { value: 'dress', label: 'Dress', icon: 'checkroom' },
    { value: 'kurti', label: 'Kurti', icon: 'checkroom' },
    { value: 'indian_rajputi_poshak', label: 'Indian Rajputi Poshak', icon: 'checkroom' }
];

export default function ModelConfigurationScreen({ navigation }: any) {
    const [selectedAttire, setSelectedAttire] = useState('saree');

    const handleContinue = () => {
        navigation.navigate('FabricUpload', {
            modelConfig: {
                selectedGender: 'Female',
                selectedAttire: selectedAttire
            }
        });
    };

    return (
        <View className="flex-1 bg-background-dark">
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0f172a', '#1e1b4b']}
                className="flex-1"
            >
                <SafeAreaView className="flex-1">
                    <View className="px-6 py-4 border-b border-white/10 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-primary rounded-xl items-center justify-center">
                                <MaterialIcons name="view-in-ar" size={24} color="white" />
                            </View>
                            <Text className="text-white text-xl font-bold">Virtual Studio</Text>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-8">
                        <Text className="text-3xl font-bold text-white mb-2">
                            Select Your Outfit
                        </Text>
                        <Text className="text-slate-400 text-lg mb-8">
                            Choose the type of clothing you want to visualize.
                        </Text>

                        <View className="gap-4">
                            {ATTIRE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => setSelectedAttire(option.value)}
                                    className={`flex-row items-center p-4 rounded-2xl border ${selectedAttire === option.value
                                        ? 'bg-primary/20 border-primary'
                                        : 'bg-surface-dark border-white/10'
                                        }`}
                                >
                                    <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedAttire === option.value ? 'bg-primary' : 'bg-white/10'
                                        }`}>
                                        <MaterialIcons
                                            name={option.icon as any}
                                            size={24}
                                            color={selectedAttire === option.value ? 'white' : '#94a3b8'}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-lg font-bold ${selectedAttire === option.value ? 'text-white' : 'text-slate-300'
                                            }`}>
                                            {option.label}
                                        </Text>
                                    </View>
                                    {selectedAttire === option.value && (
                                        <MaterialIcons name="check-circle" size={24} color="#9333ea" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View className="p-6 border-t border-white/10 bg-background-dark/80">
                        <TouchableOpacity
                            onPress={handleContinue}
                            className="w-full bg-primary h-14 rounded-2xl items-center justify-center shadow-lg shadow-primary/30"
                        >
                            <Text className="text-white text-lg font-bold">Continue</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
}
