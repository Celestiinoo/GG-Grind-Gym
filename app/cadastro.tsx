import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { Text, View, TextInput, Button, TouchableOpacity } from "react-native";

export default function Cadastro() {

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

 
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

      {/* <Text className="text-2xl font-bold mb-6">Cadastro</Text> */}

      <View className="w-full space-y-4">
        <TextInput
          className="border border-gray-300 rounded-lg p-3 text-white text-base"
          placeholder="Nome"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="border border-gray-300 rounded-lg p-3 text-white text-base"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          className="border border-gray-300 rounded-lg p-3 text-white text-base"
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
        className="
        bg-[#9333EA] rounded-xl p-3 mt-2"
        onPress={handleSignUp}
        disabled={loading}>

         <Text className="self-center font-bold text-white text-lg">Cadastrar</Text>


        </TouchableOpacity>
        
        {loading && <Text className="text-center text-gray-600">Carregando...</Text>}
        {error && <Text className="text-red-500 text-center">{error}</Text>}
      </View>

      <Link href="/" asChild>
        <Text className="text-blue-500 mt-6">Já tem conta? Faça login</Text>
      </Link>
    </View>
  );
}