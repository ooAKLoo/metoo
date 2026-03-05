/**
 * Food / activity keyword → display category mapping.
 * Multiple keywords can map to the same category.
 * Sorted longest-first at runtime to prefer specific matches.
 */
export const TAG_MAP: Record<string, { category: string; emoji: string }> = {
  // 烧烤
  "烧烤": { category: "烧烤", emoji: "🔥" },
  "烤肉": { category: "烧烤", emoji: "🔥" },
  "撸串": { category: "烧烤", emoji: "🔥" },
  // 火锅
  "火锅": { category: "火锅", emoji: "🍲" },
  "涮羊肉": { category: "火锅", emoji: "🍲" },
  // 烤鱼
  "烤鱼": { category: "烤鱼", emoji: "🐟" },
  // 甜品
  "蛋糕": { category: "甜品", emoji: "🍰" },
  "甜品": { category: "甜品", emoji: "🍰" },
  "甜点": { category: "甜品", emoji: "🍰" },
  "提拉米苏": { category: "甜品", emoji: "🍰" },
  "马卡龙": { category: "甜品", emoji: "🍰" },
  "舒芙蕾": { category: "甜品", emoji: "🍰" },
  "慕斯": { category: "甜品", emoji: "🍰" },
  "布丁": { category: "甜品", emoji: "🍰" },
  // 抹茶
  "抹茶": { category: "抹茶", emoji: "🍵" },
  // 咖啡
  "咖啡": { category: "咖啡", emoji: "☕" },
  "拿铁": { category: "咖啡", emoji: "☕" },
  // 奶茶
  "奶茶": { category: "奶茶", emoji: "🧋" },
  "茶饮": { category: "奶茶", emoji: "🧋" },
  // 面包
  "面包": { category: "面包", emoji: "🍞" },
  "烘焙": { category: "面包", emoji: "🍞" },
  "可颂": { category: "面包", emoji: "🍞" },
  "吐司": { category: "面包", emoji: "🍞" },
  "贝果": { category: "面包", emoji: "🍞" },
  // 日料
  "日料": { category: "日料", emoji: "🍣" },
  "寿司": { category: "日料", emoji: "🍣" },
  "刺身": { category: "日料", emoji: "🍣" },
  "居酒屋": { category: "日料", emoji: "🍣" },
  "天妇罗": { category: "日料", emoji: "🍣" },
  "章鱼烧": { category: "日料", emoji: "🍣" },
  // 小龙虾
  "小龙虾": { category: "小龙虾", emoji: "🦞" },
  // 海鲜
  "海鲜": { category: "海鲜", emoji: "🦀" },
  "生蚝": { category: "海鲜", emoji: "🦀" },
  "螃蟹": { category: "海鲜", emoji: "🦀" },
  "大闸蟹": { category: "海鲜", emoji: "🦀" },
  // 串串 / 麻辣烫
  "串串": { category: "串串", emoji: "🍢" },
  "串串香": { category: "串串", emoji: "🍢" },
  "麻辣烫": { category: "麻辣烫", emoji: "🌶️" },
  "冒菜": { category: "麻辣烫", emoji: "🌶️" },
  "麻辣拌": { category: "麻辣烫", emoji: "🌶️" },
  // 披萨
  "披萨": { category: "披萨", emoji: "🍕" },
  "比萨": { category: "披萨", emoji: "🍕" },
  // 汉堡
  "汉堡": { category: "汉堡", emoji: "🍔" },
  // 炸鸡
  "炸鸡": { category: "炸鸡", emoji: "🍗" },
  // 冰淇淋
  "冰淇淋": { category: "冰淇淋", emoji: "🍦" },
  "冰激凌": { category: "冰淇淋", emoji: "🍦" },
  "雪糕": { category: "冰淇淋", emoji: "🍦" },
  // 饺子 / 包子
  "饺子": { category: "饺子", emoji: "🥟" },
  "小笼包": { category: "饺子", emoji: "🥟" },
  "灌汤包": { category: "饺子", emoji: "🥟" },
  "生煎": { category: "饺子", emoji: "🥟" },
  "锅贴": { category: "饺子", emoji: "🥟" },
  // 烤鸭
  "烤鸭": { category: "烤鸭", emoji: "🦆" },
  // 粉面
  "螺蛳粉": { category: "粉面", emoji: "🍜" },
  "酸辣粉": { category: "粉面", emoji: "🍜" },
  "牛肉面": { category: "粉面", emoji: "🍜" },
  "热干面": { category: "粉面", emoji: "🍜" },
  "拉面": { category: "粉面", emoji: "🍜" },
  "米线": { category: "粉面", emoji: "🍜" },
  "凉皮": { category: "粉面", emoji: "🍜" },
  "刀削面": { category: "粉面", emoji: "🍜" },
  // 早茶 / 下午茶
  "早茶": { category: "早茶", emoji: "🫖" },
  "下午茶": { category: "下午茶", emoji: "🫖" },
  "茶点": { category: "早茶", emoji: "🫖" },
  "肠粉": { category: "早茶", emoji: "🫖" },
  // 西餐
  "牛排": { category: "西餐", emoji: "🥩" },
  "西餐": { category: "西餐", emoji: "🥩" },
  "意面": { category: "西餐", emoji: "🥩" },
  // 川菜
  "川菜": { category: "川菜", emoji: "🌶️" },
  // 粤菜
  "粤菜": { category: "粤菜", emoji: "🥘" },
  // 湘菜
  "湘菜": { category: "湘菜", emoji: "🥘" },
  // 韩餐
  "韩餐": { category: "韩餐", emoji: "🥘" },
  "韩料": { category: "韩餐", emoji: "🥘" },
  "烤五花肉": { category: "韩餐", emoji: "🥘" },
  // 酒
  "鸡尾酒": { category: "酒吧", emoji: "🍸" },
  "酒吧": { category: "酒吧", emoji: "🍸" },
  "清吧": { category: "酒吧", emoji: "🍸" },
  // 自助
  "自助餐": { category: "自助餐", emoji: "🍱" },
  "自助": { category: "自助餐", emoji: "🍱" },
  // 探店
  "探店": { category: "探店", emoji: "🏪" },
};

/** Pre-sorted keywords: longest first for greedy matching */
export const TAG_KEYWORDS = Object.keys(TAG_MAP).sort(
  (a, b) => b.length - a.length
);
