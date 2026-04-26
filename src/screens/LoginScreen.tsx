import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as GoogleAuthSession from 'expo-auth-session/providers/google';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  navigation: any;
}

type UserRole = 'client' | 'provider' | 'admin';

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = GoogleAuthSession.useIdTokenAuthRequest({
    clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      handleGoogleAuth(response.params.id_token);
    }
  }, [response]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/wrong-password':
        return 'كلمة المرور غير صحيحة';
      case 'auth/user-not-found':
        return 'المستخدم غير موجود';
      case 'auth/email-already-in-use':
        return 'البريد الإلكتروني مستخدم بالفعل';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة جداً';
      case 'auth/invalid-email':
        return 'البريد الإلكتروني غير صحيح';
      default:
        return 'حدث خطأ في المصادقة';
    }
  };

  const saveUserData = async (user: {
    email: string | null;
    uid: string;
    role: UserRole;
    firstName: string;
  }) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('token', user.uid);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      const userCredential = isLogin
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);

      const firebaseUser = userCredential.user;
      const userData = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        role: selectedRole,
        firstName: firebaseUser.displayName || email.split('@')[0],
      };

      await saveUserData(userData);
      navigation.replace(selectedRole === 'provider' ? 'ProviderDashboard' : 'ClientDashboard');
    } catch (error: any) {
      Alert.alert('خطأ في المصادقة', getErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (idToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;
      const userData = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        role: selectedRole,
        firstName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم جوجل',
      };

      await saveUserData(userData);
      navigation.replace(selectedRole === 'provider' ? 'ProviderDashboard' : 'ClientDashboard');
    } catch (error: any) {
      Alert.alert('خطأ في جوجل', getErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (request) {
      promptAsync();
    } else {
      Alert.alert('جوجل', 'طلب المصادقة غير جاهز بعد');
    }
  };

  const roleOptions = [
    { key: 'client', label: 'عميل 🏨', description: 'حجز خدمات التنظيف' },
    { key: 'provider', label: 'مقدم خدمة 🧹', description: 'تقديم خدمات التنظيف' },
    { key: 'admin', label: 'مدير ⚙️', description: 'إدارة المنصة' },
  ];

  return (
    <LinearGradient colors={['#0A4F6E', '#22D3EE']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>مرحباً بك في Cleanwave</Text>
          <Text style={styles.subtitle}>تنظيف الشواطئ أصبح سهلاً</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>اختر دورك</Text>
          <View style={styles.roleSelector}>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleButton,
                  selectedRole === role.key && styles.roleButtonSelected,
                ]}
                onPress={() => setSelectedRole(role.key as UserRole)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === role.key && styles.roleButtonTextSelected,
                  ]}
                >
                  {role.label}
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    selectedRole === role.key && styles.roleDescriptionSelected,
                  ]}
                >
                  {role.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            placeholderTextColor="#E5E7EB"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            placeholderTextColor="#E5E7EB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>المتابعة بجوجل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchModeText}>
              {isLogin ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A4F6E',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0F2FE',
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleButton: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    marginBottom: 12,
  },
  roleButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  roleButtonTextSelected: {
    color: '#F8FAFC',
  },
  roleDescription: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  roleDescriptionSelected: {
    color: '#F8FAFC',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  primaryButton: {
    backgroundColor: '#22D3EE',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  googleButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchMode: {
    alignSelf: 'center',
    marginTop: 6,
  },
  switchModeText: {
    color: '#E0F2FE',
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dividerText: {
    color: '#E0F2FE',
    marginHorizontal: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default LoginScreen;
