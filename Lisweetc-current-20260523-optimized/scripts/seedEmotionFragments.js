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

const seedRows = [
  ["别急，月亮也会晚到", "moonlight", "#d8c7ff"],
  ["光会穿过裂缝", "hope", "#ffd7a8"],
  ["慢一点，也没关系", "calm", "#c7d4ff"],
  ["风会记住疲惫", "drift", "#c7d4ff"],
  ["安静也是答案", "quiet", "#d8c7ff"],
  ["夜晚需要沉默", "night", "#9ea7ff"],
  ["情绪只是停泊", "tide", "#c7d4ff"],
  ["海会收留晚风", "tide", "#c7d4ff"],
  ["梦替你留着答案", "dream", "#f0d8ff"],
  ["允许自己下沉", "soft", "#f0d8ff"],
  ["你不用一直发光", "calm", "#c7d4ff"],
  ["回声会找到出口", "echo", "#d8c7ff"],
  ["雨停前抱抱自己", "rain", "#c7d4ff"],
  ["夜色正在变轻", "dawn", "#ffd7a8"],
  ["迟到也算抵达", "drift", "#b7b0ff"],
  ["今天先别逞强", "soft", "#f0d8ff"],
  ["心事可以很轻", "calm", "#c7d4ff"],
  ["把难过放一会儿", "haze", "#d8c7ff"],
  ["风慢慢吹过去", "drift", "#c7d4ff"],
  ["你可以不回答", "quiet", "#d8c7ff"],
  ["沉默也有形状", "silence", "#b7b0ff"],
  ["别把自己催坏", "soft", "#f0d8ff"],
  ["有些累不用解释", "alone", "#9ea7ff"],
  ["先停在这里吧", "calm", "#c7d4ff"],
  ["心跳还在靠岸", "tide", "#c7d4ff"],
  ["雾会替你遮住", "haze", "#d8c7ff"],
  ["不要急着晴朗", "rain", "#c7d4ff"],
  ["眼泪也会退潮", "tide", "#c7d4ff"],
  ["别怕今天很慢", "calm", "#c7d4ff"],
  ["一点光就够了", "hope", "#ffd7a8"],
  ["孤单暂时坐下", "alone", "#9ea7ff"],
  ["心事没有吵醒谁", "memory", "#b7b0ff"],
  ["把话留给风", "drift", "#c7d4ff"],
  ["你已经很轻了", "floating", "#c7d4ff"],
  ["别追赶所有声音", "quiet", "#d8c7ff"],
  ["今晚先松手", "night", "#9ea7ff"],
  ["雨声替你停顿", "rain", "#c7d4ff"],
  ["光不用很大", "hope", "#ffd7a8"],
  ["疲惫也能靠岸", "tide", "#c7d4ff"],
  ["先让心慢下来", "calm", "#c7d4ff"],
  ["雾散之前别急", "haze", "#d8c7ff"],
  ["回忆轻轻翻面", "memory", "#b7b0ff"],
  ["你不必马上好", "soft", "#f0d8ff"],
  ["空白也算休息", "quiet", "#d8c7ff"],
  ["夜里别责怪自己", "night", "#9ea7ff"],
  ["风把重的带走", "drift", "#c7d4ff"],
  ["心会慢慢回温", "ember", "#ffd7a8"],
  ["别急着变明亮", "dawn", "#ffd7a8"],
  ["沉下去也可以", "blur", "#b7b0ff"],
  ["你只是有点累", "soft", "#f0d8ff"],
  ["潮声很懂沉默", "tide", "#c7d4ff"],
  ["让今天小一点", "calm", "#c7d4ff"],
  ["别把痛说满", "haze", "#d8c7ff"],
  ["有些话会变轻", "echo", "#d8c7ff"],
  ["心事先别收拾", "memory", "#b7b0ff"],
  ["晚风知道分寸", "drift", "#c7d4ff"],
  ["你可以低一点", "alone", "#9ea7ff"],
  ["光在很远处", "hope", "#ffd7a8"],
  ["雨会慢慢停", "rain", "#c7d4ff"],
  ["别怕无人回应", "echo", "#d8c7ff"],
  ["今天不必完整", "blur", "#b7b0ff"],
  ["情绪正在换气", "floating", "#c7d4ff"],
  ["夜色没有责备", "night", "#9ea7ff"],
  ["让难过坐一会儿", "alone", "#9ea7ff"],
  ["雾里也有路", "haze", "#d8c7ff"],
  ["你没有慢太多", "calm", "#c7d4ff"],
  ["心事别太用力", "soft", "#f0d8ff"],
  ["回声不急着走", "echo", "#d8c7ff"],
  ["一点暖还在", "ember", "#ffd7a8"],
  ["别把夜想太深", "night", "#9ea7ff"],
  ["光落在低处", "hope", "#ffd7a8"],
  ["云替你安静", "quiet", "#d8c7ff"],
  ["雨声没有追问", "rain", "#c7d4ff"],
  ["你可以晚点醒", "dream", "#f0d8ff"],
  ["心慢慢漂着", "floating", "#c7d4ff"],
  ["别急着解释", "silence", "#b7b0ff"],
  ["旧事轻轻松开", "memory", "#b7b0ff"],
  ["潮水替你退后", "tide", "#c7d4ff"],
  ["有些冷会过去", "dawn", "#ffd7a8"],
  ["把自己放轻", "soft", "#f0d8ff"],
  ["夜还没那么黑", "night", "#9ea7ff"],
  ["心里留一点空", "calm", "#c7d4ff"],
  ["风没有催你", "drift", "#c7d4ff"],
  ["沉默正在回信", "echo", "#d8c7ff"],
  ["你不需要证明", "alone", "#9ea7ff"],
  ["梦会慢慢褪色", "dream", "#f0d8ff"],
  ["雨把声音放低", "rain", "#c7d4ff"],
  ["别让心太满", "blur", "#b7b0ff"],
  ["光正在靠近", "hope", "#ffd7a8"],
  ["雾抱住了边界", "haze", "#d8c7ff"],
  ["今天轻轻过去", "calm", "#c7d4ff"],
  ["孤单不是结论", "alone", "#9ea7ff"],
  ["晚一点也可以", "drift", "#c7d4ff"],
  ["心事有处停", "tide", "#c7d4ff"],
  ["别怕短暂失重", "floating", "#c7d4ff"],
  ["火光还没熄", "ember", "#ffd7a8"],
  ["夜风没有立场", "night", "#9ea7ff"],
  ["把眼泪放慢", "rain", "#c7d4ff"],
  ["你已经够温柔", "soft", "#f0d8ff"],
  ["答案先不出现", "quiet", "#d8c7ff"],
  ["旧梦不用带走", "memory", "#b7b0ff"],
  ["光不必解释", "hope", "#ffd7a8"],
  ["心可以暂时空着", "calm", "#c7d4ff"],
  ["雾会慢慢变薄", "haze", "#d8c7ff"],
  ["回声替你停留", "echo", "#d8c7ff"],
  ["雨后不用立刻晴", "rain", "#c7d4ff"],
  ["夜把声音收小", "night", "#9ea7ff"],
  ["你只是需要停靠", "tide", "#c7d4ff"],
  ["别怕自己模糊", "blur", "#b7b0ff"],
  ["慢慢也算前进", "drift", "#c7d4ff"],
  ["心里还有余温", "ember", "#ffd7a8"],
  ["花会晚一点开", "bloom", "#f0d8ff"],
  ["春天不催任何人", "bloom", "#f0d8ff"],
  ["记忆轻轻落下", "memory", "#b7b0ff"],
  ["别急，天会亮", "dawn", "#ffd7a8"],
  ["你可以轻轻碎掉", "blur", "#b7b0ff"],
  ["漂着也没关系", "floating", "#c7d4ff"],
  ["月亮也有缺口", "moonlight", "#d8c7ff"],
  ["星光只是路过", "starlight", "#c7d4ff"],
  ["沉默把你托住", "silence", "#b7b0ff"],
  ["梦里先别赶路", "dream", "#f0d8ff"],
  ["有些疲惫，适合慢慢放回安静夜色里", "soft", "#f0d8ff"],
  ["别急着愈合，风会从很远的地方回来", "drift", "#c7d4ff"],
  ["心事很轻，却在胸口停了很久很久", "memory", "#b7b0ff"],
  ["雨声落下来，像替你把时间慢慢按住", "rain", "#c7d4ff"],
  ["你不用解释，沉默本来也有一点重量", "silence", "#b7b0ff"],
  ["夜色放低了，今天没说完的声音还在", "night", "#9ea7ff"],
  ["潮水退去后，心里会空出一点地方", "tide", "#c7d4ff"],
  ["雾还没有散，你也不必急着继续赶路", "haze", "#d8c7ff"],
  ["有些答案，会在安静之后慢慢出现", "quiet", "#d8c7ff"],
  ["把自己放轻，再慢慢靠近明天一点点", "calm", "#c7d4ff"],
  ["回声绕了远路，还是会回到你这里", "echo", "#d8c7ff"],
  ["今天有点暗，但并不是所有的尽头", "dawn", "#ffd7a8"],
  ["孤单可以坐一会儿，然后自己离开", "alone", "#9ea7ff"],
  ["光在裂缝里，慢慢把边缘重新照亮", "hope", "#ffd7a8"],
  ["心里那阵雨，会在无人处自己变小", "rain", "#c7d4ff"],
  ["旧事翻过去，不必再用力按住不放", "memory", "#b7b0ff"],
  ["你只是累了，并不是哪里真的坏掉了", "soft", "#f0d8ff"],
  ["漂着也没关系，岸会在某个地方出现", "floating", "#c7d4ff"],
  ["别怕自己模糊，那只是过渡的形状", "blur", "#b7b0ff"],
  ["晚风经过时，会替你带走一点点疼", "drift", "#c7d4ff"],
  ["沉默不是一堵墙，是一扇很小的门", "quiet", "#d8c7ff"],
  ["心跳慢下来以后，夜色也跟着变轻", "calm", "#c7d4ff"],
  ["火光虽然很小，却还在低处安静亮着", "ember", "#ffd7a8"],
  ["花晚一点开，也不影响它慢慢成为花", "bloom", "#f0d8ff"],
  ["月亮缺了一角，也还是安静照着你", "moonlight", "#d8c7ff"],
  ["梦醒之前，请先别责怪今天的自己", "dream", "#f0d8ff"],
  ["星光落下来，只是安静陪你一会儿", "starlight", "#c7d4ff"],
  ["别把难过，说得太完整也太用力了", "blur", "#b7b0ff"],
  ["云层慢慢变薄，天就会自己亮起来", "dawn", "#ffd7a8"],
  ["情绪可以停一晚，明天再轻轻说起", "night", "#9ea7ff"],
  ["海没有回答，却一直安静地听着你", "tide", "#c7d4ff"],
  ["你可以慢慢走，再慢慢回到自己身边", "calm", "#c7d4ff"],
  ["有些冷，会在清晨到来之前慢慢松开", "dawn", "#ffd7a8"],
  ["别追着光跑，先在原地安静坐下来", "hope", "#ffd7a8"],
  ["雾抱住边界，也暂时轻轻抱住了你", "haze", "#d8c7ff"],
  ["雨停之前，你可以先沉默一会儿吧", "rain", "#c7d4ff"],
  ["没人回应的时候，回声还在远处等你", "echo", "#d8c7ff"],
  ["你不必明亮，才算真正抵达这里啊", "soft", "#f0d8ff"],
  ["心事靠岸的时候，别急着继续往前走", "tide", "#c7d4ff"],
  ["记忆落下来，声音比想象中更轻些", "memory", "#b7b0ff"],
  ["夜把你藏好，并不是要把你丢下啊", "night", "#9ea7ff"],
  ["漂浮的日子里，也会有一点点方向", "floating", "#c7d4ff"],
  ["风吹过以后，疼痛会稍微松开一点", "drift", "#c7d4ff"],
  ["孤单不是空，只是这里实在太安静了", "alone", "#9ea7ff"],
  ["别急着开花，土里还留着一点点冷", "bloom", "#f0d8ff"],
  ["火光在低处，替你守着一点旧暖意", "ember", "#ffd7a8"],
  ["沉默很长，但它不会真的吞没你啊", "silence", "#b7b0ff"],
  ["梦把答案，放在你还没抵达的地方", "dream", "#f0d8ff"],
  ["一点微光，也能陪你撑过今晚的风", "hope", "#ffd7a8"],
  ["你可以停下，不必向任何人认真说明", "quiet", "#d8c7ff"],
].map(([text, emotion, glow_color]) => ({
  text,
  emotion,
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

const main = async () => {
  assertUniqueSeedTexts();

  const env = await loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  }

  const supabase = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseAnonKey);
  const { data: existingRows, error: existingError } = await supabase.from(TABLE_NAME).select("text").limit(1000);

  if (existingError) {
    throw existingError;
  }

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
