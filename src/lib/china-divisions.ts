export interface CityCoord {
  name: string;
  province: string;
  lng: number;
  lat: number;
}

/** 34 provinces with center coordinates */
export const PROVINCES: Record<string, [number, number]> = {
  北京: [116.4, 39.9],
  天津: [117.2, 39.1],
  上海: [121.5, 31.2],
  重庆: [106.5, 29.5],
  河北: [114.5, 38.0],
  山西: [112.5, 37.9],
  辽宁: [123.4, 41.8],
  吉林: [125.3, 43.9],
  黑龙江: [126.6, 45.7],
  江苏: [118.8, 32.1],
  浙江: [120.2, 30.3],
  安徽: [117.3, 31.8],
  福建: [119.3, 26.1],
  江西: [115.9, 28.7],
  山东: [117.0, 36.7],
  河南: [113.7, 34.8],
  湖北: [114.3, 30.6],
  湖南: [112.9, 28.2],
  广东: [113.3, 23.1],
  海南: [110.3, 20.0],
  四川: [104.1, 30.6],
  贵州: [106.7, 26.6],
  云南: [102.7, 25.0],
  陕西: [108.9, 34.3],
  甘肃: [103.8, 36.1],
  青海: [101.8, 36.6],
  台湾: [121.5, 25.0],
  内蒙古: [111.7, 40.8],
  广西: [108.3, 22.8],
  西藏: [91.1, 29.6],
  宁夏: [106.3, 38.5],
  新疆: [87.6, 43.8],
  香港: [114.2, 22.3],
  澳门: [113.5, 22.2],
};

/** Major cities with coordinates */
export const CITIES: CityCoord[] = [
  // 直辖市
  { name: "北京", province: "北京", lng: 116.4, lat: 39.9 },
  { name: "天津", province: "天津", lng: 117.2, lat: 39.1 },
  { name: "上海", province: "上海", lng: 121.5, lat: 31.2 },
  { name: "重庆", province: "重庆", lng: 106.5, lat: 29.5 },
  // 省会 + 主要城市
  { name: "石家庄", province: "河北", lng: 114.5, lat: 38.0 },
  { name: "太原", province: "山西", lng: 112.5, lat: 37.9 },
  { name: "呼和浩特", province: "内蒙古", lng: 111.7, lat: 40.8 },
  { name: "沈阳", province: "辽宁", lng: 123.4, lat: 41.8 },
  { name: "大连", province: "辽宁", lng: 121.6, lat: 38.9 },
  { name: "长春", province: "吉林", lng: 125.3, lat: 43.9 },
  { name: "哈尔滨", province: "黑龙江", lng: 126.6, lat: 45.7 },
  { name: "南京", province: "江苏", lng: 118.8, lat: 32.1 },
  { name: "苏州", province: "江苏", lng: 120.6, lat: 31.3 },
  { name: "无锡", province: "江苏", lng: 120.3, lat: 31.6 },
  { name: "杭州", province: "浙江", lng: 120.2, lat: 30.3 },
  { name: "宁波", province: "浙江", lng: 121.5, lat: 29.9 },
  { name: "温州", province: "浙江", lng: 120.7, lat: 28.0 },
  { name: "合肥", province: "安徽", lng: 117.3, lat: 31.8 },
  { name: "福州", province: "福建", lng: 119.3, lat: 26.1 },
  { name: "厦门", province: "福建", lng: 118.1, lat: 24.5 },
  { name: "南昌", province: "江西", lng: 115.9, lat: 28.7 },
  { name: "景德镇", province: "江西", lng: 117.2, lat: 29.3 },
  { name: "济南", province: "山东", lng: 117.0, lat: 36.7 },
  { name: "青岛", province: "山东", lng: 120.4, lat: 36.1 },
  { name: "烟台", province: "山东", lng: 121.4, lat: 37.5 },
  { name: "郑州", province: "河南", lng: 113.7, lat: 34.8 },
  { name: "洛阳", province: "河南", lng: 112.4, lat: 34.6 },
  { name: "开封", province: "河南", lng: 114.3, lat: 34.8 },
  { name: "武汉", province: "湖北", lng: 114.3, lat: 30.6 },
  { name: "宜昌", province: "湖北", lng: 111.3, lat: 30.7 },
  { name: "长沙", province: "湖南", lng: 112.9, lat: 28.2 },
  { name: "张家界", province: "湖南", lng: 110.5, lat: 29.1 },
  { name: "广州", province: "广东", lng: 113.3, lat: 23.1 },
  { name: "深圳", province: "广东", lng: 114.1, lat: 22.5 },
  { name: "珠海", province: "广东", lng: 113.6, lat: 22.3 },
  { name: "佛山", province: "广东", lng: 113.1, lat: 23.0 },
  { name: "东莞", province: "广东", lng: 113.8, lat: 23.0 },
  { name: "南宁", province: "广西", lng: 108.3, lat: 22.8 },
  { name: "桂林", province: "广西", lng: 110.3, lat: 25.3 },
  { name: "海口", province: "海南", lng: 110.3, lat: 20.0 },
  { name: "三亚", province: "海南", lng: 109.5, lat: 18.3 },
  { name: "成都", province: "四川", lng: 104.1, lat: 30.6 },
  { name: "绵阳", province: "四川", lng: 104.7, lat: 31.5 },
  { name: "九寨沟", province: "四川", lng: 104.2, lat: 33.3 },
  { name: "贵阳", province: "贵州", lng: 106.7, lat: 26.6 },
  { name: "遵义", province: "贵州", lng: 106.9, lat: 27.7 },
  { name: "昆明", province: "云南", lng: 102.7, lat: 25.0 },
  { name: "大理", province: "云南", lng: 100.2, lat: 25.6 },
  { name: "丽江", province: "云南", lng: 100.2, lat: 26.9 },
  { name: "西双版纳", province: "云南", lng: 100.8, lat: 22.0 },
  { name: "香格里拉", province: "云南", lng: 99.7, lat: 27.8 },
  { name: "拉萨", province: "西藏", lng: 91.1, lat: 29.6 },
  { name: "林芝", province: "西藏", lng: 94.4, lat: 29.6 },
  { name: "西安", province: "陕西", lng: 108.9, lat: 34.3 },
  { name: "延安", province: "陕西", lng: 109.5, lat: 36.6 },
  { name: "兰州", province: "甘肃", lng: 103.8, lat: 36.1 },
  { name: "敦煌", province: "甘肃", lng: 94.7, lat: 40.1 },
  { name: "西宁", province: "青海", lng: 101.8, lat: 36.6 },
  { name: "银川", province: "宁夏", lng: 106.3, lat: 38.5 },
  { name: "乌鲁木齐", province: "新疆", lng: 87.6, lat: 43.8 },
  { name: "喀什", province: "新疆", lng: 75.9, lat: 39.5 },
  { name: "台北", province: "台湾", lng: 121.5, lat: 25.0 },
  { name: "香港", province: "香港", lng: 114.2, lat: 22.3 },
  { name: "澳门", province: "澳门", lng: 113.5, lat: 22.2 },
  // 旅游热门城市
  { name: "秦皇岛", province: "河北", lng: 119.6, lat: 39.9 },
  { name: "承德", province: "河北", lng: 117.9, lat: 40.9 },
  { name: "黄山", province: "安徽", lng: 118.3, lat: 29.7 },
  { name: "泉州", province: "福建", lng: 118.6, lat: 24.9 },
  { name: "威海", province: "山东", lng: 122.1, lat: 37.5 },
  { name: "洛阳", province: "河南", lng: 112.4, lat: 34.6 },
  { name: "恩施", province: "湖北", lng: 109.5, lat: 30.3 },
  { name: "凤凰", province: "湖南", lng: 109.6, lat: 27.9 },
  { name: "北海", province: "广西", lng: 109.1, lat: 21.5 },
  { name: "阳朔", province: "广西", lng: 110.5, lat: 24.8 },
  { name: "乐山", province: "四川", lng: 103.8, lat: 29.6 },
  { name: "稻城", province: "四川", lng: 100.3, lat: 29.0 },
  { name: "腾冲", province: "云南", lng: 98.5, lat: 25.0 },
  { name: "泸沽湖", province: "云南", lng: 100.8, lat: 27.7 },
];

/** Build lookup: city name → CityCoord */
const cityMap = new Map<string, CityCoord>();
for (const c of CITIES) {
  cityMap.set(c.name, c);
}

export function findCity(name: string): CityCoord | undefined {
  return cityMap.get(name);
}

/** All province names for regex matching */
export const PROVINCE_NAMES = Object.keys(PROVINCES);

/** All city names for regex matching (sorted by length desc for greedy match) */
export const CITY_NAMES = CITIES.map((c) => c.name).sort(
  (a, b) => b.length - a.length
);
