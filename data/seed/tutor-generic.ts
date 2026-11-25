import type { TutorKit } from '../types';

/** Minimal offline tutor for imported courses that do not ship their own TutorKit. */
export function genericTutorKit(targetName: string): TutorKit {
  return {
    openers: [{ t: `Hello! Let us practice ${targetName} together. How are you today?`, n: 'Hello! How are you today?' }],
    topics: [
      {
        keys: ['hello', 'hi', 'hola', 'bonjour', 'hallo'],
        replies: [{ t: 'Hello! Nice to talk to you. What did you do today?', n: 'Hello! What did you do today?' }],
      },
      {
        keys: ['bye', 'goodbye', 'adios', 'au revoir'],
        replies: [{ t: 'Goodbye! You did very well. See you soon!', n: 'Goodbye!' }],
      },
    ],
    fallbacks: [
      { t: 'Interesting! Can you tell me more?', n: 'Tell me more.' },
      { t: 'Could you say that in a different way?', n: 'Say it differently.' },
    ],
    fixes: [],
    closers: [{ t: 'Great talking with you! Keep practicing.', n: 'Keep practicing!' }],
  };
}
