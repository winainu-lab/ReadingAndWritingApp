import { describe, expect, it } from 'vitest'
import { groupSchoolsByNetwork, sortSchoolsByNetwork, type SchoolChoice } from './schoolSorting'

const schools: SchoolChoice[] = [
  { id: '3', name: 'โรงเรียน ค', district: 'ข', network_center_id: 'b', network_center: { name: 'ศูนย์ 2', sort_order: 2 } },
  { id: '2', name: 'โรงเรียน ข', district: 'ก', network_center_id: 'a', network_center: { name: 'ศูนย์ 1', sort_order: 1 } },
  { id: '1', name: 'โรงเรียน ก', district: 'ก', network_center_id: 'a', network_center: { name: 'ศูนย์ 1', sort_order: 1 } },
]

describe('school network ordering', () => {
  it('sorts by the configured network order before the school name', () => {
    expect(sortSchoolsByNetwork(schools).map((school) => school.id)).toEqual(['1', '2', '3'])
  })

  it('keeps each network center together', () => {
    expect(groupSchoolsByNetwork(schools).map((group) => [group.name, group.schools.length])).toEqual([
      ['ศูนย์ 1', 2],
      ['ศูนย์ 2', 1],
    ])
  })
})
