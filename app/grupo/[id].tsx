import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, collection, addDoc } from "firebase/firestore";
import { Text, View, TextInput, Button, ScrollView, ActivityIndicator } from "react-native";

export default function Grupo() {
  interface Group {
    id: string;
    name: string;
    endDate: string;
    members: string[];
    createdBy: string;
  }

  interface Member {
    id: string;
    name: string;
    email: string;
  }

  const [group, setGroup] = useState<Group | null>(null);
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id || typeof id !== "string") {
        setError("ID do grupo inválido");
        setLoading(false);
        return;
      }

      try {
        console.log("Carregando grupo ID:", id);
        const groupDoc = await getDoc(doc(db, "GROUPS", id));
        if (!groupDoc.exists()) {
          setError("Grupo não encontrado");
          setLoading(false);
          return;
        }

        const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
        setGroup(groupData);
        setNewEndDate(new Date(groupData.endDate).toISOString().split("T")[0]);

        const memberData: Member[] = [];
        for (const memberId of groupData.members) {
          console.log("Carregando membro ID:", memberId);
          const userDoc = await getDoc(doc(db, "USERS", memberId));
          if (userDoc.exists()) {
            memberData.push({
              id: memberId,
              ...userDoc.data(),
            } as Member);
          }
        }
        setMembers(memberData);
      } catch (err: any) {
        console.error("Erro ao carregar grupo:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  const handleUpdateEndDate = async () => {
    if (!newEndDate) {
      setError("Preencha a data");
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newEndDate)) {
      setError("Data inválida. Use o formato YYYY-MM-DD");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!group) throw new Error("Grupo não carregado");
      await updateDoc(doc(db, "GROUPS", group.id), {
        endDate: new Date(newEndDate).toISOString(),
      });
      setGroup({ ...group, endDate: new Date(newEndDate).toISOString() });
      setError("Data atualizada com sucesso");
    } catch (err: any) {
        console.error("Erro ao atualizar data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      setError("Preencha o e-mail");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!group) throw new Error("Grupo não carregado");
      if (!auth.currentUser) throw new Error("Usuário não autenticado");
      console.log("Autenticado como:", auth.currentUser.uid);

      console.log("Buscando usuário com e-mail:", inviteEmail);
      const usersQuery = query(
        collection(db, "USERS"),
        where("email", "==", inviteEmail)
      );
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        setError("Usuário não encontrado");
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      console.log("Usuário encontrado, UID:", userId);

      if (group.members.includes(userId)) {
        setError("Usuário já é membro");
        setLoading(false);
        return;
      }

      console.log("Verificando convites existentes para grupo:", group.id, "e usuário:", userId);
      const invitesQuery = query(
        collection(db, "INVITES"),
        where("groupId", "==", group.id),
        where("invitedUserId", "==", userId)
      );
      const inviteSnapshot = await getDocs(invitesQuery);
      if (!inviteSnapshot.empty) {
        setError("Convite já enviado");
        setLoading(false);
        return;
      }

      console.log("Criando novo convite...");
      const inviteDoc = await addDoc(collection(db, "INVITES"), {
        groupId: group.id,
        groupName: group.name,
        invitedUserId: userId,
        invitedBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      });
      console.log("Convite criado com ID:", inviteDoc.id);

      setInviteEmail("");
      setError("Convite enviado com sucesso");
    } catch (error: any) {
      console.error("Erro ao enviar convite:", error.code, error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!group) throw new Error("Grupo não carregado");
      if (!auth.currentUser || auth.currentUser.uid !== group.createdBy) {
        throw new Error("Apenas o criador pode excluir o grupo");
      }

      console.log("Excluindo convites para grupo:", group.id);
      const invitesQuery = query(
        collection(db, "INVITES"),
        where("groupId", "==", group.id)
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      const deleteInvitePromises = invitesSnapshot.docs.map(async (docSnap) => {
        console.log("Deletando convite:", docSnap.id);
        await deleteDoc(doc(db, "INVITES", docSnap.id));
      });
      await Promise.all(deleteInvitePromises);

      console.log("Excluindo grupo:", group.id);
      await deleteDoc(doc(db, "GROUPS", group.id));
      setError("Grupo excluído com sucesso");
      router.push("/home");
    } catch (error: any) {
      console.error("Erro ao excluir grupo:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!group) throw new Error("Grupo não carregado");
      if (!auth.currentUser) throw new Error("Usuário não autenticado");
      if (auth.currentUser.uid === group.createdBy) {
        throw new Error("O criador não pode sair do grupo. Exclua o grupo.");
      }

      console.log("Usuário", auth.currentUser.uid, "saindo do grupo:", group.id);
      const updatedMembers = group.members.filter(
        (uid) => uid !== auth.currentUser!.uid
      );
      await updateDoc(doc(db, "GROUPS", group.id), {
        members: updatedMembers,
      });
      setGroup({ ...group, members: updatedMembers });
      setMembers(members.filter((m) => m.id !== auth.currentUser!.uid));
      setError("Você saiu do grupo com sucesso");
      router.push("/home");
    } catch (error: any) {
      console.error("Erro ao sair do grupo:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !group) {
    return (
      <View className="flex-1 bg-gray-100 p-5">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="text-2xl font-bold mb-2 text-center">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">{group.name}</Text>
      <View className="space-y-4">
        <View>
          <Text className="text-base mb-2">
            Data de término: {new Date(group.endDate).toLocaleDateString()}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white text-base"
            placeholder="Nova data (YYYY-MM-DD)"
            value={newEndDate}
            onChangeText={setNewEndDate}
            keyboardType="numeric"
          />
          <View className="mt-2">
            <Button
              title="Atualizar Data"
              onPress={handleUpdateEndDate}
              disabled={loading}
              color="#10b981"
            />
          </View>
        </View>
        <View>
          <Text className="text-base mb-2">Convidar usuário</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white text-base"
            placeholder="E-mail do usuário"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View className="mt-2">
            <Button
              title="Convidar"
              onPress={handleInvite}
              disabled={loading}
              color="#3b82f6"
            />
          </View>
        </View>
        <View>
          <Text className="text-base font-bold mb-2">Membros</Text>
          {members.length === 0 ? (
            <Text className="text-gray-600">Nenhum membro encontrado.</Text>
          ) : (
            <ScrollView className="max-h-40">
              {members.map((member) => (
                <View
                  key={member.id}
                  className="bg-white p-3 mb-2 rounded-lg border border-gray-200"
                >
                  <Text className="text-base">Nome: {member.name}</Text>
                  <Text className="text-base">Email: {member.email}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      {error && <Text className="text-red-500 mt-4 text-center">{error}</Text>}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <View className="mt-4 space-y-2">
        {auth.currentUser?.uid === group?.createdBy && (
          <Button
            title="Excluir Grupo"
            onPress={handleDeleteGroup}
            disabled={loading}
            color="#dc2626"
          />
        )}
        <Button
          title="Sair do Grupo"
          onPress={handleLeaveGroup}
          disabled={loading || auth.currentUser?.uid === group?.createdBy}
          color="#f97316"
        />
        <Button
          title="Voltar"
          onPress={() => router.push("/home")}
          disabled={loading}
          color="#ef4444"
        />
      </View>
    </View>
  );
}