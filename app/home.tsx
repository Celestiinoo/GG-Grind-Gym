import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
	Text,
	View,
	Image,
	TouchableOpacity,
	Button,
	ScrollView,
	TextInput,
	ActivityIndicator,
} from "react-native";
import { Colors } from "react-native/Libraries/NewAppScreen";

export default function Index() {
	return (
		<View className="flex-1 bg-gradient-to-b from-pink-100 to-white items-center gap-5">
      <View className="w-full p-4 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-black">
            Olá, Atleta! 
          </Text>
          <Text className="text-gray-500 text-sm">
            Pronto para competir?
          </Text>
        </View>
      </View>

      <View className="items-center">
        <View className="bg-white rounded-md w-10 h-10 justify-center items-center font-bold text-xl ">GG</View>
        <Text className="text-xl font-semibold text-gray-800 mt-2">
          Grind Gym
        </Text>
        <Text className="text-sm text-gray-500">
          Compita - Evolua - Conquiste
        </Text>
      </View>

      <View className="flex-row justify-between w-full px-4 gap-4">
        <View className="flex-1 bg-gradient-to-r from-pink-400 to-orange-400 rounded-xl p-4 shadow-md">
          <Text className="text-white text-sm">Competições Ativas</Text>
          <Text className="text-white text-3xl font-bold mt-2">12</Text>
        </View>
        <View className="flex-1 bg-gradient-to-r from-orange-400 to-purple-500 rounded-xl p-4 shadow-md">
          <Text className="text-white text-sm">Seus Rivais</Text>
          <Text className="text-white text-3xl font-bold mt-2">47</Text>
        </View>
      </View>

      <View className="w-full px-4 mt-6 gap-3">
        <TouchableOpacity className="bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl py-4 items-center shadow-md">
          <Text className="text-white font-semibold text-lg">
            Entrar em uma competição
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="border border-purple-500 rounded-xl py-4 items-center">
          <Text className="text-purple-500 font-semibold text-lg">
            Criar uma competição
          </Text>
        </TouchableOpacity>
      </View>
    </View>
	);
}
