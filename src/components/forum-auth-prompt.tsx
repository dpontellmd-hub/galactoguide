import { AuthPrompt } from '@/components/auth-prompt';

export function ForumAuthPrompt({ action = 'join the conversation' }: { action?: string }) {
  return (
    <AuthPrompt
      icon="chatbubbles-outline"
      title="Read along or sign in"
      body={`Browse every thread, or sign in or create an account to ${action}.`}
      accessibilityLabel={`Sign in or create an account to ${action}`}
    />
  );
}
