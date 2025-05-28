import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut, User as FirebaseUser } from "firebase/auth";
import { Text, View, ScrollView, Button, ActivityIndicator } from "react-native";

export default function Home() {
  interface Group {
    id: string;
    name: string;
    endDate: string;
    createdBy: string;
    members: string[];
    createdAt: string;
  }  

  interface Invite {
    id: string;
    groupId: string;
    groupName: string;
    invitedUserId: string;
    invitedBy: string;
    createdAt: string;
  }
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();
  
  const formatDateToDDMMYYYY = (isoDate: string): string => {
    const date = new Date(isoDate);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}-${day}-${year}`;
  };
  

  const listGroups = async (uid: string): Promise<Group[]> => {
    try {
      const groupsQuery = query(
        collection(db, "GROUPS"),
        where("members", "array-contains", uid)
      );
      const querySnapshot = await getDocs(groupsQuery);
      const groups: Group[] = [];
      querySnapshot.forEach((doc) => {
        groups.push({
          id: doc.id,
          ...doc.data(),
        } as Group);
      });
      console.log("Grupos encontrados:", groups);
      return groups;
    } catch (error: any) {
      console.error("Erro ao listar grupos:", error.code, error.message);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
      return [];
    }
  };

  const listInvites = async (uid: string): Promise<Invite[]> => {
    try {
      const invitesQuery = query(
        collection(db, "INVITES"),
        where("invitedUserId", "==", uid)
      );
      const querySnapshot = await getDocs(invitesQuery);
      const invites: Invite[] = [];
      querySnapshot.forEach((doc) => {
        invites.push({
          id: doc.id,
          ...doc.data(),
        } as Invite);
      });
      console.log("Convites encontrados:", invites);
      return invites;
    } catch (error: any) {
      console.error("Erro ao listar convites:", error.code, error.message);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
      return [];
    }
  };

  const handleAcceptInvite = async (invite: Invite) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Aceitando convite:", { id: invite.id, groupId: invite.groupId, invitedUserId: invite.invitedUserId });
      console.log("Usuário atual:", user?.uid);

      if (!user?.uid) {
        throw new Error("Usuário não autenticado");
      }

      const groupRef = doc(db, "GROUPS", invite.groupId);
      console.log("Buscando grupo:", invite.groupId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) {
        throw new Error("Grupo não encontrado");
      }
      const groupData = groupDoc.data();
      console.log("Grupo encontrado:", groupData);

      if (groupData.members.includes(user.uid)) {
        throw new Error("Usuário já é membro do grupo");
      }

      const updatedMembers = [...groupData.members, user.uid];
      console.log("Atualizando membros:", updatedMembers);
      await updateDoc(groupRef, { members: updatedMembers });

      console.log("Excluindo convite:", invite.id);
      await deleteDoc(doc(db, "INVITES", invite.id));

      console.log("Atualizando grupos e convites...");
      const updatedGroups = await listGroups(user.uid);
      const updatedInvites = await listInvites(user.uid);
      setGroups(updatedGroups);
      setInvites(updatedInvites);
      setError("Convite aceito com sucesso");
    } catch (error: any) {
      console.error("Erro ao aceitar convite:", error.code, error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Rejeitando convite:", inviteId);
      await deleteDoc(doc(db, "INVITES", inviteId));
      const updatedInvites = await listInvites(user!.uid);
      setInvites(updatedInvites);
      setError("Convite rejeitado");
    } catch (error: any) {
      console.error("Erro ao rejeitar convite:", error.code, error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fazendo logout...");
      await signOut(auth);
      setUser(null);
      setGroups([]);
      setInvites([]);
      router.replace("/");
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error.code, error.message);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Usuário atual:", currentUser?.uid);
      setUser(currentUser);
      if (currentUser && currentUser.uid) {
        const fetchData = async () => {
          setLoading(true);
          try {
            const groupsData = await listGroups(currentUser.uid);
            const invitesData = await listInvites(currentUser.uid);
            setGroups(groupsData);
            setInvites(invitesData);
          } catch (err: any) {
            console.error("Erro ao carregar dados:", err.code, err.message);
            setError(err.message || "Erro ao carregar dados");
            setTimeout(() => setError(null), 5000);
          } finally {
            setLoading(false);
          }
        };
        fetchData();
      } else {
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">Bem-vindo à Página Home!</Text>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text className="text-red-500 text-center">{error}</Text>}
      {!loading && (
        <>
          <Text className="text-lg font-bold mb-4">Convites Pendentes</Text>
          {invites.length === 0 ? (
            <Text className="text-gray-600 text-center mb-4">Nenhum convite pendente.</Text>
          ) : (
            <ScrollView className="w-full mb-4">
              {invites.map((invite) => (
                <View
                  key={invite.id}
                  className="bg-white p-4 mb-2 rounded-lg border border-gray-200 flex-row justify-between items-center"
                >
                  <Text className="text-base">{invite.groupName}</Text>
                  <View className="flex-row space-x-2">
                    <Button
                      title="Aceitar"
                      onPress={() => handleAcceptInvite(invite)}
                      color="#10b981"
                    />
                    <Button
                      title="Rejeitar"
                      onPress={() => handleRejectInvite(invite.id)}
                      color="#ef4444"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <Text className="text-lg font-bold mb-4">Meus Grupos</Text>
          {groups.length === 0 ? (
            <Text className="text-gray-600 text-center">Nenhum grupo encontrado.</Text>
          ) : (
            <ScrollView className="w-full">
              {groups.map((group) => (
                <View
                  key={group.id}
                  className="bg-white p-4 mb-2 rounded-lg border border-gray-200 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-base font-bold">{group.name}</Text>
                    <Text className="text-sm text-gray-600">
                      Termina em: {new Date(formatDateToDDMMYYYY(group.endDate)).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row space-x-2">
                    <Button
                      title="Ver"
                      onPress={() => router.push(`/grupo/${group.id}`)}
                      color="#3b82f6"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
      <View className="mt-4 space-y-2">
        <Button
          title="Criar Grupo"
          onPress={() => router.push("/criar-grupo")}
          color="#10b981"
        />
        <Button
          title="Sair"
          onPress={handleLogout}
          disabled={loading}
          color="#ef4444"
        />
      </View>
    </View>
  );
}