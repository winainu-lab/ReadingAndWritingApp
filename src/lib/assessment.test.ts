import { describe, expect, it } from 'vitest'
import { calculateAssessmentResult } from './assessment'

describe('calculateAssessmentResult', () => {
  it('นับการอ่านถูกและแก้ไขเองเป็นคะแนน', () => {
    expect(calculateAssessmentResult(['correct', 'self_corrected', 'incorrect', 'skipped'], 4)).toEqual({
      score: 2,
      total: 4,
      accuracy: 50,
    })
  })

  it('ไม่หารด้วยศูนย์เมื่อไม่มีข้อสอบ', () => {
    expect(calculateAssessmentResult([], 0)).toEqual({ score: 0, total: 0, accuracy: 0 })
  })
})
