import en from './en.json';

type Dict = Record<string, string>;
const dict = en as Dict;

export type StringKey = keyof typeof en;

export const t = (key: StringKey, vars?: Record<string, string | number>): string => {
  const template = dict[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? `{${name}}` : String(v);
  });
};
