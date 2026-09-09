import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { getMyProfile, signOut, type Profile } from "@koino/core";
import { supabase } from "@/lib/supabase";
import { AuthForm } from "@/components/auth-form";

const STATUS_COPY: Record<Profile["status"], string> = {
  pending: "You're browsing as a guest. Request a chat with a community leader to unlock posting and rooms.",
  active: "You're a full member — posting and group rooms are unlocked.",
  suspended: "Your account has been suspended.",
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getMyProfile(supabase));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => loadProfile());
    return () => subscription.subscription.unsubscribe();
  }, [loadProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Koino</Text>

      {profile ? (
        <View style={styles.center}>
          <Text style={styles.username}>Signed in as {profile.username}</Text>
          <Text style={styles.copy}>{STATUS_COPY[profile.status]}</Text>
          <Text style={styles.meta}>
            status: {profile.status} · role: {profile.role}
          </Text>
          <Text style={styles.signOut} onPress={() => signOut(supabase)}>
            Sign out
          </Text>
        </View>
      ) : (
        <AuthForm onDone={loadProfile} />
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "600", marginBottom: 16 },
  username: { fontSize: 16 },
  copy: { fontSize: 13, color: "#666", textAlign: "center", maxWidth: 280 },
  meta: { fontSize: 12, color: "#999" },
  signOut: { fontSize: 14, color: "#666", textDecorationLine: "underline", marginTop: 8 },
});
