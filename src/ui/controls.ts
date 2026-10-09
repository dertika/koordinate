import { h, nextId } from './dom';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** Segmentierte Auswahl (Radiogruppe). */
export function segmented<T extends string>(
  label: string,
  options: Option<T>[],
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const name = nextId('seg');
  const group = h('div.segmented', { role: 'radiogroup', 'aria-label': label });
  for (const opt of options) {
    const id = nextId('opt');
    const input = h('input', { type: 'radio', name, id, value: opt.value, checked: opt.value === value });
    input.addEventListener('change', () => input.checked && onChange(opt.value));
    group.append(input, h('label', { for: id }, opt.label));
  }
  return field(label, group);
}

export function toggle(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', checked: value });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label.toggle', {}, h('span', {}, label), input, h('span.toggle-track', { 'aria-hidden': 'true' }));
}

export function slider(
  label: string,
  value: number,
  opts: { min: number; max: number; step: number; format?: (v: number) => string },
  onChange: (v: number) => void,
): HTMLElement {
  const out = h('output.slider-value', {}, (opts.format ?? String)(value));
  const input = h('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step, value: String(value) });
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = (opts.format ?? String)(v);
    onChange(v);
  });
  const wrap = field(label, input);
  wrap.querySelector('.field-label')?.append(out);
  return wrap;
}

export function textInput(
  label: string,
  value: string,
  onInput: (v: string) => void,
  opts: { placeholder?: string; maxLength?: number } = {},
): HTMLElement {
  const input = h('input.text', {
    type: 'text',
    value,
    placeholder: opts.placeholder,
    maxlength: opts.maxLength ?? 120,
    autocomplete: 'off',
    spellcheck: true,
  });
  input.addEventListener('input', () => onInput(input.value));
  return field(label, input);
}

export function field(label: string, control: HTMLElement): HTMLElement {
  const id = control.id || nextId('f');
  if (!control.id && control instanceof HTMLInputElement) control.id = id;
  const lbl =
    control instanceof HTMLInputElement
      ? h('label.field-label', { for: id }, label)
      : h('div.field-label', {}, label);
  return h('div.field', {}, lbl, control);
}

export function section(title: string, ...children: (Node | null | false)[]): HTMLElement {
  return h('section.panel-section', {}, h('h3.section-title', {}, title), ...children);
}
