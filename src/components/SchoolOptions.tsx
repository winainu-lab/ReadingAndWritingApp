import { groupSchoolsByNetwork, type SchoolChoice } from '../lib/schoolSorting'

export function SchoolOptions({ schools }: { schools: SchoolChoice[] }) {
  return <>
    {groupSchoolsByNetwork(schools).map((group) => (
      <optgroup key={group.id} label={group.name}>
        {group.schools.map((school) => (
          <option key={school.id} value={school.id}>{school.name} · อ.{school.district}</option>
        ))}
      </optgroup>
    ))}
  </>
}
