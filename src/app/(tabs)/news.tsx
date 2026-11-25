import { Card, Screen, T } from '../../components/ui';
import { useProfile } from '../../data/ProfileProvider';

export default function News() {
  const { profile } = useProfile();
  return (
    <Screen>
      <T v="title">Industry pulse</T>
      <Card>
        <T v="h2">On hold</T>
        <T muted>The news feed is planned for a later build. Your saved topics are ready for it: {profile?.news_topics.join(', ') || 'none yet'}.</T>
      </Card>
    </Screen>
  );
}
