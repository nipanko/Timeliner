import { useLocalSearchParams } from 'expo-router';

import { FocusScreen } from '@/features/focus/FocusScreen';

export default function FocusRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FocusScreen id={id} />;
}
