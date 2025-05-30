import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import { Text, View, TextInput, Button, ScrollView, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

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
  const isLeaveButtonDisabled = loading || auth.currentUser?.uid === group?.createdBy;


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
        setTimeout(() => {
        setError(null); 
     }, 5000);
        setLoading(false);
        return;
      }

      try {
        console.log("Carregando grupo ID:", id);
        const groupDoc = await getDoc(doc(db, "GROUPS", id));
        if (!groupDoc.exists()) {
          setError("Grupo não encontrado");
          setTimeout(() => {
        setError(null); 
      }, 5000);
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
        setTimeout(() => {
      setError(null); 
    }, 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  const handleUpdateEndDate = async () => {
    if (!newEndDate) {
      setError("Preencha a data");
      setTimeout(() => {
      setError(null); 
    }, 5000);
      return;
    }

    if (!isValidDate(newEndDate)) {
      setError("Data inválida. Use o formato DD-MM-YYYY (ex.: 31-12-2025)");
      setTimeout(() => {
      setError(null); 
    }, 5000);
      return;
    }

    try {
      const [day, month, year] = newEndDate.split('-').map(Number);
      const inputDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        setError("A data não pode ser anterior ao dia atual");
        setTimeout(() => {
      setError(null); 
      }, 5000);
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
      setTimeout(() => {
      setError(null); 
    }, 5000);
    } catch (error: any) {
      console.error("Erro ao atualizar data:", error.code, error.message);
      setError(`Erro: ${error.message}`);
      setTimeout(() => {
      setError(null); 
    }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      setError("Preencha o e-mail");
      setTimeout(() => {
      setError(null); 
    }, 5000);
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
        setTimeout(() => {
      setError(null); 
      }, 5000);
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      console.log("Usuário encontrado, UID:", userId);

      if (group.members.includes(userId)) {
        setError("Usuário já é membro");
        setTimeout(() => {
        setError(null); 
      }, 5000);
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
      setTimeout(() => {
      setError(null); 
    }, 5000);
    } catch (error: any) {
      console.error("Erro ao adicionar usuário:", error.code, error.message);
      setError(`Erro: ${error.message}`);
      setTimeout(() => {
      setError(null); 
    }, 5000);
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
      setTimeout(() => {
      setError(null); 
    }, 5000);
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
      setTimeout(() => {
      setError(null); 
      }, 5000);
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
        setTimeout(() => {
      setError(null); 
      }, 5000);
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

      setTimeout(() => {
      setError(null); 
    }, 5000);
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
      <View className="flex-1 bg-slate-950 p-5">
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="text-2xl font-bold mt-2 text-center text-[#f47020]">Carregando...</Text>
      </View>
    );
  }

  const scores = calculateScores();
  const winners = getWinners();

  return (
    <View className="flex-1 bg-slate-950">
      <View className="">
      <Text className="px-5 mt-2 text-3xl font-bold mb-4 text-[#f47020]" style = {{ fontFamily: 'sans-serif' }}>{group.name} 🏆</Text>
      </View>
      <LinearGradient
        colors={['#9333EA', '#DB2777']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 4 }} 
      />
      {error && <Text className="text-red-500 text-center mb-4">{error}</Text>}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <ScrollView className="flex-1 p-5">
        <View className="mb-4">
          <Text className="text-lg mb-2 text-[#a740c1] font-bold" style = {{ fontFamily: 'sans-serif' }}>
            Data de término 📅: <Text className="text-white">{formatDateToDDMMYYYY(group.endDate)}</Text>
          </Text>
          <View className="p-5 rounded-xl border-2 border-[#9333EA]">
          <TextInput
            className="border border-gray-500 rounded-lg p-3 text-white text-base"
            placeholder="Nova data (DD-MM-YYYY)"
            value={newEndDate}
            onChangeText={setNewEndDate}
            keyboardType="numeric"
            />
          <View className="mt-4">
            <TouchableOpacity disabled={loading} onPress={handleUpdateEndDate} className="p-3 
            bg-gradient-to-r from-[#f47020]  to-[#9333EA] rounded-xl">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Atualizar Data</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg mb-2 text-[#a740c1] font-bold" style = {{ fontFamily: 'sans-serif' }}>Adicionar Membro ➕</Text>
          <View className="p-5 rounded-xl border-2 border-[#9333EA]">
          <TextInput
            className="border border-gray-500 rounded-lg p-3 text-white text-base"
            placeholder="E-mail do usuário"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            />
          <View className="mt-4">
            <TouchableOpacity disabled={loading} onPress={handleInvite} className="p-3 
            bg-gradient-to-r from-[#f47020]  to-[#9333EA] rounded-xl">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Adicionar</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg mb-2 text-[#a740c1] font-bold" style = {{ fontFamily: 'sans-serif' }}>Membros 👥</Text>
          <View className="p-2 rounded-xl border-2 border-[#9333EA]">

          {members.length === 0 ? (
            <Text className="text-gray-600">Nenhum membro encontrado.</Text>
          ) : (
            <ScrollView className="max-h-96">
              {members.map((member) => (
                <View
                key={member.id}
                className="p-3 mb-2 rounded-lg border border-[#f47020]"
                >
                  <Text className="text-base text-white font-bold" style = {{ fontFamily: 'sans-serif' }}>Nome: {member.name}</Text>
                  <Text className="text-base text-white font-bold" style = {{ fontFamily: 'sans-serif' }}>Email: {member.email}</Text>
                  <Text className="text-base text-green-500 font-bold" style = {{ fontFamily: 'sans-serif' }}>Pontos:<Text className="text-green-500"> {scores[member.id] || 0}</Text> </Text>
                </View>
              ))}
            </ScrollView>
          )}
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg mb-2 text-[#a740c1] font-bold" style = {{ fontFamily: 'sans-serif' }}>Enviar Foto 📥</Text>
          <TouchableOpacity disabled={loading} onPress={handleUploadPhoto} className="p-3 
            bg-gradient-to-r from-[#f47020]  to-[#9333EA] rounded-xl">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Selecionar Foto</Text>
            </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-lg mb-2 text-[#a740c1] font-bold">Fotos 📷</Text>
          {photos.length === 0 ? (
            <Text className="text-gray-600">Nenhuma foto enviada.</Text>
          ) : (
            <ScrollView>
              {photos.map((photo) => (
                <View
                  key={photo.id}
                  className="p-3 mb-2 rounded-lg border-2 border-[#f47020]"
                >
                  <Image
                    source={{ uri: photo.url }}
                    className="w-full h-48 rounded-lg border-2 border-[#a740c1] mb-2"
                    resizeMode="cover"
                  />
                  <Text className="text-base text-white font-bold" style = {{ fontFamily: 'sans-serif' }}>
                    Enviada por: {members.find(m => m.id === photo.userId)?.name || "Desconhecido"}
                  </Text>
                  <Text className="text-base text-white font-bold" style = {{ fontFamily: 'sans-serif' }}>
                    Status: {photo.validated ? "Validada" : "Pendente"}
                  </Text>
                  <Text className="text-base text-green-500 font-bold" style = {{ fontFamily: 'sans-serif' }}>
                    Votos: {Object.keys(photo.votes).length}/{group.members.length}
                  </Text>
                  {!photo.validated && !photo.votes[auth.currentUser?.uid || ""] && (
                    <View className="flex-row mt-2 space-x-2">
                      <TouchableOpacity disabled={loading} onPress={() => handleVote(photo.id, true)} className="p-3 
            bg-green-500 rounded-md">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Votar SIM</Text>
            </TouchableOpacity>
                      <TouchableOpacity disabled={loading} onPress={() => handleVote(photo.id, false)} className="p-3 
            bg-red-500 rounded-md">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Votar NÃO</Text>
            </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {winners.length > 0 && (
          <View className="mb-4 p-3 bg-green-100 rounded-lg border-">
            <Text className="text-base font-bold text-green-800">
              {winners.length === 1
                ? ` Vencedor: ${winners[0].name} 🏆 com ${scores[winners[0].id]} pontos!`
                : `Empate: ${winners.map(w => w.name).join(", ")} com ${scores[winners[0].id]} pontos!`}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="mt-4 space-y-2 p-4">
        {auth.currentUser?.uid === group?.createdBy && (
          <TouchableOpacity disabled={loading} onPress={handleDeleteGroup} className="p-1 
            bg-red-500 rounded-md">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Excluir grupo</Text>
            </TouchableOpacity>
        )}
        <View>
          <TouchableOpacity disabled={loading || auth.currentUser?.uid === group?.createdBy}  onPress={handleLeaveGroup} className={`p-1 rounded-md ${isLeaveButtonDisabled ? 'bg-gray-500' : 'bg-[#f97316]'}`}>
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Sair do Grupo</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.push("../home")} className="p-1 
            bg-[#ef4444] rounded-md">
              <Text style = {{ fontFamily: 'sans-serif' }} className="self-center font-bold text-white text-lg">Voltar</Text>
            </TouchableOpacity>
      </View>
    </View>
  );
}