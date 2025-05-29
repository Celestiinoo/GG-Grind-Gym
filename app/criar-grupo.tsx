import { useRouter } from "expo-router";
import { useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { Text, View, TextInput, Button, ActivityIndicator } from "react-native";

export default function CriarGrupo() {
  const [name, setName] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isValidDate = (dateStr: string): boolean => {
    const regex = /^\d{2}-\d{2}-\d{4}$/;
    if (!regex.test(dateStr)) return false;

    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  };

  const parseDateFromDDMMYYYY = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleCreateGroup = async () => {
    if (!name || !endDate) {
      setError("Preencha todos os campos");
      return;
    }

    if (!isValidDate(endDate)) {
      setError("Data inválida. Use o formato DD-MM-YYYY (ex.: 31-12-2025)");
      return;
    }

    try {
      const [day, month, year] = endDate.split('-').map(Number);
      const inputDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        setError("A data não pode ser anterior ao dia atual (28-05-2025)");
        return;
      }

      setLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const isoDate = parseDateFromDDMMYYYY(endDate);
      const groupData = {
        name,
        endDate: new Date(isoDate).toISOString(),
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        members: [user.uid],
      };

      console.log("Criando grupo:", groupData);
      await addDoc(collection(db, "GROUPS"), groupData);
      setError("Grupo criado com sucesso");
      router.replace("/home");
    } catch (error: any) {
      console.error("Erro ao criar grupo:", error.code, error.message);
      setError(`Erro: ${error.message}`);
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
          placeholder="Data de término (DD-MM-YYYY)"
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
        {loading && <ActivityIndicator size="large" color="#0000ff" />}
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