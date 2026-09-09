import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signIn, signUp, signInSchema, signUpSchema } from "@koino/core";
import { supabase } from "@/lib/supabase";

export function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed =
      mode === "sign-up"
        ? signUpSchema.safeParse({ email, password, username })
        : signInSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setPending(true);
    try {
      if (mode === "sign-up") {
        await signUp(supabase, parsed.data as { email: string; password: string; username: string });
      } else {
        await signIn(supabase, parsed.data as { email: string; password: string });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.tabs}>
        <Text
          style={[styles.tab, mode === "sign-up" && styles.tabActive]}
          onPress={() => setMode("sign-up")}
        >
          Sign up
        </Text>
        <Text
          style={[styles.tab, mode === "sign-in" && styles.tabActive]}
          onPress={() => setMode("sign-in")}
        >
          Sign in
        </Text>
      </View>

      {mode === "sign-up" && (
        <TextInput
          style={styles.input}
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={pending}>
        <Text style={styles.buttonText}>
          {pending ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
        </Text>
      </Pressable>

      {mode === "sign-up" && (
        <Text style={styles.hint}>
          New accounts start as a guest — you can browse, but posting and rooms unlock
          once a community leader vouches for you.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", maxWidth: 340, gap: 10 },
  tabs: { flexDirection: "row", gap: 16, marginBottom: 8 },
  tab: { color: "#999", fontSize: 14 },
  tabActive: { color: "#111", fontWeight: "600", textDecorationLine: "underline" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  error: { color: "#c00", fontSize: 13 },
  button: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 11, color: "#999", marginTop: 4 },
});
