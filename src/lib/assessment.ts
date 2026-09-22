export type AssessmentOutcome = 'correct' | 'incorrect' | 'self_corrected' | 'skipped'

export function calculateAssessmentResult(outcomes: AssessmentOutcome[], totalItems: number) {
  const score = outcomes.filter((outcome) => outcome === 'correct' || outcome === 'self_corrected').length
  return {
    score,
    total: totalItems,
    accuracy: totalItems > 0 ? (score / totalItems) * 100 : 0,
  }
}
