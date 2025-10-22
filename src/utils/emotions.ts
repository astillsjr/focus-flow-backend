export enum Emotion {
  // Positive Emotions
  Excited = "excited",
  Optimistic = "optimistic",
  Motivated = "motivated",
  Confident = "confident",
  Hopeful = "hopeful",
  Energized = "energized",
  Content = "content",
  Proud = "proud",
  Inspired = "inspired",
  Productive = "productive",
  Curious = "curious",
  Calm = "calm",
  Focused = "focused",

  // Neutral / Mixed Emotions
  Neutral = "neutral",
  Indifferent = "indifferent",
  Meh = "meh",
  Conflicted = "conflicted",
  Uncertain = "uncertain",
  Overwhelmed = "overwhelmed",
  Hesitant = "hesitant",
  Ambivalent = "ambivalent",

  // Negative Emotions
  Anxious = "anxious",
  Stressed = "stressed",
  Tired = "tired",
  BurnedOut = "burned_out",
  Frustrated = "frustrated",
  Angry = "angry",
  Annoyed = "annoyed",
  Irritated = "irritated",
  Hopeless = "hopeless",
  Fearful = "fearful",
  Nervous = "nervous",
  Dreading = "dreading",
  Discouraged = "discouraged",
  Insecure = "insecure",

  // Anticipatory Emotions
  Worried = "worried",
  Apprehensive = "apprehensive",
  Eager = "eager",

  // Avoidance / Resistance
  Avoidant = "avoidant",
  Procrastinating = "procrastinating",
  Resistant = "resistant",
  Stuck = "stuck",
  Hesitating = "hesitating",
}

export const ALL_EMOTIONS: Emotion[] = Object.values(Emotion);