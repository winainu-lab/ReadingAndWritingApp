import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AppSettings } from '../types/app'

export const defaultAppSettings: AppSettings = {
  id: 'default',
  system_name: 'อ่านคล่อง',
  affiliation: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 2',
  footer_text: 'ระบบประเมินการอ่านแบบไม่ระบุตัวตน',
  landing_kicker: 'เครื่องมือนิเทศและประเมินการอ่าน',
  welcome_headline: 'เห็นพัฒนาการอ่าน จากทุกห้องเรียน',
  welcome_description: 'ประเมินแบบไม่ใช้ข้อมูลส่วนตัว สรุปผลระดับโรงเรียน ศูนย์เครือข่าย และเขตพื้นที่ในที่เดียว',
  logo_path: null,
  updated_at: '',
  updated_by: null,
}

export function getBrandLogoUrl(logoPath: string | null) {
  if (!logoPath) return null
  return supabase.storage.from('branding').getPublicUrl(logoPath).data.publicUrl
}

export function useAppSettings() {
  const query = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'default').single()
      if (error) throw error
      return data as AppSettings
    },
    staleTime: 5 * 60_000,
  })

  return { ...query, settings: query.data ?? defaultAppSettings }
}
