import type { School } from '../types/app'

export type SchoolChoice = Pick<School, 'id' | 'name' | 'district' | 'network_center_id'> & {
  network_center?: Pick<NonNullable<School['network_center']>, 'name' | 'sort_order'> | null
}

const thaiCompare = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' }).compare

export function sortSchoolsByNetwork<T extends SchoolChoice>(schools: T[]) {
  return [...schools].sort((left, right) => {
    const leftOrder = left.network_center?.sort_order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.network_center?.sort_order ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
      || thaiCompare(left.network_center?.name ?? '', right.network_center?.name ?? '')
      || thaiCompare(left.name, right.name)
      || thaiCompare(left.id, right.id)
  })
}

export function groupSchoolsByNetwork<T extends SchoolChoice>(schools: T[]) {
  return sortSchoolsByNetwork(schools).reduce<Array<{ id: string; name: string; schools: T[] }>>((groups, school) => {
    const id = school.network_center_id || 'unassigned'
    const current = groups.at(-1)
    if (current?.id === id) current.schools.push(school)
    else groups.push({ id, name: school.network_center?.name ?? 'ยังไม่กำหนดศูนย์เครือข่าย', schools: [school] })
    return groups
  }, [])
}
