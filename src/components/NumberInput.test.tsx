// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'
import { NumberInput } from './ui'

afterEach(cleanup)

function Harness({ min = 10, max = 3600, initial = 120 }: { min?: number; max?: number; initial?: number }) {
  const [value, setValue] = useState(initial)
  return <><NumberInput min={min} max={max} value={value} onChange={setValue} aria-label="เวลา" /><output data-testid="value">{value}</output><button onClick={() => setValue(500)}>ตั้ง 500</button></>
}
const input = () => screen.getByLabelText('เวลา') as HTMLInputElement
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })

test('typing 180 digit by digit is not rewritten halfway by the minimum of 10', () => {
  render(<Harness />)
  fireEvent.focus(input())
  type('1'); expect(input().value).toBe('1') // below min: draft kept, not forced to 10
  type('18'); expect(input().value).toBe('18')
  type('180'); expect(input().value).toBe('180')
  expect(screen.getByTestId('value').textContent).toBe('180')
  fireEvent.blur(input())
  expect(input().value).toBe('180')
})

test('out-of-range drafts are clamped when leaving the field', () => {
  render(<Harness />)
  fireEvent.focus(input()); type('5'); fireEvent.blur(input())
  expect(input().value).toBe('10'); expect(screen.getByTestId('value').textContent).toBe('10')
  fireEvent.focus(input()); type('99999'); fireEvent.keyDown(input(), { key: 'Enter' })
  expect(input().value).toBe('3600'); expect(screen.getByTestId('value').textContent).toBe('3600')
})

test('clearing the field and leaving restores the last valid value; letters are ignored', () => {
  render(<Harness initial={60} />)
  fireEvent.focus(input()); type(''); expect(input().value).toBe('')
  fireEvent.blur(input()); expect(input().value).toBe('60')
  fireEvent.focus(input()); type('4a5'); expect(input().value).toBe('45')
})

test('follows changes made from outside while not focused', () => {
  render(<Harness />)
  fireEvent.click(screen.getByText('ตั้ง 500'))
  expect(input().value).toBe('500')
})
