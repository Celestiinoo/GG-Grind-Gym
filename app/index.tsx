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
		<View className="flex-1 items-center">
            <Text className="text-2xl font-bold">PRIMEIRA PAGINA HEIN!</Text>
		</View>
	);
}
