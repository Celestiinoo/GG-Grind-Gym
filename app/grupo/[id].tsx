import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import { Text, View, TextInput, Button, ScrollView, ActivityIndicator, Image } from "react-native";

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

  interface Photo {
    id: string;
    groupId: string;
    userId: string;
    url: string;
    votes: { [uid: string]: boolean };
    validated: boolean;
    createdAt: string;
  }

  const [group, setGroup] = useState<Group | null>(null);
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useLocalSearchParams();
  const router = useRouter();


  const formatDateToDDMMYYYY = (isoDate: string): string => {
    const date = new Date(isoDate);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  };

  const parseDateFromDDMMYYYY = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  // Valida data DD-MM-YYYY
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
        setNewEndDate(formatDateToDDMMYYYY(groupData.endDate));

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

        const photosQuery = query(
          collection(db, "PHOTOS"),
          where("groupId", "==", id)
        );
        const photosSnapshot = await getDocs(photosQuery);
        const photosData: Photo[] = [];
        photosSnapshot.forEach((doc) => {
          photosData.push({ id: doc.id, ...doc.data() } as Photo);
        });
        setPhotos(photosData);
      } catch (err: any) {
        console.error("Erro ao carregar grupo:", err.code, err.message);
        setError(`Erro: ${err.message}`);
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

    if (!isValidDate(newEndDate)) {
      setError("Data inválida. Use o formato DD-MM-YYYY (ex.: 31-12-2025)");
      return;
    }

    try {
      const [day, month, year] = newEndDate.split('-').map(Number);
      const inputDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        setError("A data não pode ser anterior ao dia atual");
        return;
      }

      setLoading(true);
      setError(null);

      if (!group) throw new Error("Grupo não carregado");

      const isoDate = parseDateFromDDMMYYYY(newEndDate);
      await updateDoc(doc(db, "GROUPS", group.id), {
        endDate: new Date(isoDate).toISOString(),
      });
      setGroup({ ...group, endDate: new Date(isoDate).toISOString() });
      setError("Data atualizada com sucesso");
    } catch (error: any) {
      console.error("Erro ao atualizar data:", error.code, error.message);
      setError(`Erro: ${error.message}`);
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

      const updatedMembers = [...group.members, userId];
      console.log("Adicionando membro:", userId);
      await updateDoc(doc(db, "GROUPS", group.id), {
        members: updatedMembers,
      });

      setGroup({ ...group, members: updatedMembers });
      setMembers([
        ...members,
        { id: userId, name: userDoc.data().name, email: userDoc.data().email },
      ]);
      setInviteEmail("");
      setError("Usuário adicionado com sucesso");
    } catch (error: any) {
      console.error("Erro ao adicionar usuário:", error.code, error.message);
      setError(`Erro: ${error.message}`);
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

      console.log("Excluindo grupo:", group.id);
      await deleteDoc(doc(db, "GROUPS", group.id));
      setError("Grupo excluído com sucesso");
      router.push("/home");
    } catch (error: any) {
      console.error("Erro ao excluir grupo:", error.code, error.message);
      setError(`Erro: ${error.message}`);
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
      console.error("Erro ao sair do grupo:", error.code, error.message);
      setError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("Usuário não autenticado");
      if (!group) throw new Error("Grupo não carregado");

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setError("Permissão para acessar a galeria é necessária");
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `photos/${group.id}/${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      console.log("Enviando foto:", url);
      const photoDoc = await addDoc(collection(db, "PHOTOS"), {
        groupId: group.id,
        userId: auth.currentUser.uid,
        url,
        votes: {},
        validated: false,
        createdAt: new Date().toISOString(),
      });

      setPhotos([...photos, {
        id: photoDoc.id,
        groupId: group.id,
        userId: auth.currentUser.uid,
        url,
        votes: {},
        validated: false,
        createdAt: new Date().toISOString(),
      }]);
      setError("Foto enviada com sucesso");
    } catch (error: any) {
      console.error("Erro ao enviar foto:", error.code, error.message);
      setError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (photoId: string, vote: boolean) => {
    setLoading(true);
    setError(null);
    try {
      if (!auth.currentUser) throw new Error("Usuário não autenticado");
      if (!group) throw new Error("Grupo não carregado");

      const photoRef = doc(db, "PHOTOS", photoId);
      const photoDoc = await getDoc(photoRef);
      if (!photoDoc.exists()) {
        throw new Error("Foto não encontrada");
      }

      const photoData = photoDoc.data() as Photo;
      const updatedVotes = { ...photoData.votes, [auth.currentUser.uid]: vote };
      const allVoted = group.members.every(uid => updatedVotes[uid] !== undefined);
      const validated = allVoted && Object.values(updatedVotes).every(v => v);

      console.log("Votando na foto:", photoId, "Voto:", vote);
      await updateDoc(photoRef, {
        votes: updatedVotes,
        validated,
      });

      setPhotos(photos.map(p =>
        p.id === photoId ? { ...p, votes: updatedVotes, validated } : p
      ));
      setError("Voto registrado");
    } catch (error: any) {
      console.error("Erro ao votar:", error.code, error.message);
      setError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateScores = () => {
    const scores: { [uid: string]: number } = {};
    members.forEach(m => { scores[m.id] = 0; });
    photos.forEach(p => {
      if (p.validated) {
        scores[p.userId] = (scores[p.userId] || 0) + 2;
      }
    });
    return scores;
  };

  const getWinners = () => {
    if (!group || new Date() < new Date(group.endDate)) return [];
    const scores = calculateScores();
    let maxScore = 0;
    const winners: Member[] = [];

    for (const [uid, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winners.length = 0;
        const member = members.find(m => m.id === uid);
        if (member) winners.push(member);
      } else if (score === maxScore && score > 0) {
        const member = members.find(m => m.id === uid);
        if (member) winners.push(member);
      }
    }

    return winners;
  };

  if (loading || !group) {
    return (
      <View className="flex-1 bg-gray-100 p-5">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="text-2xl font-bold mt-2 text-center">Carregando...</Text>
      </View>
    );
  }

  const scores = calculateScores();
  const winners = getWinners();

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold mb-6">{group.name}</Text>
      {error && <Text className="text-red-500 text-center mb-4">{error}</Text>}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <ScrollView className="flex-1">
        <View className="mb-4">
          <Text className="text-base mb-2">
            Data de término: {formatDateToDDMMYYYY(group.endDate)}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white text-base"
            placeholder="Nova data (DD-MM-YYYY)"
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

        <View className="mb-4">
          <Text className="text-base mb-2">Adicionar Membro</Text>
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
              title="Adicionar"
              onPress={handleInvite}
              disabled={loading}
              color="#3b82f6"
            />
          </View>
        </View>

        <View className="mb-4">
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
                  <Text className="text-base">Pontos: {scores[member.id] || 0}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-base font-bold mb-2">Enviar Foto</Text>
          <Button
            title="Selecionar Foto"
            onPress={handleUploadPhoto}
            disabled={loading}
            color="#10b981"
          />
        </View>

        <View className="mb-4">
          <Text className="text-base font-bold mb-2">Fotos</Text>
          {photos.length === 0 ? (
            <Text className="text-gray-600">Nenhuma foto enviada.</Text>
          ) : (
            <ScrollView>
              {photos.map((photo) => (
                <View
                  key={photo.id}
                  className="bg-white p-3 mb-2 rounded-lg border border-gray-200"
                >
                  <Image
                    source={{ uri: photo.url }}
                    className="w-full h-48 rounded-lg mb-2"
                    resizeMode="cover"
                  />
                  <Text className="text-base">
                    Enviada por: {members.find(m => m.id === photo.userId)?.name || "Desconhecido"}
                  </Text>
                  <Text className="text-base">
                    Status: {photo.validated ? "Validada" : "Pendente"}
                  </Text>
                  <Text className="text-base">
                    Votos: {Object.keys(photo.votes).length}/{group.members.length}
                  </Text>
                  {!photo.validated && !photo.votes[auth.currentUser?.uid || ""] && (
                    <View className="flex-row mt-2 space-x-2">
                      <Button
                        title="Votar Sim"
                        onPress={() => handleVote(photo.id, true)}
                        disabled={loading}
                        color="#10b981"
                      />
                      <Button
                        title="Votar Não"
                        onPress={() => handleVote(photo.id, false)}
                        disabled={loading}
                        color="#ef4444"
                      />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {winners.length > 0 && (
          <View className="mb-4 p-3 bg-green-100 rounded-lg">
            <Text className="text-base font-bold text-green-800">
              {winners.length === 1
                ? `Vencedor: ${winners[0].name} com ${scores[winners[0].id]} pontos!`
                : `Empate: ${winners.map(w => w.name).join(", ")} com ${scores[winners[0].id]} pontos!`}
            </Text>
          </View>
        )}
      </ScrollView>

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