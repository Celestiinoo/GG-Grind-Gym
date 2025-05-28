import { useRouter,router } from "expo-router";
import { useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { Text, View, TextInput, Button } from "react-native";

export default function CriarGrupo() {
  const [name, setName] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(""); // Formato: YYYY-MM-DD
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateGroup = async () => {
    if (!name || !endDate) {
      setError("Preencha todos os campos");
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      setError("Data inválida. Use o formato YYYY-MM-DD");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      await addDoc(collection(db, "GROUPS"), {
        name,
        endDate: new Date(endDate).toISOString(),
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        members: [user.uid], // Incluir criador como membro
      });

      router.replace("/home");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">Criar Novo Grupo</Text>

      <View className="w-full space-y-4">
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-base"
          placeholder="Nome do grupo"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-base"
          placeholder="Data de término (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          keyboardType="numeric"
        />
        <View className="mt-2">
          <Button
            title="Criar Grupo"
            onPress={handleCreateGroup}
            disabled={loading}
            color="#10b981"
          />
        </View>
        {loading && <Text className="text-center text-gray-600">Carregando...</Text>}
        {error && <Text className="text-red-500 text-center">{error}</Text>}
      </View>

      <Text
        className="text-blue-500 mt-6"
        onPress={() => router.push("/home")}
      >
        Voltar para Home
      </Text>
    </View>
  );
}