export interface NamedSwatch {
  nameZh: string
  nameEn: string
  hex: string
  note?: string
}

export type SwatchCollectionId = 'chinese' | 'tailwind' | 'morandi' | 'material'

export interface SwatchCollection {
  id: SwatchCollectionId
  labelZh: string
  labelEn: string
  items: NamedSwatch[]
}

export const SWATCH_COLLECTIONS: SwatchCollection[] = [
  {
    id: 'chinese',
    labelZh: '中国传统色',
    labelEn: 'Chinese Classic',
    items: [
      { nameZh: '胭脂', nameEn: 'Yanzhi', hex: '#9D2933', note: '深红微紫' },
      { nameZh: '朱砂', nameEn: 'Zhusha', hex: '#FF461F', note: '丹砂正红' },
      { nameZh: '海棠红', nameEn: 'Haitang', hex: '#DB5A6B', note: '柔润绯红' },
      { nameZh: '桃红', nameEn: 'Taohong', hex: '#F47983', note: '春桃浅粉' },
      { nameZh: '妃色', nameEn: 'Feise', hex: '#ED5736', note: '淡绯暖橘' },
      { nameZh: '琥珀', nameEn: 'Hupo', hex: '#CA6924', note: '温润褐金' },
      { nameZh: '鹅黄', nameEn: 'Ehuang', hex: '#FFF143', note: '雏鹅嫩黄' },
      { nameZh: '秋香', nameEn: 'Qiuxiang', hex: '#D9B611', note: '桂子秋金' },
      { nameZh: '松花', nameEn: 'Songhua', hex: '#BCE672', note: '松蕊浅绿' },
      { nameZh: '竹青', nameEn: 'Zhuqing', hex: '#789262', note: '青竹素雅' },
      { nameZh: '翠微', nameEn: 'Cuiwei', hex: '#4C8045', note: '远山苍翠' },
      { nameZh: '翡翠', nameEn: 'Feicui', hex: '#3DE1AD', note: '玉润碧绿' },
      { nameZh: '碧青', nameEn: 'Biqing', hex: '#5CB3CC', note: '晴湖微澜' },
      { nameZh: '天青', nameEn: 'Tianqing', hex: '#2E59A7', note: '雨过天青' },
      { nameZh: '景泰蓝', nameEn: 'Jingtai', hex: '#2775B6', note: '珐琅釉蓝' },
      { nameZh: '靛青', nameEn: 'Dianqing', hex: '#177CB0', note: '蓝草染青' },
      { nameZh: '黛蓝', nameEn: 'Dailan', hex: '#425066', note: '远山青黛' },
      { nameZh: '藏青', nameEn: 'Zangqing', hex: '#2E4E7E', note: '深沉雅蓝' },
      { nameZh: '青莲', nameEn: 'Qinglian', hex: '#801DAE', note: '华贵紫莲' },
      { nameZh: '藕荷', nameEn: 'Ouhe', hex: '#E4C6D0', note: '淡紫微粉' },
      { nameZh: '雪青', nameEn: 'Xueqing', hex: '#B0A4E3', note: '浅紫如雪' },
      { nameZh: '月白', nameEn: 'Yuebai', hex: '#D6ECF0', note: '月光微蓝' },
      { nameZh: '茶白', nameEn: 'Chabai', hex: '#F3F9F1', note: '清茶素白' },
      { nameZh: '玄青', nameEn: 'Xuanqing', hex: '#3D3B4F', note: '深黑泛青' },
    ],
  },
  {
    id: 'tailwind',
    labelZh: 'Tailwind 精选',
    labelEn: 'Tailwind CSS',
    items: [
      { nameZh: 'Rose 500', nameEn: 'rose-500', hex: '#F43F5E' },
      { nameZh: 'Pink 500', nameEn: 'pink-500', hex: '#EC4899' },
      { nameZh: 'Fuchsia 500', nameEn: 'fuchsia-500', hex: '#D946EF' },
      { nameZh: 'Purple 500', nameEn: 'purple-500', hex: '#A855F7' },
      { nameZh: 'Violet 500', nameEn: 'violet-500', hex: '#8B5CF6' },
      { nameZh: 'Indigo 500', nameEn: 'indigo-500', hex: '#6366F1' },
      { nameZh: 'Blue 500', nameEn: 'blue-500', hex: '#3B82F6' },
      { nameZh: 'Sky 500', nameEn: 'sky-500', hex: '#0EA5E9' },
      { nameZh: 'Cyan 500', nameEn: 'cyan-500', hex: '#06B6D4' },
      { nameZh: 'Teal 500', nameEn: 'teal-500', hex: '#14B8A6' },
      { nameZh: 'Emerald 500', nameEn: 'emerald-500', hex: '#10B981' },
      { nameZh: 'Green 500', nameEn: 'green-500', hex: '#22C55E' },
      { nameZh: 'Lime 500', nameEn: 'lime-500', hex: '#84CC16' },
      { nameZh: 'Amber 500', nameEn: 'amber-500', hex: '#F59E0B' },
      { nameZh: 'Orange 500', nameEn: 'orange-500', hex: '#F97316' },
      { nameZh: 'Red 500', nameEn: 'red-500', hex: '#EF4444' },
      { nameZh: 'Slate 700', nameEn: 'slate-700', hex: '#334155' },
      { nameZh: 'Slate 900', nameEn: 'slate-900', hex: '#0F172A' },
    ],
  },
  {
    id: 'morandi',
    labelZh: '莫兰迪色系',
    labelEn: 'Morandi',
    items: [
      { nameZh: '雾霾蓝', nameEn: 'Haze Blue', hex: '#7C93A8' },
      { nameZh: '烟灰粉', nameEn: 'Dusty Rose', hex: '#C9A2A6' },
      { nameZh: '豆沙红', nameEn: 'Muted Coral', hex: '#B77B78' },
      { nameZh: '灰豆绿', nameEn: 'Sage Green', hex: '#95A693' },
      { nameZh: '冷杉灰', nameEn: 'Pine Mist', hex: '#6F827A' },
      { nameZh: '燕麦米', nameEn: 'Oat Beige', hex: '#D8CFC4' },
      { nameZh: '奶茶棕', nameEn: 'Warm Taupe', hex: '#B49E8C' },
      { nameZh: '陶土橘', nameEn: 'Terracotta', hex: '#C68B73' },
      { nameZh: '浅姜黄', nameEn: 'Muted Ochre', hex: '#D1B883' },
      { nameZh: '香芋紫', nameEn: 'Dusty Lilac', hex: '#A89BB3' },
      { nameZh: '暮光灰', nameEn: 'Slate Mauve', hex: '#807A8C' },
      { nameZh: '静谧炭', nameEn: 'Charcoal Soft', hex: '#4B4E57' },
    ],
  },
  {
    id: 'material',
    labelZh: 'Material 3',
    labelEn: 'Material 3',
    items: [
      { nameZh: 'Primary Purple', nameEn: 'M3 Primary', hex: '#6750A4' },
      { nameZh: 'Secondary', nameEn: 'M3 Secondary', hex: '#625B71' },
      { nameZh: 'Tertiary Rose', nameEn: 'M3 Tertiary', hex: '#7D5260' },
      { nameZh: 'Error Red', nameEn: 'M3 Error', hex: '#B3261E' },
      { nameZh: 'Google Blue', nameEn: 'Blue 600', hex: '#1A73E8' },
      { nameZh: 'Google Green', nameEn: 'Green 600', hex: '#1E8E3E' },
      { nameZh: 'Google Yellow', nameEn: 'Yellow 700', hex: '#F9AB00' },
      { nameZh: 'Google Red', nameEn: 'Red 600', hex: '#D93025' },
      { nameZh: 'Teal 700', nameEn: 'Teal 700', hex: '#00796B' },
      { nameZh: 'Deep Orange', nameEn: 'Deep Orange', hex: '#E64A19' },
      { nameZh: 'Surface Dark', nameEn: 'Surface Dark', hex: '#1C1B1F' },
      { nameZh: 'Surface Light', nameEn: 'Surface Light', hex: '#FFFBFE' },
    ],
  },
]
