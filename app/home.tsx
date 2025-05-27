import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, DocumentData, QuerySnapshot } from "firebase/firestore";
import { signOut, User as FirebaseUser } from "firebase/auth";
import { Text, View, ScrollView, Button } from "react-native";

export default function Home() {
  // Interface para os dados do usuário
  interface User {
    id: string;
    name: string;
    email: string;
  }

  // Estados para lista de usuários
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();

  // Função para listar usuários
  const listUsers = async (): Promise<User[]> => {
    try {
      const usersCollection = collection(db, "USERS");
      const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(usersCollection);
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
        } as User);
      });
      console.log("Usuários encontrados:", users);
      return users;
    } catch (error: any) {
      console.error("Erro ao listar usuários:", error.code, error.message);
      setError(error.message);
      return [];
    }
  };

  // Função para logout
  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setUsers([]);
      router.replace("/"); // Redirecionar para login
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Monitorar estado de autenticação e listar usuários
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Usuário atual:", currentUser?.uid);
      setUser(currentUser);
      if (currentUser) {
        const fetchUsers = async () => {
          setLoading(true);
          try {
            const usersData = await listUsers();
            setUsers(usersData);
          } catch (err: any) {
            setError(err.message || "Erro ao carregar usuários");
          } finally {
            setLoading(false);
          }
        };
        fetchUsers();
      } else {
        router.replace("/"); // Redirecionar para login se não autenticado
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <View className="flex-1 bg-gray-100 p-5">



    <Link href="/cadastro" asChild>
        <Text className="text-blue-500 mt-6">Criar grupo de competição</Text>
    </Link>




      {/* <Text className="text-2xl font-bold mb-6">Bem-vindo à Página Home!</Text>

      {loading ? (
        <Text className="text-center text-gray-600">Carregando...</Text>
      ) : error ? (
        <Text className="text-red-500 text-center">{error}</Text>
      ) : users.length === 0 ? (
        <Text className="text-gray-600 text-center">Nenhum usuário encontrado.</Text>
      ) : (
        <ScrollView className="w-full">
          {users.map((user) => (
            <View
              key={user.id}
              className="bg-white p-4 mb-2 rounded-lg border border-gray-200"
            >
              <Text className="text-base">Nome: {user.name}</Text>
              <Text className="text-base">Email: {user.email}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View className="mt-4">
        <Button
          title="Sair"
          onPress={handleLogout}
          disabled={loading}
          color="#ef4444" // Vermelho
        />
      </View> */}

      {/* <Link href="/" asChild>
        <Text className="text-blue-500 mt-6 text-center">Voltar para Login</Text>
      </Link> */}
    </View>
  );
}