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
		<View className="bg-gradient-to-tr from-[#f76e26] to-[#9d39d5] flex-1">
			<View className="flex-1 items-center justify-center">
            	<Text className="text-2xl font-bold"></Text>
				<Image source={require("./(fotos)/vector2.jpg")} className="rounded m-24" 
				style={{
					height: 200,
					width: 200,
					resizeMode: "contain",
				}}
				></Image>
			</View>
		</View>
	);
}
