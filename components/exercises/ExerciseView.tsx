import React from 'react';
import type { Exercise } from '@/data/types';
import { DialogueComplete } from './DialogueComplete';
import { FillBlank } from './FillBlank';
import { InteractiveStory } from './InteractiveStory';
import { ListeningTap } from './ListeningTap';
import { MatchPairs } from './MatchPairs';
import { MultipleChoice } from './MultipleChoice';
import { SpeakingRepeat } from './SpeakingRepeat';
import { TimedChallenge } from './TimedChallenge';
import { TypeTranslation } from './TypeTranslation';
import { WordBank } from './WordBank';
import type { ExProps } from './types';

export const AUTO_SUBMIT = new Set<Exercise['type']>(['INTERACTIVE_STORY', 'TIMED_CHALLENGE', 'MATCH_PAIRS']);
export const SILENT_RESULT = new Set<Exercise['type']>(['INTERACTIVE_STORY', 'TIMED_CHALLENGE']);

type Common = Omit<ExProps<Exercise>, 'ex'> & { scrollToEnd?: () => void };

export function ExerciseView({ ex, ...p }: { ex: Exercise } & Common) {
  switch (ex.type) {
    case 'WORD_BANK':
      return <WordBank ex={ex} {...p} />;
    case 'TYPE_TRANSLATION':
      return <TypeTranslation ex={ex} {...p} />;
    case 'MULTIPLE_CHOICE':
      return <MultipleChoice ex={ex} {...p} />;
    case 'LISTENING_TAP':
      return <ListeningTap ex={ex} {...p} />;
    case 'SPEAKING_REPEAT':
      return <SpeakingRepeat ex={ex} {...p} />;
    case 'MATCH_PAIRS':
      return <MatchPairs ex={ex} {...p} />;
    case 'FILL_BLANK':
      return <FillBlank ex={ex} {...p} />;
    case 'DIALOGUE_COMPLETE':
      return <DialogueComplete ex={ex} {...p} />;
    case 'INTERACTIVE_STORY':
      return <InteractiveStory ex={ex} {...p} />;
    case 'TIMED_CHALLENGE':
      return <TimedChallenge ex={ex} {...p} />;
  }
}
