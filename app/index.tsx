import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Text, View, TextInput, Button, TouchableOpacity } from "react-native";

export default function Index() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

 
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Preencha e-mail e senha");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-5">
      <View className="w-20 h-20 bg-gradient-to-r from-[#9333EA] to-[#f47020] rounded-full flex items-center justify-center mx-auto mb-4 -mt-12">
        <Text className="text-3xl font-bold text-[#f47020]">G<Text className="text-3xl font-bold text-[#9333EA]">G</Text></Text>
      </View>
        <Text className="text-3xl text-[#f47020] font-bold mb-6">Grind<Text className="text-3xl text-[#9333EA] font-bold mb-6">Gym</Text></Text>

      <View className="w-full space-y-4">
        <TextInput
          className="border border-gray-500 rounded-lg p-3 text-white text-base"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          className="border border-gray-500 rounded-lg p-3 text-white text-base"
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View className="mt-2">
          <TouchableOpacity disabled={loading} onPress={handleLogin} className="p-3 
                      bg-[#9333EA] rounded-xl">
                        <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Entrar</Text>
           </TouchableOpacity>
        </View>
        {loading && <Text className="text-center text-[#f47020]">Carregando...</Text>}
        {error && <Text className="text-red-500 text-center">{error}</Text>}
      </View>

      <Link href="/cadastro" asChild>
        <Text className="text-blue-500 mt-6">Não tem conta? Cadastre-se</Text>
      </Link>
    </View>
  );
}