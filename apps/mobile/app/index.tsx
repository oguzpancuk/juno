import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>stardate</Text>
      <Text style={styles.subtitle}>walking skeleton · S0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b1a',
  },
  title: {
    color: '#f5f2ff',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#9a94b8',
    fontSize: 14,
    marginTop: 8,
  },
});
