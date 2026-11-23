export type Locale = 'zh-CN' | 'en'

const ZH_CN = {
  'app.name': '拾色生花',
  'app.subtitle': 'FunColor',
  'nav.section': '工作区',
  'nav.picker': '拾色转换',
  'nav.image': '图片取色',
  'nav.palette': '色阶配色',
  'nav.gradient': '渐变工坊',
  'nav.contrast': '对比色盲',
  'nav.library': '色库收藏',
  'action.pickScreen': '屏幕取色',
  'action.random': '随机灵感',
  'action.copy': '复制',
  'action.copied': '已复制',
  'action.export': '导出',
  'action.favorite': '收藏色值',
  'action.unfavorite': '取消收藏',
  'status.offline': '完全离线',
} as const

export type I18nKey = keyof typeof ZH_CN

const EN: Record<I18nKey, string> = {
  'app.name': 'FunColor',
  'app.subtitle': 'Color Studio',
  'nav.section': 'WORKSPACE',
  'nav.picker': 'Picker',
  'nav.image': 'Image Pick',
  'nav.palette': 'Palettes',
  'nav.gradient': 'Gradients',
  'nav.contrast': 'Contrast',
  'nav.library': 'Library',
  'action.pickScreen': 'Screen Pick',
  'action.random': 'Random',
  'action.copy': 'Copy',
  'action.copied': 'Copied',
  'action.export': 'Export',
  'action.favorite': 'Favorite',
  'action.unfavorite': 'Unfavorite',
  'status.offline': 'Offline',
}

export function t(locale: Locale, key: I18nKey): string {
  return (locale === 'en' ? EN : ZH_CN)[key] ?? ZH_CN[key]
}
