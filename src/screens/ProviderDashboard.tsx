import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  navigation: any;
}

interface Job {
  id: string;
  location: string;
  area: number;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'available' | 'accepted';
  payment?: number;
  client?: string;
}

const ProviderDashboard: React.FC<Props> = ({ navigation }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<any>({ firstName: 'مقدم الخدمة' });
  const [activeTab, setActiveTab] = useState<'Home' | 'Jobs' | 'Track' | 'Profile'>('Home');

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    loadUser();

    const jobsRef = collection(db, 'jobs');
    const jobsQuery = query(jobsRef);
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData: Job[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Job, 'id'>),
      }));
      setJobs(jobsData);
    });

    return unsubscribe;
  }, []);

  const availableJobs = jobs.filter((job) => job.status === 'available');
  const myJobs = jobs.filter((job) => job.status !== 'available');
  const totalEarnings = jobs
    .filter((job) => job.status === 'completed')
    .reduce((sum, job) => sum + (job.payment || 0), 0);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'available':
        return 'Available';
      case 'in_progress':
        return 'In Progress';
      case 'accepted':
        return 'Accepted';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'available':
        return '#10B981';
      case 'in_progress':
      case 'accepted':
        return '#22D3EE';
      case 'completed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const formatMAD = (value?: number) => {
    return value != null ? `MAD ${value}` : 'MAD 0';
  };

  const handleLogout = async () => {
    Alert.alert('تأكيد', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('خطأ', 'فشل في تسجيل الخروج');
          }
        },
      },
    ]);
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await setDoc(jobRef, { status: 'accepted' }, { merge: true });
      Alert.alert('نجاح', 'تم قبول الطلب');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في قبول الطلب');
    }
  };

  const renderBottomNav = () => {
    const tabs = [
      { key: 'Home', label: 'Home', icon: '🏠' },
      { key: 'Jobs', label: 'Jobs', icon: '🗂️' },
      { key: 'Track', label: 'Track', icon: '📍' },
      { key: 'Profile', label: 'Profile', icon: '👤' },
    ] as const;

    return (
      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.navItem, activeTab === tab.key && styles.navItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={styles.navLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.welcome}>مرحباً،</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.firstName || 'مقدم الخدمة'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.earnings}>إجمالي الأرباح: {formatMAD(totalEarnings)}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{availableJobs.length}</Text>
            <Text style={styles.statLabel}>Available Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myJobs.length}</Text>
            <Text style={styles.statLabel}>My Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Jobs</Text>
          {availableJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobClient}>{job.client || 'Client'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
                </View>
              </View>
              <Text style={styles.jobDetails}>{job.location} • {job.area} m² • {job.date}</Text>
              <Text style={styles.jobPayment}>{formatMAD(job.payment)}</Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptJob(job.id)}
              >
                <Text style={styles.acceptButtonText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {renderBottomNav()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0A4F6E',
    padding: 20,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 5,
  },
  earnings: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jobClient: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  jobDetails: {
    color: '#475569',
    marginBottom: 8,
  },
  jobPayment: {
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#22D3EE',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#EFF9FF',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#374151',
  },
});

export default ProviderDashboard;
