import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TABLE_NAME = "emotion_fragments";

const parseEnv = (source) =>
  source.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return env;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    return env;
  }, {});

const loadEnv = async () => {
  const envPath = resolve(process.cwd(), ".env");
  const envText = await readFile(envPath, "utf8");
  return parseEnv(envText);
};

const normalizeSupabaseUrl = (url) => url.replace(/\/rest\/v1\/?$/, "");

const legacyEmotionMap = {
  moonlight: "soft",
  starlight: "hopeful",
  silence: "quiet",
  dream: "soft",
  echo: "lonely",
  drift: "calm",
  aurora: "hopeful",
  haze: "happy",
  tide: "anxious",
  blur: "happy",
  alone: "lonely",
  rain: "quiet",
  dawn: "hopeful",
  ember: "soft",
  bloom: "hopeful",
  memory: "happy",
  night: "quiet",
  hope: "hopeful",
  tender: "soft",
  fragile: "soft",
  lost: "lonely",
  warm: "soft",
  faded: "happy",
  numb: "happy",
  gentle: "soft",
  distant: "lonely",
  overwhelmed: "anxious",
  healing: "hopeful",
  floating: "calm",
  melancholy: "quiet",
  comfort: "soft",
  restless: "anxious",
};

const seedRows = [
  ["鍒€ワ紝鏈堜寒涔熶細鏅氬埌", "soft", "#d8c7ff"],
  ["鍏変細绌胯繃瑁傜紳", "hopeful", "#ffd7a8"],
  ["鎱竴鐐癸紝涔熸病鍏崇郴", "calm", "#c7d4ff"],
  ["椋庝細璁颁綇鐤叉儷", "anxious", "#c7d4ff"],
  ["瀹夐潤涔熸槸绛旀", "quiet", "#d8c7ff"],
  ["澶滄櫄闇€瑕佹矇榛?, "quiet", "#9ea7ff"],
  ["鎯呯华鍙槸鍋滄硦", "anxious", "#c7d4ff"],
  ["娴蜂細鏀剁暀鏅氶", "anxious", "#c7d4ff"],
  ["姊︽浛浣犵暀鐫€绛旀", "soft", "#f0d8ff"],
  ["鍏佽鑷繁涓嬫矇", "soft", "#f0d8ff"],
  ["浣犱笉鐢ㄤ竴鐩村彂鍏?, "calm", "#c7d4ff"],
  ["鍥炲０浼氭壘鍒板嚭鍙?, "lonely", "#d8c7ff"],
  ["闆ㄥ仠鍓嶆姳鎶辫嚜宸?, "quiet", "#c7d4ff"],
  ["澶滆壊姝ｅ湪鍙樿交", "hopeful", "#ffd7a8"],
  ["杩熷埌涔熺畻鎶佃揪", "anxious", "#b7b0ff"],
  ["浠婂ぉ鍏堝埆閫炲己", "soft", "#f0d8ff"],
  ["蹇冧簨鍙互寰堣交", "calm", "#c7d4ff"],
  ["鎶婇毦杩囨斁涓€浼氬効", "happy", "#d8c7ff"],
  ["椋庢參鎱㈠惞杩囧幓", "anxious", "#c7d4ff"],
  ["浣犲彲浠ヤ笉鍥炵瓟", "quiet", "#d8c7ff"],
  ["娌夐粯涔熸湁褰㈢姸", "quiet", "#b7b0ff"],
  ["鍒妸鑷繁鍌潖", "soft", "#f0d8ff"],
  ["鏈変簺绱笉鐢ㄨВ閲?, "lonely", "#9ea7ff"],
  ["鍏堝仠鍦ㄨ繖閲屽惂", "calm", "#c7d4ff"],
  ["蹇冭烦杩樺湪闈犲哺", "anxious", "#c7d4ff"],
  ["闆句細鏇夸綘閬綇", "happy", "#d8c7ff"],
  ["涓嶈鎬ョ潃鏅存湕", "quiet", "#c7d4ff"],
  ["鐪兼唱涔熶細閫€娼?, "anxious", "#c7d4ff"],
  ["鍒€曚粖澶╁緢鎱?, "calm", "#c7d4ff"],
  ["涓€鐐瑰厜灏卞浜?, "hopeful", "#ffd7a8"],
  ["瀛ゅ崟鏆傛椂鍧愪笅", "lonely", "#9ea7ff"],
  ["蹇冧簨娌℃湁鍚甸啋璋?, "happy", "#b7b0ff"],
  ["鎶婅瘽鐣欑粰椋?, "anxious", "#c7d4ff"],
  ["浣犲凡缁忓緢杞讳簡", "calm", "#c7d4ff"],
  ["鍒拷璧舵墍鏈夊０闊?, "quiet", "#d8c7ff"],
  ["浠婃櫄鍏堟澗鎵?, "quiet", "#9ea7ff"],
  ["闆ㄥ０鏇夸綘鍋滈】", "quiet", "#c7d4ff"],
  ["鍏変笉鐢ㄥ緢澶?, "hopeful", "#ffd7a8"],
  ["鐤叉儷涔熻兘闈犲哺", "anxious", "#c7d4ff"],
  ["鍏堣蹇冩參涓嬫潵", "calm", "#c7d4ff"],
  ["闆炬暎涔嬪墠鍒€?, "happy", "#d8c7ff"],
  ["鍥炲繂杞昏交缈婚潰", "happy", "#b7b0ff"],
  ["浣犱笉蹇呴┈涓婂ソ", "soft", "#f0d8ff"],
  ["绌虹櫧涔熺畻浼戞伅", "quiet", "#d8c7ff"],
  ["澶滈噷鍒矗鎬嚜宸?, "quiet", "#9ea7ff"],
  ["椋庢妸閲嶇殑甯﹁蛋", "anxious", "#c7d4ff"],
  ["蹇冧細鎱㈡參鍥炴俯", "soft", "#ffd7a8"],
  ["鍒€ョ潃鍙樻槑浜?, "hopeful", "#ffd7a8"],
  ["娌変笅鍘讳篃鍙互", "happy", "#b7b0ff"],
  ["浣犲彧鏄湁鐐圭疮", "soft", "#f0d8ff"],
  ["娼０寰堟噦娌夐粯", "anxious", "#c7d4ff"],
  ["璁╀粖澶╁皬涓€鐐?, "calm", "#c7d4ff"],
  ["鍒妸鐥涜婊?, "happy", "#d8c7ff"],
  ["鏈変簺璇濅細鍙樿交", "lonely", "#d8c7ff"],
  ["蹇冧簨鍏堝埆鏀舵嬀", "happy", "#b7b0ff"],
  ["鏅氶鐭ラ亾鍒嗗", "anxious", "#c7d4ff"],
  ["浣犲彲浠ヤ綆涓€鐐?, "lonely", "#9ea7ff"],
  ["鍏夊湪寰堣繙澶?, "hopeful", "#ffd7a8"],
  ["闆ㄤ細鎱㈡參鍋?, "quiet", "#c7d4ff"],
  ["鍒€曟棤浜哄洖搴?, "lonely", "#d8c7ff"],
  ["浠婂ぉ涓嶅繀瀹屾暣", "happy", "#b7b0ff"],
  ["鎯呯华姝ｅ湪鎹㈡皵", "calm", "#c7d4ff"],
  ["澶滆壊娌℃湁璐ｅ", "quiet", "#9ea7ff"],
  ["璁╅毦杩囧潗涓€浼氬効", "lonely", "#9ea7ff"],
  ["闆鹃噷涔熸湁璺?, "happy", "#d8c7ff"],
  ["浣犳病鏈夋參澶", "calm", "#c7d4ff"],
  ["蹇冧簨鍒お鐢ㄥ姏", "soft", "#f0d8ff"],
  ["鍥炲０涓嶆€ョ潃璧?, "lonely", "#d8c7ff"],
  ["涓€鐐规殩杩樺湪", "soft", "#ffd7a8"],
  ["鍒妸澶滄兂澶繁", "quiet", "#9ea7ff"],
  ["鍏夎惤鍦ㄤ綆澶?, "hopeful", "#ffd7a8"],
  ["浜戞浛浣犲畨闈?, "quiet", "#d8c7ff"],
  ["闆ㄥ０娌℃湁杩介棶", "quiet", "#c7d4ff"],
  ["浣犲彲浠ユ櫄鐐归啋", "soft", "#f0d8ff"],
  ["蹇冩參鎱㈡紓鐫€", "calm", "#c7d4ff"],
  ["鍒€ョ潃瑙ｉ噴", "quiet", "#b7b0ff"],
  ["鏃т簨杞昏交鏉惧紑", "happy", "#b7b0ff"],
  ["娼按鏇夸綘閫€鍚?, "anxious", "#c7d4ff"],
  ["鏈変簺鍐蜂細杩囧幓", "hopeful", "#ffd7a8"],
  ["鎶婅嚜宸辨斁杞?, "soft", "#f0d8ff"],
  ["澶滆繕娌￠偅涔堥粦", "quiet", "#9ea7ff"],
  ["蹇冮噷鐣欎竴鐐圭┖", "calm", "#c7d4ff"],
  ["椋庢病鏈夊偓浣?, "anxious", "#c7d4ff"],
  ["娌夐粯姝ｅ湪鍥炰俊", "lonely", "#d8c7ff"],
  ["浣犱笉闇€瑕佽瘉鏄?, "lonely", "#9ea7ff"],
  ["姊︿細鎱㈡參瑜壊", "soft", "#f0d8ff"],
  ["闆ㄦ妸澹伴煶鏀句綆", "quiet", "#c7d4ff"],
  ["鍒蹇冨お婊?, "happy", "#b7b0ff"],
  ["鍏夋鍦ㄩ潬杩?, "hopeful", "#ffd7a8"],
  ["闆炬姳浣忎簡杈圭晫", "happy", "#d8c7ff"],
  ["浠婂ぉ杞昏交杩囧幓", "calm", "#c7d4ff"],
  ["瀛ゅ崟涓嶆槸缁撹", "lonely", "#9ea7ff"],
  ["鏅氫竴鐐逛篃鍙互", "anxious", "#c7d4ff"],
  ["蹇冧簨鏈夊鍋?, "anxious", "#c7d4ff"],
  ["鍒€曠煭鏆傚け閲?, "calm", "#c7d4ff"],
  ["鐏厜杩樻病鐔?, "soft", "#ffd7a8"],
  ["澶滈娌℃湁绔嬪満", "quiet", "#9ea7ff"],
  ["鎶婄溂娉斁鎱?, "quiet", "#c7d4ff"],
  ["浣犲凡缁忓娓╂煍", "soft", "#f0d8ff"],
  ["绛旀鍏堜笉鍑虹幇", "quiet", "#d8c7ff"],
  ["鏃фⅵ涓嶇敤甯﹁蛋", "happy", "#b7b0ff"],
  ["鍏変笉蹇呰В閲?, "hopeful", "#ffd7a8"],
  ["蹇冨彲浠ユ殏鏃剁┖鐫€", "calm", "#c7d4ff"],
  ["闆句細鎱㈡參鍙樿杽", "happy", "#d8c7ff"],
  ["鍥炲０鏇夸綘鍋滅暀", "lonely", "#d8c7ff"],
  ["闆ㄥ悗涓嶇敤绔嬪埢鏅?, "quiet", "#c7d4ff"],
  ["澶滄妸澹伴煶鏀跺皬", "quiet", "#9ea7ff"],
  ["浣犲彧鏄渶瑕佸仠闈?, "anxious", "#c7d4ff"],
  ["鍒€曡嚜宸辨ā绯?, "happy", "#b7b0ff"],
  ["鎱㈡參涔熺畻鍓嶈繘", "anxious", "#c7d4ff"],
  ["蹇冮噷杩樻湁浣欐俯", "soft", "#ffd7a8"],
  ["鑺变細鏅氫竴鐐瑰紑", "soft", "#f0d8ff"],
  ["鏄ュぉ涓嶅偓浠讳綍浜?, "soft", "#f0d8ff"],
  ["璁板繂杞昏交钀戒笅", "happy", "#b7b0ff"],
  ["鍒€ワ紝澶╀細浜?, "hopeful", "#ffd7a8"],
  ["浣犲彲浠ヨ交杞荤鎺?, "happy", "#b7b0ff"],
  ["婕傜潃涔熸病鍏崇郴", "calm", "#c7d4ff"],
  ["鏈堜寒涔熸湁缂哄彛", "soft", "#d8c7ff"],
  ["鏄熷厜鍙槸璺繃", "hopeful", "#c7d4ff"],
  ["娌夐粯鎶婁綘鎵樹綇", "quiet", "#b7b0ff"],
  ["姊﹂噷鍏堝埆璧惰矾", "soft", "#f0d8ff"],
  ["鏈変簺鐤叉儷锛岄€傚悎鎱㈡參鏀惧洖瀹夐潤澶滆壊閲?, "soft", "#f0d8ff"],
  ["鍒€ョ潃鎰堝悎锛岄浼氫粠寰堣繙鐨勫湴鏂瑰洖鏉?, "anxious", "#c7d4ff"],
  ["蹇冧簨寰堣交锛屽嵈鍦ㄨ兏鍙ｅ仠浜嗗緢涔呭緢涔?, "happy", "#b7b0ff"],
  ["闆ㄥ０钀戒笅鏉ワ紝鍍忔浛浣犳妸鏃堕棿鎱㈡參鎸変綇", "quiet", "#c7d4ff"],
  ["浣犱笉鐢ㄨВ閲婏紝娌夐粯鏈潵涔熸湁涓€鐐归噸閲?, "quiet", "#b7b0ff"],
  ["澶滆壊鏀句綆浜嗭紝浠婂ぉ娌¤瀹岀殑澹伴煶杩樺湪", "quiet", "#9ea7ff"],
  ["娼按閫€鍘诲悗锛屽績閲屼細绌哄嚭涓€鐐瑰湴鏂?, "anxious", "#c7d4ff"],
  ["闆捐繕娌℃湁鏁ｏ紝浣犱篃涓嶅繀鎬ョ潃缁х画璧惰矾", "happy", "#d8c7ff"],
  ["鏈変簺绛旀锛屼細鍦ㄥ畨闈欎箣鍚庢參鎱㈠嚭鐜?, "quiet", "#d8c7ff"],
  ["鎶婅嚜宸辨斁杞伙紝鍐嶆參鎱㈤潬杩戞槑澶╀竴鐐圭偣", "calm", "#c7d4ff"],
  ["鍥炲０缁曚簡杩滆矾锛岃繕鏄細鍥炲埌浣犺繖閲?, "lonely", "#d8c7ff"],
  ["浠婂ぉ鏈夌偣鏆楋紝浣嗗苟涓嶆槸鎵€鏈夌殑灏藉ご", "hopeful", "#ffd7a8"],
  ["瀛ゅ崟鍙互鍧愪竴浼氬効锛岀劧鍚庤嚜宸辩寮€", "lonely", "#9ea7ff"],
  ["鍏夊湪瑁傜紳閲岋紝鎱㈡參鎶婅竟缂橀噸鏂扮収浜?, "hopeful", "#ffd7a8"],
  ["蹇冮噷閭ｉ樀闆紝浼氬湪鏃犱汉澶勮嚜宸卞彉灏?, "quiet", "#c7d4ff"],
  ["鏃т簨缈昏繃鍘伙紝涓嶅繀鍐嶇敤鍔涙寜浣忎笉鏀?, "happy", "#b7b0ff"],
  ["浣犲彧鏄疮浜嗭紝骞朵笉鏄摢閲岀湡鐨勫潖鎺変簡", "soft", "#f0d8ff"],
  ["婕傜潃涔熸病鍏崇郴锛屽哺浼氬湪鏌愪釜鍦版柟鍑虹幇", "calm", "#c7d4ff"],
  ["鍒€曡嚜宸辨ā绯婏紝閭ｅ彧鏄繃娓＄殑褰㈢姸", "happy", "#b7b0ff"],
  ["鏅氶缁忚繃鏃讹紝浼氭浛浣犲甫璧颁竴鐐圭偣鐤?, "anxious", "#c7d4ff"],
  ["娌夐粯涓嶆槸涓€鍫靛锛屾槸涓€鎵囧緢灏忕殑闂?, "quiet", "#d8c7ff"],
  ["蹇冭烦鎱笅鏉ヤ互鍚庯紝澶滆壊涔熻窡鐫€鍙樿交", "calm", "#c7d4ff"],
  ["鐏厜铏界劧寰堝皬锛屽嵈杩樺湪浣庡瀹夐潤浜潃", "soft", "#ffd7a8"],
  ["鑺辨櫄涓€鐐瑰紑锛屼篃涓嶅奖鍝嶅畠鎱㈡參鎴愪负鑺?, "soft", "#f0d8ff"],
  ["鏈堜寒缂轰簡涓€瑙掞紝涔熻繕鏄畨闈欑収鐫€浣?, "soft", "#d8c7ff"],
  ["姊﹂啋涔嬪墠锛岃鍏堝埆璐ｆ€粖澶╃殑鑷繁", "soft", "#f0d8ff"],
  ["鏄熷厜钀戒笅鏉ワ紝鍙槸瀹夐潤闄綘涓€浼氬効", "hopeful", "#c7d4ff"],
  ["鍒妸闅捐繃锛岃寰楀お瀹屾暣涔熷お鐢ㄥ姏浜?, "happy", "#b7b0ff"],
  ["浜戝眰鎱㈡參鍙樿杽锛屽ぉ灏变細鑷繁浜捣鏉?, "hopeful", "#ffd7a8"],
  ["鎯呯华鍙互鍋滀竴鏅氾紝鏄庡ぉ鍐嶈交杞昏璧?, "quiet", "#9ea7ff"],
  ["娴锋病鏈夊洖绛旓紝鍗翠竴鐩村畨闈欏湴鍚潃浣?, "anxious", "#c7d4ff"],
  ["浣犲彲浠ユ參鎱㈣蛋锛屽啀鎱㈡參鍥炲埌鑷繁韬竟", "calm", "#c7d4ff"],
  ["鏈変簺鍐凤紝浼氬湪娓呮櫒鍒版潵涔嬪墠鎱㈡參鏉惧紑", "hopeful", "#ffd7a8"],
  ["鍒拷鐫€鍏夎窇锛屽厛鍦ㄥ師鍦板畨闈欏潗涓嬫潵", "hopeful", "#ffd7a8"],
  ["闆炬姳浣忚竟鐣岋紝涔熸殏鏃惰交杞绘姳浣忎簡浣?, "happy", "#d8c7ff"],
  ["闆ㄥ仠涔嬪墠锛屼綘鍙互鍏堟矇榛樹竴浼氬効鍚?, "quiet", "#c7d4ff"],
  ["娌′汉鍥炲簲鐨勬椂鍊欙紝鍥炲０杩樺湪杩滃绛変綘", "lonely", "#d8c7ff"],
  ["浣犱笉蹇呮槑浜紝鎵嶇畻鐪熸鎶佃揪杩欓噷鍟?, "soft", "#f0d8ff"],
  ["蹇冧簨闈犲哺鐨勬椂鍊欙紝鍒€ョ潃缁х画寰€鍓嶈蛋", "anxious", "#c7d4ff"],
  ["璁板繂钀戒笅鏉ワ紝澹伴煶姣旀兂璞′腑鏇磋交浜?, "happy", "#b7b0ff"],
  ["澶滄妸浣犺棌濂斤紝骞朵笉鏄鎶婁綘涓笅鍟?, "quiet", "#9ea7ff"],
  ["婕傛诞鐨勬棩瀛愰噷锛屼篃浼氭湁涓€鐐圭偣鏂瑰悜", "calm", "#c7d4ff"],
  ["椋庡惞杩囦互鍚庯紝鐤肩棝浼氱◢寰澗寮€涓€鐐?, "anxious", "#c7d4ff"],
  ["瀛ゅ崟涓嶆槸绌猴紝鍙槸杩欓噷瀹炲湪澶畨闈欎簡", "lonely", "#9ea7ff"],
  ["鍒€ョ潃寮€鑺憋紝鍦熼噷杩樼暀鐫€涓€鐐圭偣鍐?, "soft", "#f0d8ff"],
  ["鐏厜鍦ㄤ綆澶勶紝鏇夸綘瀹堢潃涓€鐐规棫鏆栨剰", "soft", "#ffd7a8"],
  ["娌夐粯寰堥暱锛屼絾瀹冧笉浼氱湡鐨勫悶娌′綘鍟?, "quiet", "#b7b0ff"],
  ["姊︽妸绛旀锛屾斁鍦ㄤ綘杩樻病鎶佃揪鐨勫湴鏂?, "soft", "#f0d8ff"],
  ["涓€鐐瑰井鍏夛紝涔熻兘闄綘鎾戣繃浠婃櫄鐨勯", "hopeful", "#ffd7a8"],
  ["浣犲彲浠ュ仠涓嬶紝涓嶅繀鍚戜换浣曚汉璁ょ湡璇存槑", "quiet", "#d8c7ff"],
].map(([text, emotion, glow_color]) => ({
  text,
  emotion: legacyEmotionMap[emotion] ?? emotion,
  glow_color,
  is_public: true,
}));

const uniqueFragmentsByText = (rows) => {
  const seen = new Set();
  return rows.filter(({ text }) => {
    const key = text.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fragments = uniqueFragmentsByText(seedRows);

const assertUniqueSeedTexts = () => {
  if (fragments.length !== seedRows.length) {
    throw new Error("Duplicate seed texts found in seedRows.");
  }
};

const updateLegacyEmotionRows = async (supabase, rows) => {
  const rowsByNextEmotion = rows.reduce((groups, row) => {
    const nextEmotion = legacyEmotionMap[row.emotion];
    if (!nextEmotion) return groups;
    groups[nextEmotion] = [...(groups[nextEmotion] ?? []), row.id];
    return groups;
  }, {});

  for (const [emotion, ids] of Object.entries(rowsByNextEmotion)) {
    const { error } = await supabase.from(TABLE_NAME).update({ emotion }).in("id", ids);

    if (error) {
      throw error;
    }

    console.log(`Updated ${ids.length} legacy ${TABLE_NAME} rows to emotion "${emotion}".`);
  }
};

const main = async () => {
  assertUniqueSeedTexts();

  const env = await loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  }

  const supabase = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseAnonKey);
  const { data: existingRows, error: existingError } = await supabase.from(TABLE_NAME).select("id,text,emotion").limit(1000);

  if (existingError) {
    throw existingError;
  }

  await updateLegacyEmotionRows(supabase, existingRows ?? []);

  const existingTexts = new Set((existingRows ?? []).map((row) => row.text));
  const rowsToInsert = fragments.filter((fragment) => !existingTexts.has(fragment.text));

  if (rowsToInsert.length === 0) {
    console.log("No new emotion fragments to insert. All seed texts already exist.");
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).insert(rowsToInsert);

  if (error) {
    throw error;
  }

  console.log(`Inserted ${rowsToInsert.length} emotion fragments into ${TABLE_NAME}.`);
};

main().catch((error) => {
  console.error("Failed to seed emotion fragments.");
  console.error(error);
  process.exitCode = 1;
});
