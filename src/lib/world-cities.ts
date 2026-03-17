export interface WorldCity {
  name: string;      // Chinese name
  country: string;   // Chinese country name
  lng: number;
  lat: number;
}

/** Countries with center coordinates (Chinese name → [lng, lat]) */
export const COUNTRIES: Record<string, [number, number]> = {
  // 东亚
  日本: [138.3, 36.2],
  韩国: [127.8, 36.5],
  朝鲜: [127.0, 40.0],
  蒙古: [104.0, 46.0],
  // 东南亚
  泰国: [100.5, 15.9],
  越南: [106.6, 16.0],
  新加坡: [103.8, 1.35],
  马来西亚: [101.7, 3.1],
  印度尼西亚: [106.8, -6.2],
  印尼: [106.8, -6.2],
  菲律宾: [121.0, 14.6],
  柬埔寨: [104.9, 11.5],
  缅甸: [96.2, 16.9],
  老挝: [102.6, 18.0],
  文莱: [114.9, 4.9],
  // 南亚
  印度: [77.2, 28.6],
  斯里兰卡: [79.9, 6.9],
  尼泊尔: [85.3, 27.7],
  巴基斯坦: [73.0, 33.7],
  孟加拉: [90.4, 23.7],
  马尔代夫: [73.5, 4.2],
  // 中亚 / 西亚
  土耳其: [32.9, 39.9],
  阿联酋: [54.4, 24.5],
  以色列: [35.2, 31.8],
  沙特: [46.7, 24.7],
  伊朗: [51.4, 35.7],
  卡塔尔: [51.5, 25.3],
  约旦: [35.9, 31.9],
  阿曼: [58.5, 23.6],
  格鲁吉亚: [44.8, 41.7],
  亚美尼亚: [44.5, 40.2],
  阿塞拜疆: [49.9, 40.4],
  // 欧洲
  英国: [-0.1, 51.5],
  法国: [2.3, 48.9],
  德国: [13.4, 52.5],
  意大利: [12.5, 41.9],
  西班牙: [-3.7, 40.4],
  葡萄牙: [-9.1, 38.7],
  荷兰: [4.9, 52.4],
  比利时: [4.4, 50.8],
  瑞士: [7.4, 46.9],
  奥地利: [16.4, 48.2],
  捷克: [14.4, 50.1],
  匈牙利: [19.0, 47.5],
  波兰: [21.0, 52.2],
  希腊: [23.7, 37.97],
  瑞典: [18.1, 59.3],
  挪威: [10.7, 59.9],
  芬兰: [24.9, 60.2],
  丹麦: [12.6, 55.7],
  冰岛: [-22.0, 64.1],
  爱尔兰: [-6.3, 53.3],
  俄罗斯: [37.6, 55.8],
  克罗地亚: [16.0, 45.8],
  塞尔维亚: [20.5, 44.8],
  罗马尼亚: [26.1, 44.4],
  保加利亚: [23.3, 42.7],
  斯洛文尼亚: [14.5, 46.1],
  斯洛伐克: [17.1, 48.1],
  爱沙尼亚: [24.7, 59.4],
  拉脱维亚: [24.1, 56.9],
  立陶宛: [25.3, 54.7],
  黑山: [19.3, 42.4],
  摩纳哥: [7.4, 43.7],
  马耳他: [14.5, 35.9],
  // 北美
  美国: [-77.0, 38.9],
  加拿大: [-75.7, 45.4],
  墨西哥: [-99.1, 19.4],
  // 南美
  巴西: [-43.2, -22.9],
  阿根廷: [-58.4, -34.6],
  秘鲁: [-77.0, -12.0],
  智利: [-70.7, -33.4],
  哥伦比亚: [-74.1, 4.6],
  // 大洋洲
  澳大利亚: [151.2, -33.9],
  澳洲: [151.2, -33.9],
  新西兰: [174.8, -41.3],
  斐济: [178.0, -18.1],
  // 非洲
  埃及: [31.2, 30.0],
  摩洛哥: [-7.6, 33.6],
  南非: [18.4, -33.9],
  肯尼亚: [36.8, -1.3],
  坦桑尼亚: [39.3, -6.8],
  突尼斯: [10.2, 36.8],
  毛里求斯: [57.5, -20.2],
};

/** International cities (sorted by region) */
export const WORLD_CITIES: WorldCity[] = [
  // ── 日本 ──
  { name: "东京", country: "日本", lng: 139.7, lat: 35.7 },
  { name: "大阪", country: "日本", lng: 135.5, lat: 34.7 },
  { name: "京都", country: "日本", lng: 135.8, lat: 35.0 },
  { name: "奈良", country: "日本", lng: 135.8, lat: 34.7 },
  { name: "名古屋", country: "日本", lng: 136.9, lat: 35.2 },
  { name: "福冈", country: "日本", lng: 130.4, lat: 33.6 },
  { name: "札幌", country: "日本", lng: 141.3, lat: 43.1 },
  { name: "冲绳", country: "日本", lng: 127.7, lat: 26.3 },
  { name: "北海道", country: "日本", lng: 141.3, lat: 43.1 },
  { name: "横滨", country: "日本", lng: 139.6, lat: 35.4 },
  { name: "神户", country: "日本", lng: 135.2, lat: 34.7 },
  { name: "箱根", country: "日本", lng: 139.1, lat: 35.2 },
  { name: "轻井泽", country: "日本", lng: 138.6, lat: 36.3 },
  { name: "镰仓", country: "日本", lng: 139.6, lat: 35.3 },
  { name: "广岛", country: "日本", lng: 132.5, lat: 34.4 },
  { name: "仙台", country: "日本", lng: 140.9, lat: 38.3 },
  { name: "金泽", country: "日本", lng: 136.6, lat: 36.6 },
  { name: "长崎", country: "日本", lng: 129.9, lat: 32.7 },
  { name: "熊本", country: "日本", lng: 130.7, lat: 32.8 },
  { name: "富士山", country: "日本", lng: 138.7, lat: 35.4 },

  // ── 韩国 ──
  { name: "首尔", country: "韩国", lng: 127.0, lat: 37.6 },
  { name: "釜山", country: "韩国", lng: 129.1, lat: 35.2 },
  { name: "济州岛", country: "韩国", lng: 126.5, lat: 33.5 },
  { name: "仁川", country: "韩国", lng: 126.7, lat: 37.5 },
  { name: "大邱", country: "韩国", lng: 128.6, lat: 35.9 },

  // ── 泰国 ──
  { name: "曼谷", country: "泰国", lng: 100.5, lat: 13.8 },
  { name: "清迈", country: "泰国", lng: 98.98, lat: 18.8 },
  { name: "普吉岛", country: "泰国", lng: 98.3, lat: 7.9 },
  { name: "芭提雅", country: "泰国", lng: 100.9, lat: 12.9 },
  { name: "甲米", country: "泰国", lng: 98.9, lat: 8.1 },
  { name: "苏梅岛", country: "泰国", lng: 100.0, lat: 9.5 },
  { name: "清莱", country: "泰国", lng: 99.8, lat: 19.9 },
  { name: "华欣", country: "泰国", lng: 99.97, lat: 12.6 },

  // ── 越南 ──
  { name: "河内", country: "越南", lng: 105.8, lat: 21.0 },
  { name: "胡志明市", country: "越南", lng: 106.7, lat: 10.8 },
  { name: "岘港", country: "越南", lng: 108.2, lat: 16.1 },
  { name: "芽庄", country: "越南", lng: 109.2, lat: 12.2 },
  { name: "大叻", country: "越南", lng: 108.4, lat: 11.9 },
  { name: "会安", country: "越南", lng: 108.3, lat: 15.9 },
  { name: "下龙湾", country: "越南", lng: 107.0, lat: 20.9 },
  { name: "富国岛", country: "越南", lng: 104.0, lat: 10.2 },

  // ── 新加坡 ──
  { name: "新加坡", country: "新加坡", lng: 103.8, lat: 1.35 },

  // ── 马来西亚 ──
  { name: "吉隆坡", country: "马来西亚", lng: 101.7, lat: 3.1 },
  { name: "槟城", country: "马来西亚", lng: 100.3, lat: 5.4 },
  { name: "马六甲", country: "马来西亚", lng: 102.2, lat: 2.2 },
  { name: "沙巴", country: "马来西亚", lng: 116.1, lat: 6.0 },
  { name: "兰卡威", country: "马来西亚", lng: 99.7, lat: 6.4 },
  { name: "仙本那", country: "马来西亚", lng: 118.6, lat: 4.5 },

  // ── 印度尼西亚 ──
  { name: "巴厘岛", country: "印度尼西亚", lng: 115.2, lat: -8.3 },
  { name: "雅加达", country: "印度尼西亚", lng: 106.8, lat: -6.2 },

  // ── 菲律宾 ──
  { name: "马尼拉", country: "菲律宾", lng: 120.98, lat: 14.6 },
  { name: "宿务", country: "菲律宾", lng: 123.9, lat: 10.3 },
  { name: "长滩岛", country: "菲律宾", lng: 121.97, lat: 11.97 },

  // ── 柬埔寨 ──
  { name: "暹粒", country: "柬埔寨", lng: 103.9, lat: 13.4 },
  { name: "金边", country: "柬埔寨", lng: 104.9, lat: 11.6 },
  { name: "吴哥窟", country: "柬埔寨", lng: 103.9, lat: 13.4 },

  // ── 缅甸 ──
  { name: "仰光", country: "缅甸", lng: 96.2, lat: 16.9 },
  { name: "蒲甘", country: "缅甸", lng: 94.9, lat: 21.2 },
  { name: "曼德勒", country: "缅甸", lng: 96.1, lat: 21.97 },

  // ── 老挝 ──
  { name: "万象", country: "老挝", lng: 102.6, lat: 18.0 },
  { name: "琅勃拉邦", country: "老挝", lng: 102.1, lat: 19.9 },

  // ── 印度 ──
  { name: "新德里", country: "印度", lng: 77.2, lat: 28.6 },
  { name: "孟买", country: "印度", lng: 72.9, lat: 19.1 },
  { name: "加尔各答", country: "印度", lng: 88.4, lat: 22.6 },
  { name: "斋浦尔", country: "印度", lng: 75.8, lat: 26.9 },
  { name: "泰姬陵", country: "印度", lng: 78.0, lat: 27.2 },
  { name: "瓦拉纳西", country: "印度", lng: 83.0, lat: 25.3 },
  { name: "果阿", country: "印度", lng: 73.9, lat: 15.5 },

  // ── 斯里兰卡 ──
  { name: "科伦坡", country: "斯里兰卡", lng: 79.9, lat: 6.9 },

  // ── 尼泊尔 ──
  { name: "加德满都", country: "尼泊尔", lng: 85.3, lat: 27.7 },

  // ── 马尔代夫 ──
  { name: "马累", country: "马尔代夫", lng: 73.5, lat: 4.2 },

  // ── 土耳其 ──
  { name: "伊斯坦布尔", country: "土耳其", lng: 29.0, lat: 41.0 },
  { name: "卡帕多奇亚", country: "土耳其", lng: 34.8, lat: 38.6 },
  { name: "安塔利亚", country: "土耳其", lng: 30.7, lat: 36.9 },
  { name: "棉花堡", country: "土耳其", lng: 29.1, lat: 37.9 },
  { name: "以弗所", country: "土耳其", lng: 27.3, lat: 37.9 },

  // ── 阿联酋 ──
  { name: "迪拜", country: "阿联酋", lng: 55.3, lat: 25.2 },
  { name: "阿布扎比", country: "阿联酋", lng: 54.4, lat: 24.5 },

  // ── 以色列 ──
  { name: "耶路撒冷", country: "以色列", lng: 35.2, lat: 31.8 },
  { name: "特拉维夫", country: "以色列", lng: 34.8, lat: 32.1 },

  // ── 格鲁吉亚 ──
  { name: "第比利斯", country: "格鲁吉亚", lng: 44.8, lat: 41.7 },

  // ── 澳大利亚 ──
  { name: "悉尼", country: "澳大利亚", lng: 151.2, lat: -33.9 },
  { name: "墨尔本", country: "澳大利亚", lng: 144.96, lat: -37.8 },
  { name: "布里斯班", country: "澳大利亚", lng: 153.0, lat: -27.5 },
  { name: "珀斯", country: "澳大利亚", lng: 115.9, lat: -31.95 },
  { name: "阿德莱德", country: "澳大利亚", lng: 138.6, lat: -34.9 },
  { name: "堪培拉", country: "澳大利亚", lng: 149.1, lat: -35.3 },
  { name: "黄金海岸", country: "澳大利亚", lng: 153.4, lat: -28.0 },
  { name: "凯恩斯", country: "澳大利亚", lng: 145.8, lat: -16.9 },
  { name: "霍巴特", country: "澳大利亚", lng: 147.3, lat: -42.9 },
  { name: "大堡礁", country: "澳大利亚", lng: 147.7, lat: -18.3 },

  // ── 新西兰 ──
  { name: "奥克兰", country: "新西兰", lng: 174.8, lat: -36.9 },
  { name: "皇后镇", country: "新西兰", lng: 168.7, lat: -45.0 },
  { name: "惠灵顿", country: "新西兰", lng: 174.8, lat: -41.3 },
  { name: "基督城", country: "新西兰", lng: 172.6, lat: -43.5 },

  // ── 英国 ──
  { name: "伦敦", country: "英国", lng: -0.1, lat: 51.5 },
  { name: "爱丁堡", country: "英国", lng: -3.2, lat: 55.95 },
  { name: "曼彻斯特", country: "英国", lng: -2.2, lat: 53.5 },
  { name: "牛津", country: "英国", lng: -1.3, lat: 51.8 },
  { name: "剑桥", country: "英国", lng: 0.1, lat: 52.2 },
  { name: "伯明翰", country: "英国", lng: -1.9, lat: 52.5 },
  { name: "利物浦", country: "英国", lng: -3.0, lat: 53.4 },
  { name: "巴斯", country: "英国", lng: -2.4, lat: 51.4 },

  // ── 法国 ──
  { name: "巴黎", country: "法国", lng: 2.3, lat: 48.9 },
  { name: "尼斯", country: "法国", lng: 7.3, lat: 43.7 },
  { name: "马赛", country: "法国", lng: 5.4, lat: 43.3 },
  { name: "里昂", country: "法国", lng: 4.8, lat: 45.8 },
  { name: "普罗旺斯", country: "法国", lng: 5.4, lat: 43.5 },
  { name: "波尔多", country: "法国", lng: -0.6, lat: 44.8 },
  { name: "斯特拉斯堡", country: "法国", lng: 7.8, lat: 48.6 },

  // ── 意大利 ──
  { name: "罗马", country: "意大利", lng: 12.5, lat: 41.9 },
  { name: "米兰", country: "意大利", lng: 9.2, lat: 45.5 },
  { name: "威尼斯", country: "意大利", lng: 12.3, lat: 45.4 },
  { name: "佛罗伦萨", country: "意大利", lng: 11.3, lat: 43.8 },
  { name: "那不勒斯", country: "意大利", lng: 14.3, lat: 40.9 },
  { name: "五渔村", country: "意大利", lng: 9.7, lat: 44.1 },
  { name: "阿马尔菲", country: "意大利", lng: 14.6, lat: 40.6 },

  // ── 西班牙 ──
  { name: "巴塞罗那", country: "西班牙", lng: 2.2, lat: 41.4 },
  { name: "马德里", country: "西班牙", lng: -3.7, lat: 40.4 },
  { name: "塞维利亚", country: "西班牙", lng: -6.0, lat: 37.4 },
  { name: "格拉纳达", country: "西班牙", lng: -3.6, lat: 37.2 },

  // ── 德国 ──
  { name: "柏林", country: "德国", lng: 13.4, lat: 52.5 },
  { name: "慕尼黑", country: "德国", lng: 11.6, lat: 48.1 },
  { name: "法兰克福", country: "德国", lng: 8.7, lat: 50.1 },
  { name: "汉堡", country: "德国", lng: 10.0, lat: 53.6 },

  // ── 瑞士 ──
  { name: "苏黎世", country: "瑞士", lng: 8.5, lat: 47.4 },
  { name: "日内瓦", country: "瑞士", lng: 6.1, lat: 46.2 },
  { name: "因特拉肯", country: "瑞士", lng: 7.9, lat: 46.7 },
  { name: "卢塞恩", country: "瑞士", lng: 8.3, lat: 47.1 },
  { name: "少女峰", country: "瑞士", lng: 7.96, lat: 46.5 },

  // ── 荷兰 ──
  { name: "阿姆斯特丹", country: "荷兰", lng: 4.9, lat: 52.4 },

  // ── 比利时 ──
  { name: "布鲁塞尔", country: "比利时", lng: 4.4, lat: 50.8 },

  // ── 奥地利 ──
  { name: "维也纳", country: "奥地利", lng: 16.4, lat: 48.2 },
  { name: "萨尔茨堡", country: "奥地利", lng: 13.0, lat: 47.8 },
  { name: "哈尔施塔特", country: "奥地利", lng: 13.6, lat: 47.6 },

  // ── 捷克 ──
  { name: "布拉格", country: "捷克", lng: 14.4, lat: 50.1 },
  { name: "CK小镇", country: "捷克", lng: 14.3, lat: 48.8 },

  // ── 匈牙利 ──
  { name: "布达佩斯", country: "匈牙利", lng: 19.0, lat: 47.5 },

  // ── 希腊 ──
  { name: "雅典", country: "希腊", lng: 23.7, lat: 37.97 },
  { name: "圣托里尼", country: "希腊", lng: 25.4, lat: 36.4 },
  { name: "米克诺斯", country: "希腊", lng: 25.3, lat: 37.4 },

  // ── 葡萄牙 ──
  { name: "里斯本", country: "葡萄牙", lng: -9.1, lat: 38.7 },
  { name: "波尔图", country: "葡萄牙", lng: -8.6, lat: 41.15 },

  // ── 克罗地亚 ──
  { name: "杜布罗夫尼克", country: "克罗地亚", lng: 18.1, lat: 42.6 },
  { name: "萨格勒布", country: "克罗地亚", lng: 16.0, lat: 45.8 },

  // ── 北欧 ──
  { name: "雷克雅未克", country: "冰岛", lng: -22.0, lat: 64.1 },
  { name: "奥斯陆", country: "挪威", lng: 10.7, lat: 59.9 },
  { name: "卑尔根", country: "挪威", lng: 5.3, lat: 60.4 },
  { name: "特罗姆瑟", country: "挪威", lng: 19.0, lat: 69.6 },
  { name: "斯德哥尔摩", country: "瑞典", lng: 18.1, lat: 59.3 },
  { name: "赫尔辛基", country: "芬兰", lng: 24.9, lat: 60.2 },
  { name: "罗瓦涅米", country: "芬兰", lng: 25.7, lat: 66.5 },
  { name: "哥本哈根", country: "丹麦", lng: 12.6, lat: 55.7 },

  // ── 俄罗斯 ──
  { name: "莫斯科", country: "俄罗斯", lng: 37.6, lat: 55.8 },
  { name: "圣彼得堡", country: "俄罗斯", lng: 30.3, lat: 59.9 },
  { name: "海参崴", country: "俄罗斯", lng: 131.9, lat: 43.1 },

  // ── 美国 ──
  { name: "纽约", country: "美国", lng: -74.0, lat: 40.7 },
  { name: "洛杉矶", country: "美国", lng: -118.2, lat: 34.1 },
  { name: "旧金山", country: "美国", lng: -122.4, lat: 37.8 },
  { name: "拉斯维加斯", country: "美国", lng: -115.1, lat: 36.2 },
  { name: "华盛顿", country: "美国", lng: -77.0, lat: 38.9 },
  { name: "芝加哥", country: "美国", lng: -87.6, lat: 41.9 },
  { name: "西雅图", country: "美国", lng: -122.3, lat: 47.6 },
  { name: "波士顿", country: "美国", lng: -71.1, lat: 42.4 },
  { name: "迈阿密", country: "美国", lng: -80.2, lat: 25.8 },
  { name: "奥兰多", country: "美国", lng: -81.4, lat: 28.5 },
  { name: "夏威夷", country: "美国", lng: -155.5, lat: 19.9 },
  { name: "檀香山", country: "美国", lng: -157.9, lat: 21.3 },
  { name: "圣地亚哥", country: "美国", lng: -117.2, lat: 32.7 },

  // ── 加拿大 ──
  { name: "多伦多", country: "加拿大", lng: -79.4, lat: 43.7 },
  { name: "温哥华", country: "加拿大", lng: -123.1, lat: 49.3 },
  { name: "蒙特利尔", country: "加拿大", lng: -73.6, lat: 45.5 },
  { name: "渥太华", country: "加拿大", lng: -75.7, lat: 45.4 },
  { name: "班夫", country: "加拿大", lng: -115.6, lat: 51.2 },

  // ── 墨西哥 ──
  { name: "墨西哥城", country: "墨西哥", lng: -99.1, lat: 19.4 },
  { name: "坎昆", country: "墨西哥", lng: -86.9, lat: 21.2 },

  // ── 南美 ──
  { name: "圣保罗", country: "巴西", lng: -46.6, lat: -23.5 },
  { name: "里约热内卢", country: "巴西", lng: -43.2, lat: -22.9 },
  { name: "布宜诺斯艾利斯", country: "阿根廷", lng: -58.4, lat: -34.6 },
  { name: "利马", country: "秘鲁", lng: -77.0, lat: -12.0 },
  { name: "库斯科", country: "秘鲁", lng: -72.0, lat: -13.5 },
  { name: "马丘比丘", country: "秘鲁", lng: -72.5, lat: -13.2 },

  // ── 非洲 ──
  { name: "开罗", country: "埃及", lng: 31.2, lat: 30.0 },
  { name: "卢克索", country: "埃及", lng: 32.6, lat: 25.7 },
  { name: "马拉喀什", country: "摩洛哥", lng: -8.0, lat: 31.6 },
  { name: "卡萨布兰卡", country: "摩洛哥", lng: -7.6, lat: 33.6 },
  { name: "舍夫沙万", country: "摩洛哥", lng: -5.3, lat: 35.2 },
  { name: "开普敦", country: "南非", lng: 18.4, lat: -33.9 },
  { name: "约翰内斯堡", country: "南非", lng: 28.0, lat: -26.2 },
  { name: "内罗毕", country: "肯尼亚", lng: 36.8, lat: -1.3 },
  { name: "桑给巴尔", country: "坦桑尼亚", lng: 39.2, lat: -6.2 },
];

/** Build lookup: city name → WorldCity */
const worldCityMap = new Map<string, WorldCity>();
for (const c of WORLD_CITIES) {
  worldCityMap.set(c.name, c);
}

export function findWorldCity(name: string): WorldCity | undefined {
  return worldCityMap.get(name);
}

/** All country names for matching (sorted by length desc for greedy match) */
export const COUNTRY_NAMES = Object.keys(COUNTRIES).sort(
  (a, b) => b.length - a.length,
);

/** All world city names for matching (sorted by length desc for greedy match) */
export const WORLD_CITY_NAMES = WORLD_CITIES.map((c) => c.name).sort(
  (a, b) => b.length - a.length,
);
