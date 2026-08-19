import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, setActive } = useSignIn();
  const router = useRouter();

  const { startSSOFlow: startGoogleOAuth } = useSSO();
  const { startSSOFlow: startAppleOAuth } = useSSO();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSignIn = async () => {
    if (!signIn) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (signIn.status === "complete" && setActive) {
        await setActive({ session: signIn.createdSessionId! });
        router.replace("/(tabs)");
      } else {
        setError("Sign-in incomplete. Please check your credentials.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Sign-in failed. Check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = React.useCallback(async () => {
    try {
      setOauthLoading("google");
      setError("");

      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl: Linking.createURL("/tabs", {
          scheme: "live-location-tracker",
        }),
        strategy: "oauth_google",
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      // setError(err?.errors?.[0]?.message || "Google sign-in failed");
    } finally {
      setOauthLoading(null);
    }
  }, [startGoogleOAuth, setActive, router]);

  // Apple Sign-In Handler
  const handleAppleSignIn = React.useCallback(async () => {
    try {
      setOauthLoading("apple");
      setError("");

      const { createdSessionId, setActive } = await startAppleOAuth({
        redirectUrl: Linking.createURL("/tabs", {
          scheme: "live-location-tracker",
        }),
        strategy: "oauth_google",
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("Apple OAuth error:", err);
      setError(err?.errors?.[0]?.message || "Apple sign-in failed");
    } finally {
      setOauthLoading(null);
    }
  }, [startAppleOAuth, router]);
  // const handleOAuth = async (provider: "google" | "apple") => {
  //   setError("");
  //   setOauthLoading(provider);
  //   try {
  //     const startFlow =
  //       provider === "google" ? startGoogleOAuth : startAppleOAuth;
  //     const { createdSessionId, setActive: setOAuthActive } = await startFlow();

  //     if (createdSessionId && setOAuthActive) {
  //       await setOAuthActive({ session: createdSessionId });
  //       router.replace("/(tabs)");
  //     }
  //   } catch (err: any) {
  //     const msg =
  //       err?.errors?.[0]?.longMessage ||
  //       err?.errors?.[0]?.message ||
  //       `${provider === "google" ? "Google" : "Apple"} sign-in was cancelled or failed. Enable OAuth in your Clerk Dashboard if not configured.`;
  //     setError(msg);
  //   } finally {
  //     setOauthLoading(null);
  //   }
  // };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>📍</Text>
            </View>
            <Text style={styles.appName}>Live Tracker</Text>
            <Text style={styles.subtitle}>Track. Trace. Stay Connected.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue</Text>

            {/* Social OAuth Buttons */}
            <View style={styles.oauthRow}>
              <TouchableOpacity
                id="google-signin-btn"
                style={styles.oauthBtn}
                onPress={handleGoogleSignIn}
                disabled={!!oauthLoading}
                activeOpacity={0.8}
              >
                {oauthLoading === "google" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.oauthIcon}>🌐</Text>
                    <Text style={styles.oauthText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                id="apple-signin-btn"
                style={styles.oauthBtn}
                onPress={handleAppleSignIn}
                disabled={!!oauthLoading}
                activeOpacity={0.8}
              >
                {oauthLoading === "apple" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.oauthIcon}>🍎</Text>
                    <Text style={styles.oauthText}>Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  id="sign-in-email"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  id="sign-in-password"
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Display */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              id="sign-in-btn"
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In →</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View nativeID="clerk-captcha" />
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f0c29" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  header: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 2,
    borderColor: "rgba(99,102,241,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 34 },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 20,
  },

  oauthRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  oauthBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  oauthIcon: { fontSize: 18 },
  oauthText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "700",
    letterSpacing: 1,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 15 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },

  errorBox: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  errorText: { color: "#f87171", fontSize: 13, lineHeight: 18 },

  btn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  footerText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  footerLink: { color: "#a78bfa", fontSize: 14, fontWeight: "700" },
});
