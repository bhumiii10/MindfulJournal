// src/services/suggestions.ts
type GetSuggestedGoalsParams = {
    mood?: string;
    dateISO: string;
    existing: string[];
  };
  
  export function getSuggestedGoals({ mood, existing }: GetSuggestedGoalsParams): string[] {
    const base = [
      "Gratitude journal (3 items)",
      "10-minute walk",
      "Hydrate (8 glasses)",
      "5-minute breathing",
      "Tidy one area"
    ];
  
    const moodMap: Record<string, string[]> = {
      down: ["Step outside for fresh air", "Make a cup of tea"],
      struggling: ["Write 1 worry and 1 action"],
      great: ["Plan one fun activity", "Reach out to a friend"],
      good: ["15-minute exercise"]
    };
  
    const moodKey = mood?.toLowerCase().trim() ?? "";
  
    const combined = [
      ...base,
      ...(moodMap[moodKey] || [])
    ];
  
    // Avoid duplicates (case insensitive)
    const existingLower = existing.map(t => t.toLowerCase().trim());
    return combined.filter(
      title => !existingLower.includes(title.toLowerCase().trim())
    );
  }
  