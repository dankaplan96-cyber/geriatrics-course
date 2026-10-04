#!/usr/bin/env python3
"""Extracts the exact layout of the nursing-administration workbook into
assets/report-template.json (styles, merges, widths, heights, header texts).

Personal data is NOT copied: values are kept only for header/label rows;
every data row is emptied (only its formatting is kept).

Usage:  python3 tools/extract_template.py <original.xlsx> [out.json]
"""
import sys, json, re, colorsys, zipfile
import xml.etree.ElementTree as ET
import openpyxl
from openpyxl.styles.colors import COLOR_INDEX

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/report-template.json'

# data rows (personal data) per sheet — values are dropped, formatting kept
DATA_ROWS = {
    'בטיחות הטיפול': [(4, 23), (27, 38)],
    'אחראיות משמרת': [(4, 22)],
    'שיחות עובדים': [(3, 34)],
    'הערכות עובדים': [(3, 33)],
    'חת"ש': [(4, 24)],
    'תקן': [(3, 18), (28, 31), (38, 44)],
    'תקינה ': [(4, 8), (12, 14)],
    'תקן מקוצר': [(5, 9)],
}
KEEP_IN_DATA = {'תקן מקוצר': {'C'}}  # row labels in the short-staffing table

# ── theme colours ──
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(SRC) as z:
    theme = ET.fromstring(z.read('xl/theme/theme1.xml'))
scheme = theme.find('.//a:clrScheme', NS)
order = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
THEME = []
for name in order:
    el = scheme.find(f'a:{name}', NS)
    c = el[0]
    THEME.append((c.get('lastClr') or c.get('val')).upper())

def apply_tint(hex6, tint):
    r, g, b = (int(hex6[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
    r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), s)
    return '%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))

def color(c, default=None):
    if c is None:
        return default
    try:
        if c.type == 'rgb' and isinstance(c.rgb, str):
            v = c.rgb.upper()
            return v if len(v) == 8 else 'FF' + v[-6:]
        if c.type == 'theme':
            base = THEME[c.theme] if c.theme < len(THEME) else '000000'
            return 'FF' + (apply_tint(base, c.tint) if c.tint else base)
        if c.type == 'indexed':
            if c.indexed in (64, 65):
                return default
            return 'FF' + COLOR_INDEX[c.indexed][-6:]
    except Exception:
        pass
    return default

def style_of(cell):
    f, fl, b, a = cell.font, cell.fill, cell.border, cell.alignment
    s = {}
    font = {'name': f.name or 'Arial', 'size': float(f.sz or 11)}
    if f.b: font['bold'] = True
    if f.i: font['italic'] = True
    if f.u: font['underline'] = True
    if f.strike: font['strike'] = True
    fc = color(f.color)
    if fc and fc != 'FF000000': font['color'] = {'argb': fc}
    s['font'] = font
    if fl is not None and fl.fill_type == 'solid':
        fg = color(fl.fgColor, 'FFFFFFFF')
        s['fill'] = {'type': 'pattern', 'pattern': 'solid', 'fgColor': {'argb': fg}}
    border = {}
    for side in ('left', 'right', 'top', 'bottom'):
        sd = getattr(b, side)
        if sd is not None and sd.style:
            border[side] = {'style': sd.style, 'color': {'argb': color(sd.color, 'FF000000')}}
    if border: s['border'] = border
    al = {}
    if a.horizontal: al['horizontal'] = a.horizontal
    if a.vertical: al['vertical'] = 'middle' if a.vertical == 'center' else a.vertical
    if a.wrap_text: al['wrapText'] = True
    if a.text_rotation: al['textRotation'] = a.text_rotation
    al['readingOrder'] = 'rtl'
    s['alignment'] = al
    if cell.number_format and cell.number_format != 'General':
        s['numFmt'] = cell.number_format
    return s

wb = openpyxl.load_workbook(SRC)
styles, style_ids = [], {}
def sid(st):
    k = json.dumps(st, sort_keys=True, ensure_ascii=False)
    if k not in style_ids:
        style_ids[k] = len(styles)
        styles.append(st)
    return style_ids[k]

out = {'source': 'nursing administration workbook (personal data removed)', 'styles': styles, 'sheets': []}
for ws in wb.worksheets:
    data = DATA_ROWS.get(ws.title, [])
    keep_cols = KEEP_IN_DATA.get(ws.title, set())
    in_data = lambda r: any(a <= r <= b for a, b in data)
    cells = {}
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=ws.max_column):
        for c in row:
            st = style_of(c)
            entry = {'s': sid(st)}
            v = c.value
            keep = not in_data(c.row) or c.column_letter in keep_cols
            if v is not None and keep and not isinstance(c, openpyxl.cell.cell.MergedCell):
                if hasattr(v, 'isoformat'):
                    v = None
                elif not isinstance(v, (int, float, str)):
                    v = str(v)
                if v is not None:
                    entry['v'] = v
            cells[c.coordinate] = entry
    sheet = {
        'name': ws.title,
        'maxRow': ws.max_row, 'maxCol': ws.max_column,
        'rtl': bool(ws.sheet_view.rightToLeft),
        'defaultRowHeight': ws.sheet_format.defaultRowHeight,
        'cols': {k: round(v.width, 2) for k, v in ws.column_dimensions.items() if v.width},
        'rows': {str(k): v.height for k, v in ws.row_dimensions.items() if v.height},
        'merges': sorted(str(m) for m in ws.merged_cells.ranges),
        'margins': {'left': ws.page_margins.left, 'right': ws.page_margins.right, 'top': ws.page_margins.top, 'bottom': ws.page_margins.bottom, 'header': ws.page_margins.header, 'footer': ws.page_margins.footer},
        'cells': cells,
    }
    out['sheets'].append(sheet)

# safety: make sure no ID-like numbers or data-row texts leaked
dump = json.dumps(out, ensure_ascii=False)
_m = re.search(r".{60}(?<![$\-\w])\d{7,9}(?![\w\]]).{20}", dump)
assert not _m, 'ID-like number found: ' + (_m.group(0)[40:] if _m else '')
with open(OUT, 'w', encoding='utf8') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
print('wrote', OUT, len(dump), 'bytes,', len(styles), 'styles')
