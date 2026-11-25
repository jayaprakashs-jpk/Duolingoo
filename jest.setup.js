// Mocks for native-only modules so screens can render in Node. The UI code itself is NOT mocked.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@/services/sound', () => ({ haptic: jest.fn(), play: jest.fn(), configureFeedback: jest.fn(), initAudio: jest.fn() }));
jest.mock('@/services/speech', () => ({ speak: jest.fn(), stopSpeaking: jest.fn(), hasVoice: jest.fn(async () => true) }));
jest.mock('@/services/db', () => ({
  enqueue: jest.fn(async () => {}),
  listCustomCourses: jest.fn(async () => []),
  saveCustomCourse: jest.fn(async () => {}),
  deleteCustomCourse: jest.fn(async () => {}),
  queueSize: jest.fn(async () => 0),
  resetLearningData: jest.fn(async () => {}),
  getWords: jest.fn(async () => []),
  mistakeCount: jest.fn(async () => 0),
  recordExercise: jest.fn(async () => {}),
  recordWord: jest.fn(async () => {}),
}));
jest.mock('@/services/account', () => ({ signIn: jest.fn(), signUp: jest.fn(), signOutAccount: jest.fn() }));

// expo-router: record navigation so tests can assert where a tap leads
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
global.__router = mockRouter;
global.__params = {};
jest.mock('expo-router', () => ({
  useRouter: () => global.__router,
  useLocalSearchParams: () => global.__params,
  Redirect: () => null,
  useFocusEffect: () => {},
  Link: ({ children }) => children,
}));
jest.mock('@/services/stt', () => ({
  sttAvailable: jest.fn(async () => false),
  startListening: jest.fn(async () => false),
  stopListening: jest.fn(async () => {}),
  cancelListening: jest.fn(async () => {}),
}));
