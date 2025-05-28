import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Text, View, TextInput, Button } from "react-native";

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
    <View className="flex-1 items-center justify-center bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">Login</Text>

      <View className="w-full space-y-4">
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-base"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-base"
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View className="mt-2">
          <Button
            title="Entrar"
            onPress={handleLogin}
            disabled={loading}
            color="#3b82f6" // Azul
          />
        </View>
        {loading && <Text className="text-center text-gray-600">Carregando...</Text>}
        {error && <Text className="text-red-500 text-center">{error}</Text>}
      </View>

      <Link href="/cadastro" asChild>
        <Text className="text-blue-500 mt-6">Não tem conta? Cadastre-se</Text>
      </Link>
    </View>
  );
}