import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { Text, View, TextInput, Button } from "react-native";

export default function Cadastro() {
  // Estados para cadastro
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Função para registro
  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError("Preencha todos os campos");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "USERS", userCredential.user.uid), {
        name,
        email,
      });
      router.replace("/home"); // Redirecionar para Home
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">Cadastro</Text>

      <View className="w-full space-y-4">
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-base"
          placeholder="Nome"
          value={name}
          onChangeText={setName}
        />
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
            title="Cadastrar"
            onPress={handleSignUp}
            disabled={loading}
            color="#22c55e" // Verde
          />
        </View>
        {loading && <Text className="text-center text-gray-600">Carregando...</Text>}
        {error && <Text className="text-red-500 text-center">{error}</Text>}
      </View>

      <Link href="/" asChild>
        <Text className="text-blue-500 mt-6">Já tem conta? Faça login</Text>
      </Link>
    </View>
  );
}