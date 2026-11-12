#!/usr/bin/env python3
"""从元数据源生成 data/*.js（只处理文字元数据，不下载、不复制任何图片）。

用法：python3 scripts/build_data.py [源目录]
源目录（默认 ../src，相对本站点根目录）需包含：
  RuiC-PoseAtlas/                 git clone https://github.com/HRuiCcc/RuiC-PoseAtlas（只需 data/）
  ai-pose-gallery-zh/             git clone https://github.com/anhao/ai-pose-gallery-zh（只需 data/）
  orig/ai-pose-gallery.json       原站 index.html 内嵌的 const D=[...] 清单（各站点 1 次页面请求）
  orig/ai-pose-depth-gallery.json
  orig/ai-costume-gallery.json
  orig/ai-costume-anime-gallery.json
  orig/portrait.json              https://ai-portrait-gallery.pages.dev/data/images.js 的数组
"""
import json, sys, os, collections, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'src'))
OUT = os.path.join(ROOT, 'data')

def load(p): return json.load(open(os.path.join(SRC, p), encoding='utf-8'))
def dump(name, var, obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write('/* 自动生成：scripts/build_data.py — 仅文字元数据，不含图片 */\n')
        f.write('window.%s=%s;\n' % (var, s))
    return len(s)

# ---------------- 姿势（线稿 POSE-DB-01 / 深度 POSE-DB-02） ----------------
ruic = load('RuiC-PoseAtlas/data/poses.json')
line = load('orig/ai-pose-gallery.json')
depth = load('orig/ai-pose-depth-gallery.json')
assert [d['id'] for d in line] == [d['id'] for d in depth], '线稿与深度清单不一致'

ANG_JA = {'正面': 'front', '上から': 'high', '下から': 'low', '横': 'side', '斜め': 'diag'}
angles_by_pose = collections.defaultdict(list)
ja_by_pose = {}
for d in line:
    pid, suf = d['id'].rsplit('_', 1)
    assert ANG_JA[d['アングル']] == suf, d['id']
    angles_by_pose[pid].append(suf)
    ja_by_pose[pid] = (d['ポーズ名'], d['分類'], d['系統'])
depth_ids = set(d['id'] for d in depth)

ANG_ORDER = ['front', 'diag', 'side', 'high', 'low']
angles = []
for a in ruic['angles']:
    k = 'diag' if a['key'] == 'diagonal' else a['key']
    angles.append({'key': k, **a['names']})
angles.sort(key=lambda a: ANG_ORDER.index(a['key']))

ADULT_SERIES = {'full_sexy', 'duo'}
ADULT_CATS = {'挤胸・强调事业线系', '性感・大胆系'}
series = []
for s in ruic['series']:
    series.append({'key': s['key'], **s['names'], 'short': s['short'], 'poses': s['poseCount'], 'images': s['imageCount'],
                   'adult': s['key'] in ADULT_SERIES})
cats = [{'key': c['key'], **c['names']} for c in ruic['categories']]

poses = []
for p in ruic['poses']:
    pid = p['id']
    assert pid in angles_by_pose, pid
    ja_name, ja_cat, ja_line = ja_by_pose[pid]
    assert ja_name == p['names']['ja'], (pid, ja_name, p['names']['ja'])
    angs = [a for a in ANG_ORDER if a in angles_by_pose[pid]]
    assert all(pid + '_' + a in depth_ids for a in angs)
    poses.append({'id': pid, 's': p['series'], 'no': p['no'], 'c': p['category'], 'cja': ja_cat,
                  'zh': p['names']['zh'], 'en': p['names']['en'], 'ja': p['names']['ja'], 'a': angs,
                  'adult': p['series'] in ADULT_SERIES or p['category'] in ADULT_CATS})
assert len(poses) == len(angles_by_pose) == 288
n_img = sum(len(p['a']) for p in poses)
dump('poses.js', 'PA_POSES', {'series': series, 'categories': cats, 'angles': angles, 'items': poses})

# ---------------- 衣装（COSTUME-DB-01 写实 / COSTUME-ANIME-DB 二次元） ----------------
CAT = {'春': 'spring', '夏': 'summer', '秋': 'autumn', '冬': 'winter', 'ランジェリー': 'lingerie',
       'パーティ': 'party', '水着': 'swimwear', 'セクシー': 'sexy'}
rc = load('RuiC-PoseAtlas/data/costumes.json')
cat_names = {c['key']: c['names'] for c in rc['categories']}
zh_cat = {'spring': '春季穿搭', 'summer': '夏季穿搭', 'autumn': '秋季穿搭', 'winter': '冬季穿搭',
          'lingerie': '内衣・睡衣', 'party': '派对・礼服', 'swimwear': '泳装・度假', 'sexy': '性感穿搭'}
ccats = [{'key': k, 'zh': zh_cat[k], 'en': cat_names[k]['en'], 'ja': cat_names[k]['ja']} for k in CAT.values()]
ADULT_COSTUME = {'lingerie', 'sexy'}
colors = [c['key'] for c in rc['colors']]
groups = [{'key': g['key'], **g['names']} for g in rc['groups']]
rc_by_id = {c['id']: c for c in rc['costumes']}
zh_real = {c['id']: c for c in load('ai-pose-gallery-zh/data/costume-zh.json')}
zh_anime = {c['id'].replace('gia-anime-', ''): c for c in load('ai-pose-gallery-zh/data/costume-gia-anime-zh.json')}

def first_color(kw):
    for w in kw.split():
        if w in colors: return w
    return ''

citems = []
for setkey, src, zhmap in (('real', 'orig/ai-costume-gallery.json', zh_real), ('anime', 'orig/ai-costume-anime-gallery.json', zh_anime)):
    for d in load(src):
        cid = d['id']; cat = CAT[d['カテゴリ']]
        z = zhmap.get(cid, {})
        r = rc_by_id.get(cid) if setkey == 'real' else None
        if r: assert r['cat'] == cat
        citems.append({'id': cid, 'set': setkey, 'c': cat, 'kw': d['キーワード'],
                       'zh': z.get('服装名称', ''), 't': z.get('标签', []),
                       'col': (r or {}).get('color') or first_color(d['キーワード']),
                       'g': (r or {}).get('group', ''), 'adult': cat in ADULT_COSTUME})
n_real = sum(1 for c in citems if c['set'] == 'real'); n_anime = len(citems) - n_real
dump('costumes.js', 'PA_COSTUMES', {'categories': ccats, 'groups': groups, 'colors': colors, 'items': citems})

# ---------------- 人像（AIモデル顔データベース） ----------------
op = load('orig/portrait.json')
azh = {p['id']: p for p in load('ai-pose-gallery-zh/data/portrait-zh.json')}
style_en = json.load(open(os.path.join(ROOT, 'scripts', 'portrait-style-en.json'), encoding='utf-8'))
faces = load('RuiC-PoseAtlas/data/faces.json')
HAIR = {'ショート': 'short', 'ミディアム': 'medium', 'セミロング': 'semilong', 'ロング': 'long'}
hairs = [{'key': h['key'], **h['names']} for h in faces['hairs']]
secs = [{'key': s['key'], **s['names'], 'note': s['note']} for s in faces['sections']]
styles, sidx, pitems = [], {}, []
for d in op:
    st = d['style']
    if st not in sidx:
        sidx[st] = len(styles)
        styles.append({'ja': st, 'zh': azh[d['id']]['发型名称'], 'en': style_en[st]})
    pitems.append({'id': d['id'], 'sec': d['section'], 'h': HAIR[d['hair']], 'st': sidx[st]})
dump('portraits.js', 'PA_PORTRAITS', {'sections': secs, 'hairs': hairs, 'styles': styles, 'items': pitems})

meta = {
    'built': datetime.date.today().isoformat(),
    'counts': {'poses': len(poses), 'poseImagesPerMode': n_img, 'angles': len(angles), 'series': len(series),
               'poseCategories': len(cats), 'costumesReal': n_real, 'costumesAnime': n_anime,
               'portraits': len(pitems), 'portraitStyles': len(styles)},
    'missing': [p['id'] + '_' + a for p in poses for a in ANG_ORDER if a not in p['a']],
}
dump('meta.js', 'PA_META', meta)
print(json.dumps(meta, ensure_ascii=False, indent=1))
