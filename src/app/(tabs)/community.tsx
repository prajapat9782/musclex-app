import { Card, Screen, T } from '../../components/ui';

export default function Community() {
  return (
    <Screen>
      <T v="title">Community</T>
      <Card>
        <T v="h2">Coming in the next build</T>
        <T muted>Public journeys, follows, cheers and the Top streaks leaderboard. Your profile is already set to public by default — you can change that in Profile.</T>
      </Card>
    </Screen>
  );
}
