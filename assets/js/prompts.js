/* PoseAtlas · prompt 生成与原站链接（浏览器与 Node 通用）
 * prompt 由仓库元数据（姿势名 / 分类 / 体系 / 视角 / 衣装关键词 / 发型）拼装。
 * 句式参考 anhao/ai-pose-gallery-zh 的 buildRecipePrompt（MIT），并按单资产场景改写。 */
(function (root) {
  'use strict';

  var SITES = {
    line:     { name: 'POSE-DB-01 线稿',        home: 'https://ai-pose-gallery.pages.dev/' },
    depth:    { name: 'POSE-DB-02 深度',        home: 'https://ai-pose-depth-gallery.pages.dev/' },
    real:     { name: 'COSTUME-DB-01 衣装',     home: 'https://ai-costume-gallery.pages.dev/' },
    anime:    { name: 'COSTUME-ANIME-DB 衣装',  home: 'https://ai-costume-anime-gallery.pages.dev/' },
    portrait: { name: 'AIモデル顔データベース', home: 'https://ai-portrait-gallery.pages.dev/' }
  };
  var HAIR_JA = { short: 'ショート', medium: 'ミディアム', semilong: 'セミロング', long: 'ロング' };

  /* 原站链接：原站是单页应用，没有逐条详情页；
     home = 原站首页（其搜索框支持按 ID 检索），image = 原站上该张图的单图地址（详情预览与「原站单图」均指向此地址，本站不转存）。 */
  var links = {
    pose: function (mode, poseId, angle) {
      var s = SITES[mode === 'depth' ? 'depth' : 'line'];
      return { home: s.home, image: s.home + 'img/' + poseId + '_' + angle + '.png', search: poseId };
    },
    costume: function (set, id) {
      var s = SITES[set === 'anime' ? 'anime' : 'real'];
      return { home: s.home, image: s.home + 'png/' + id + '.png', search: id };
    },
    portrait: function (item) {
      var h = '#' + (item.sec === 'styling' ? 'sec=styling&' : '') + 'hair=' + encodeURIComponent(HAIR_JA[item.h]);
      return { home: SITES.portrait.home + h, image: SITES.portrait.home + 'img/full/' + item.id + '.png', search: item.id };
    }
  };

  var ANGLE = {
    front: { zh: '正面平视镜头', en: 'eye-level front view' },
    diag:  { zh: '斜侧 45° 镜头', en: 'three-quarter view (45°)' },
    side:  { zh: '侧面镜头', en: 'side view (profile)' },
    high:  { zh: '俯视镜头（从上往下拍）', en: 'high-angle shot looking down' },
    low:   { zh: '仰视镜头（从下往上拍）', en: 'low-angle shot looking up' }
  };
  var FRAMING = {
    full_sexy:  { zh: '一位成年角色，全身构图', en: 'one adult character, full-body shot' },
    full_std:   { zh: '一位成年角色，全身构图', en: 'one adult character, full-body shot' },
    upper:      { zh: '一位成年角色，上半身构图', en: 'one adult character, upper-body shot (waist up)' },
    duo:        { zh: '两位成年角色互动，双人构图', en: 'two adult characters interacting, two-person shot' }
  };
  var REF = {
    line:  { zh: '灰色无脸人台线稿', en: 'grey faceless mannequin line-art reference', mat: { zh: '灰色人台与线稿', en: 'grey mannequin / line-art' },
             tip: { zh: '用法：作为姿势/构图参考图（Reference、OpenPose 预处理、Lineart/Canny ControlNet 均可）。', en: 'Use as a pose/composition reference (image reference, OpenPose preprocessor, Lineart/Canny ControlNet).' } },
    depth: { zh: '深度图（越白越靠近镜头）', en: 'depth map reference (whiter = closer to camera)', mat: { zh: '深度图灰阶', en: 'depth-map greyscale' },
             tip: { zh: '用法：接入 ControlNet Depth / 各工具的深度参考；手指与交叠腿部的边界较弱。', en: 'Use with ControlNet Depth or any depth-reference feature; finger and overlapping-leg edges are weak.' } }
  };
  var TAIL = { zh: '画面中没有任何文字、标志或水印。', en: 'No text, logos or watermarks in the image.' };

  function pose(p, opt) {
    opt = opt || {};
    var mode = opt.mode === 'depth' ? 'depth' : 'line';
    var a = opt.angle || p.a[0];
    var cat = opt.cat || { zh: p.c, en: p.c };
    var f = FRAMING[p.s], r = REF[mode], g = ANGLE[a];
    return {
      zh: f.zh + '，' + g.zh + '。\n姿势：' + p.zh + '（' + cat.zh + '）。\n' +
          '严格按参考图中' + r.zh + '的动作、肢体朝向与镜头角度摆姿势；参考图只提供姿势与构图，不复制其' + r.mat.zh + '外观。\n' +
          '脸部、发型、服装、背景与画风按需另行描述，人物比例协调，手部自然。' + TAIL.zh,
      en: f.en + ', ' + g.en + '.\nPose: ' + p.en + ' (' + cat.en + ').\n' +
          'Match the pose, limb placement and camera angle of the attached ' + r.en + ' exactly; use it only for pose and composition, do not copy its ' + r.mat.en + ' look.\n' +
          'Describe face, hair, outfit, background and art style separately; natural body proportions and hands. ' + TAIL.en,
      tip: r.tip
    };
  }

  function costume(c) {
    var anime = c.set === 'anime';
    return {
      zh: '服装：' + (c.zh || c.kw) + '。\n' +
          '让人物穿上参考图中展示的整套' + (anime ? '二次元风格' : '') + '服装和配饰，每件单品的颜色、款式、面料与配饰都以参考图为准，名称仅作辅助说明。\n' +
          '参考图是不含人物的服装展示图，脸部、体型、姿势与背景按需另行描述。' + TAIL.zh,
      en: 'Outfit: ' + c.kw + '.\n' +
          'Dress the character in the complete ' + (anime ? 'anime-style ' : '') + 'outfit and accessories shown in the reference image; follow its colors, cut, fabric and accessories exactly — the keywords are only a hint.\n' +
          'The reference shows the outfit without a person; describe face, body, pose and background separately. ' + TAIL.en,
      tip: { zh: '用法：作为服装参考图（服装参考 / 图像参考 / IP-Adapter）。原站关键词即英文 prompt 词。', en: 'Use as an outfit reference (outfit / image reference, IP-Adapter). The English keywords come from the original site.' }
    };
  }

  function portrait(it, style, hair, sec) {
    var face = it.sec === 'face';
    var stZh = style.ja ? style.zh : '标准基础款', stEn = style.ja ? style.en : 'standard';
    return {
      zh: '人物：保持参考图人物的脸型、五官、发型（' + hair.zh + '・' + stZh + '）和发色一致' +
          (face ? '，参考图为正面纯色背景的脸部参考' : '，可同时参考其整体造型氛围与发丝质感') + '。\n' +
          '服装、姿势、背景按需求重新生成，所有裸露皮肤的肤色与脸部统一，五官与手部自然。' + TAIL.zh,
      en: 'Character: keep the face shape, facial features, hairstyle (' + hair.en.toLowerCase() + ' hair, ' + stEn.toLowerCase() + ') and hair color of the person in the reference image' +
          (face ? ' (front-facing face reference on a plain background)' : '; the overall styling mood and hair texture may also be referenced') + '.\n' +
          'Regenerate outfit, pose and background as requested; keep exposed skin tone consistent with the face, natural features and hands. ' + TAIL.en,
      tip: { zh: '用法：作为角色/脸部参考图（Character / Face reference、InstantID、PuLID 等）。AI 生成的虚构人物，勿用于冒充真实人物。', en: 'Use as a character/face reference (InstantID, PuLID, etc.). Fictional AI-generated people; never impersonate real people.' }
    };
  }

  /* 画风预设：中文取自 anhao/ai-pose-gallery-zh STYLE_PRESETS（MIT），英文为对应翻译 */
  var STYLES = [
    { key: 'none',     zh: '无预设（跟随参考图）', en: 'None (follow references)', pzh: '', pen: '' },
    { key: 'realistic', zh: '写实人像写真', en: 'Realistic portrait photo', pzh: '写实商业摄影级质感，85mm 人像镜头，自然柔和光影，真实肌肤纹理与织物细节，8k 高清画质。', pen: 'realistic commercial photography, 85mm portrait lens, soft natural lighting, true-to-life skin texture and fabric detail, 8k.' },
    { key: 'magazine', zh: '日韩杂志画报', en: 'J/K fashion magazine', pzh: '日韩时尚穿搭杂志画报风格，干净极简摄影棚背景，高级色调，突出人物颜值与服装剪裁。', pen: 'Japanese/Korean fashion magazine editorial, clean minimal studio background, refined color grading, emphasis on the model and the cut of the clothes.' },
    { key: 'film',     zh: '复古胶片写真', en: 'Vintage film', pzh: '35mm 富士胶片摄影质感，轻微胶片颗粒，柔和复古暖调，自然街拍光影与电影呼吸感。', pen: '35mm Fujifilm look, light film grain, soft warm vintage tones, natural street-photo light with a cinematic feel.' },
    { key: 'game25d',  zh: '2.5D 游戏原画立绘', en: '2.5D game key art', pzh: '2.5D 半写实高精度游戏角色原画，唯美厚涂光影，精致五官与华丽布料金属质感。', pen: '2.5D semi-realistic high-detail game character art, painterly lighting, refined features, rich fabric and metal textures.' },
    { key: 'anime',    zh: '日系二次元插画', en: 'Anime illustration', pzh: '日系精致二次元插画风格，细腻赛璐璐与厚涂光影过渡，动漫角色立绘质感，色彩通透干净。', pen: 'polished Japanese anime illustration, cel shading blended with painterly light, character key-visual quality, clean vivid colors.' },
    { key: 'animefilm', zh: '动画电影质感', en: 'Anime film', pzh: '动画电影级画面质感，清澈高饱和光影，细腻体积光与发丝高光，干净唯美的动漫色彩。', pen: 'anime feature-film quality, clear saturated lighting, delicate volumetric light and hair highlights, clean beautiful colors.' },
    { key: 'manga',    zh: '黑白漫画网点', en: 'B&W manga', pzh: '日本黑白漫画原稿风格，利落精准的G笔线稿，细腻漫画网点纸阴影与层次对比。', pen: 'Japanese black-and-white manga manuscript, crisp G-pen inking, fine screentone shading and contrast.' },
    { key: 'render3d', zh: '3D 次世代角色渲染', en: '3D next-gen render', pzh: 'Unreal Engine 5 / Octane Render 次世代 3D 角色渲染，细腻次表面散射肌肤材质，电影级布光。', pen: 'Unreal Engine 5 / Octane next-gen 3D character render, subsurface-scattering skin, cinematic lighting.' },
    { key: 'figure',   zh: '3D 潮玩手办', en: 'Collectible figure', pzh: '高品质 PVC 涂装完成品手办质感，柔和摄影棚柔光箱布光，精致材质高光与微距景深。', pen: 'high-quality painted PVC figure, soft studio softbox lighting, refined material highlights, macro depth of field.' },
    { key: 'cyber',    zh: '赛博朋克霓虹', en: 'Cyberpunk neon', pzh: '赛博朋克科幻视觉风格，雨夜霓虹冷暖双色轮廓光，未来感材质反光与电影级氛围。', pen: 'cyberpunk sci-fi look, rainy night neon with cool/warm rim light, futuristic reflective materials, cinematic mood.' },
    { key: 'sheet',    zh: '角色设定集立绘（纯白底）', en: 'Character sheet (white bg)', pzh: '标准角色设定集全身立绘，纯白干净无杂物背景，均匀漫反射布光，清晰展示全身服装结构与配饰细节。', pen: 'standard full-body character design sheet, clean pure white background, even diffuse lighting, clearly showing outfit construction and accessories.' }
  ];

  /* 组合配方：图1 人像 → 图2 衣装 → 图3 姿势（顺序同 anhao buildRecipePrompt） */
  function recipe(r, styleKey, ctx) {
    var zh = [], en = [], idx = 1, cIdx = 0;
    if (r.portrait) {
      var st = ctx.style(r.portrait), hr = ctx.hair(r.portrait);
      var hz = st.ja ? hr.zh + '・' + st.zh : hr.zh, he = st.ja ? st.en.toLowerCase() : hr.en.toLowerCase() + ' hair';
      zh.push('• 人物：图' + idx + '中的人物，保持其脸型、五官、发型（' + hz + '）和发色一致。所有裸露皮肤的肤色与脸部统一。' + (r.costume ? '' : '保留图' + idx + '人物原有可见服装，不复制姿势参考图的白模外观。'));
      en.push('• Character: the person in image ' + idx + '; keep face shape, features, hairstyle (' + he + ') and hair color. Exposed skin matches the face.' + (r.costume ? '' : ' Keep their visible outfit; do not copy the mannequin look of the pose reference.'));
      idx++;
    }
    if (r.costume) {
      cIdx = idx;
      zh.push('• 服装：让人物穿上图' + idx + '中展示的整套服装和配饰（参考名称：' + (r.costume.zh || r.costume.kw) + '），每件单品的颜色、款式、面料与配饰都以图' + idx + '为准，名称仅作辅助说明。');
      en.push('• Outfit: dress the character in the full outfit and accessories shown in image ' + idx + ' (' + r.costume.kw + '); colors, cut, fabric and accessories follow image ' + idx + ' exactly.');
      idx++;
    }
    if (r.pose) {
      var p = r.pose, m = r.poseMode === 'depth' ? 'depth' : 'line', a = r.poseAngle || p.a[0];
      var refZh = m === 'depth' ? '深度图' : '人体模型线稿', refEn = m === 'depth' ? 'depth map' : 'mannequin line art';
      zh.push('• 姿势：按照图' + idx + '中' + refZh + '的动作和镜头角度摆姿势（' + p.zh + '，' + ANGLE[a].zh + '）；图' + idx + '只是动作示意' + (cIdx ? '，人物穿着图' + cIdx + '的服装' : '') + '。');
      en.push('• Pose: match the pose and camera angle of the ' + refEn + ' in image ' + idx + ' (' + p.en + ', ' + ANGLE[a].en + '); image ' + idx + ' only shows the motion' + (cIdx ? ', the character wears the outfit from image ' + cIdx : '') + '.');
      if (p.s === 'duo') { zh.push('• 画面为两位成年角色。'); en.push('• The scene shows two adult characters.'); }
      idx++;
    }
    if (idx === 1) return null;
    if (!r.portrait && r.costume && r.pose) {
      zh.push('• 无脸展示：生成一位穿着参考服装的成年展示人物，脸部保持无五官的自然肤色表面，不照搬服装图或姿势图的灰白人台材质。');
      en.push('• Faceless display: an adult figure wearing the reference outfit, face left as a smooth featureless skin surface; do not copy the grey mannequin material.');
    }
    var s = STYLES.filter(function (x) { return x.key === styleKey; })[0] || STYLES[0];
    if (s.pzh) { zh.push('• 风格：' + s.pzh + ' 人物比例协调，手部与五官自然，光影统一。'); en.push('• Style: ' + s.pen + ' Natural proportions, hands and features, consistent lighting.'); }
    var n = idx - 1;
    return {
      zh: '请根据提供的 ' + n + ' 张参考图，生成一张完整的人物图像：\n' + zh.join('\n') + '\n' + TAIL.zh,
      en: 'Using the ' + n + ' reference image' + (n > 1 ? 's' : '') + ' provided, generate one complete character image:\n' + en.join('\n') + '\n' + TAIL.en
    };
  }

  var api = { SITES: SITES, links: links, ANGLE: ANGLE, STYLES: STYLES, pose: pose, costume: costume, portrait: portrait, recipe: recipe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PAPrompt = api;
})(typeof window !== 'undefined' ? window : this);
