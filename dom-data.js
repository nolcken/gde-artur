/* «Наш дом» — каталог: комнаты, предметы, культуры, рыба, рецепты, задания */
(function(){
"use strict";
var C = ART.COLS;
var STONE = ["#C9B8A6", "#E8DCCF", "#9C8F86", "#F2C6D3"];
var GREENS = ["#3DBB66", "#2E8B57", "#7FD36B"];

/* ---------- комнаты ---------- */
var ROOMS = [
  { id:"living",     n:"Гостиная",       e:"🛋", w:8,  d:8,  type:"in",  floor:"oak",    wall:"cream" },
  { id:"garden",     n:"Сад",            e:"🌿", w:12, d:10, type:"out", floor:"grass",  outdoor:true, unlock:{ lvl:1, coins:0,    hearts:0,  quest:5 } },
  { id:"kitchen",    n:"Кухня",          e:"🍳", w:7,  d:6,  type:"in",  floor:"tiles",  wall:"mint",  unlock:{ lvl:2, coins:250,  hearts:2,  quest:10 } },
  { id:"balcony",    n:"Балкон",         e:"🌇", w:6,  d:3,  type:"out", floor:"deck",   wall:"blush", outdoor:true, wallSide:true, unlock:{ lvl:3, coins:400,  hearts:3,  quest:18 } },
  { id:"bedroom",    n:"Спальня",        e:"🛏", w:7,  d:7,  type:"in",  floor:"pink",   wall:"lilac", unlock:{ lvl:4, coins:700,  hearts:6,  quest:19 } },
  { id:"bathroom",   n:"Ванная",         e:"🛁", w:5,  d:5,  type:"in",  floor:"mint",   wall:"sky",   unlock:{ lvl:6, coins:1100, hearts:8,  quest:23 } },
  { id:"greenhouse", n:"Теплица",        e:"🪴", w:6,  d:6,  type:"out", floor:"stone",  outdoor:true, glass:true, unlock:{ lvl:8, coins:1800, hearts:12, quest:27 } },
  { id:"attic",      n:"Мишкин штаб",     e:"🧸", w:6,  d:6,  type:"in",  floor:"walnut", wall:"night", unlock:{ lvl:10, coins:3000, hearts:20, quest:30 } }
];
var ROOM = {}; ROOMS.forEach(function(r){ ROOM[r.id] = r; });
var WHERE = {
  in:   ["living", "kitchen", "bedroom", "bathroom", "attic"],
  out:  ["garden", "balcony", "greenhouse"],
  plot: ["garden", "greenhouse"]
};

/* ---------- предметы ----------
   k: floor | rug | wall · w×d — клетки · p — монеты · h — сердечки · c — уют · l — уровень дома · cols — цвета
   at — где можно ставить · fn — особое действие */
var ITEMS = [
  // гостиная
  { id:"sofa",          n:"Диван",                 cat:"seat",   k:"floor", w:2, d:1, p:140, c:8,  l:1, cols:C.soft,   at:"in" },
  { id:"armchair",      n:"Кресло",                cat:"seat",   k:"floor", w:1, d:1, p:80,  c:5,  l:1, cols:C.soft,   at:"in" },
  { id:"beanbag",       n:"Кресло-мешок",          cat:"seat",   k:"floor", w:1, d:1, p:50,  c:4,  l:1, cols:C.fabric, at:"in" },
  { id:"pouf",          n:"Пуф",                   cat:"seat",   k:"floor", w:1, d:1, p:35,  c:2,  l:1, cols:C.fabric, at:"in" },
  { id:"chair",         n:"Стул",                  cat:"seat",   k:"floor", w:1, d:1, p:35,  c:1,  l:1, cols:C.wood,   at:"in" },
  { id:"sofa_corner",   n:"Угловой диван",         cat:"seat",   k:"floor", w:3, d:2, p:420, c:18, l:5, cols:C.soft,   at:"in" },
  { id:"coffee_table",  n:"Журнальный столик",     cat:"table",  k:"floor", w:2, d:1, p:70,  c:3,  l:1, cols:C.wood,   at:"in" },
  { id:"side_table",    n:"Столик с цветами",      cat:"table",  k:"floor", w:1, d:1, p:40,  c:2,  l:1, cols:C.wood,   at:"in" },
  { id:"dining_table",  n:"Обеденный стол",        cat:"table",  k:"floor", w:2, d:1, p:150, c:4,  l:2, cols:C.wood,   at:"in" },
  { id:"desk",          n:"Стол с ноутбуком",      cat:"table",  k:"floor", w:2, d:1, p:220, c:6,  l:3, cols:C.wood,   at:"in" },
  { id:"floor_lamp",    n:"Торшер",                cat:"light",  k:"floor", w:1, d:1, p:60,  c:3,  l:1, cols:C.fabric, at:"in" },
  { id:"heart_lamp",    n:"Лампа-сердце",          cat:"light",  k:"floor", w:1, d:1, p:0, h:3, c:7, l:2, at:"in" },
  { id:"plant_small",   n:"Фикус",                 cat:"plant",  k:"floor", w:1, d:1, p:30,  c:2,  l:1, cols:C.pot,    at:"in" },
  { id:"plant_big",     n:"Монстера",              cat:"plant",  k:"floor", w:1, d:1, p:70,  c:4,  l:2, cols:C.pot,    at:"in" },
  { id:"cactus",        n:"Кактус",                cat:"plant",  k:"floor", w:1, d:1, p:20,  c:1,  l:1, cols:C.pot,    at:"in" },
  { id:"rug_round",     n:"Круглый ковёр",         cat:"decor",  k:"rug",   w:2, d:2, p:60,  c:3,  l:1, cols:C.fabric, at:"in" },
  { id:"rug_big",       n:"Большой ковёр",         cat:"decor",  k:"rug",   w:3, d:2, p:110, c:5,  l:3, cols:C.fabric, at:"in" },
  { id:"bookshelf",     n:"Книжный шкаф",          cat:"store",  k:"floor", w:1, d:1, p:120, c:5,  l:2, cols:C.wood,   at:"in" },
  { id:"tv_stand",      n:"Тумба с телевизором",   cat:"fun",    k:"floor", w:2, d:1, p:240, c:8,  l:3, cols:C.wood,   at:"in" },
  { id:"guitar",        n:"Гитара",                cat:"fun",    k:"floor", w:1, d:1, p:170, c:5,  l:3, cols:C.soft,   at:"in" },
  { id:"record_player", n:"Проигрыватель",         cat:"fun",    k:"floor", w:1, d:1, p:260, c:7,  l:5, cols:C.soft,   at:"in" },
  { id:"cat_bed",       n:"Лежанка с котиком",     cat:"decor",  k:"floor", w:1, d:1, p:180, c:9,  l:4, cols:C.fabric, at:"in" },
  { id:"teddy",         n:"Плюшевый мишка",        cat:"decor",  k:"floor", w:1, d:1, p:0, h:5, c:9, l:1, cols:["#C68A5A", "#F2EADF", "#FFB3CF"], at:"in" },
  { id:"duck",          n:"Резиновая уточка",      cat:"decor",  k:"floor", w:1, d:1, p:30,  c:3,  l:6, cols:["#FFD84D", "#FF6FA3", "#6EA8FF"], at:"in" },
  { id:"fireplace",     n:"Камин",                 cat:"fun",    k:"floor", w:2, d:1, p:520, c:16, l:6, cols:STONE,    at:"in" },
  { id:"aquarium",      n:"Аквариум",              cat:"fun",    k:"floor", w:2, d:1, p:400, c:12, l:5, cols:C.wood,   at:"in" },
  { id:"piano",         n:"Пианино",               cat:"fun",    k:"floor", w:2, d:1, p:650, c:15, l:7, cols:["#231a2e", "#F4F1EC", "#8A5A3B"], at:"in" },
  { id:"tent",          n:"Вигвам с гирляндой",    cat:"decor",  k:"floor", w:2, d:2, p:340, c:13, l:6, cols:C.soft,   at:"in" },
  { id:"xmas_tree",     n:"Ёлка",                  cat:"decor",  k:"floor", w:1, d:1, p:480, c:14, l:8, at:"in" },
  // кухня
  { id:"counter",       n:"Кухонная тумба",        cat:"kitchen", k:"floor", w:1, d:1, p:60,  c:1, l:1, cols:C.appl, at:["kitchen"] },
  { id:"stove",         n:"Плита",                 cat:"kitchen", k:"floor", w:1, d:1, p:150, c:3, l:1, cols:C.appl, at:["kitchen"], fn:"stove" },
  { id:"sink",          n:"Мойка",                 cat:"kitchen", k:"floor", w:1, d:1, p:100, c:2, l:1, cols:C.appl, at:["kitchen"] },
  { id:"fridge",        n:"Холодильник",           cat:"kitchen", k:"floor", w:1, d:1, p:230, c:3, l:2, cols:C.appl, at:["kitchen"], fn:"fridge" },
  { id:"coffee_machine",n:"Кофемашина",            cat:"kitchen", k:"floor", w:1, d:1, p:190, c:5, l:3, cols:C.soft, at:["kitchen"] },
  { id:"bar_stool",     n:"Барный стул",           cat:"kitchen", k:"floor", w:1, d:1, p:45,  c:1, l:2, cols:C.soft, at:["kitchen"] },
  { id:"island",        n:"Кухонный остров",       cat:"kitchen", k:"floor", w:2, d:1, p:320, c:7, l:4, cols:C.appl, at:["kitchen"] },
  // спальня
  { id:"bed",           n:"Двуспальная кровать",   cat:"bed",    k:"floor", w:2, d:2, p:420, c:14, l:4, cols:C.fabric, at:["bedroom"] },
  { id:"bed_canopy",    n:"Кровать с балдахином",  cat:"bed",    k:"floor", w:2, d:2, p:950, h:10, c:28, l:9, cols:C.fabric, at:["bedroom"] },
  { id:"nightstand",    n:"Тумбочка с лампой",     cat:"bed",    k:"floor", w:1, d:1, p:80,  c:3,  l:4, cols:C.wood,   at:["bedroom"] },
  { id:"dresser",       n:"Комод",                 cat:"bed",    k:"floor", w:1, d:1, p:140, c:4,  l:4, cols:C.wood,   at:["bedroom", "living"] },
  { id:"wardrobe",      n:"Шкаф",                  cat:"bed",    k:"floor", w:2, d:1, p:280, c:6,  l:4, cols:C.soft,   at:["bedroom"] },
  { id:"vanity",        n:"Туалетный столик",      cat:"bed",    k:"floor", w:1, d:1, p:230, c:7,  l:5, cols:C.fabric, at:["bedroom"] },
  // ванная
  { id:"bathtub",       n:"Ванна",                 cat:"bath",   k:"floor", w:2, d:1, p:380, c:9, l:6, cols:["#FBF7F2", "#FFB3CF", "#A9CBFF"], at:["bathroom"] },
  { id:"shower",        n:"Душевая",               cat:"bath",   k:"floor", w:1, d:1, p:320, c:6, l:6, at:["bathroom"] },
  { id:"toilet",        n:"Туалет",                cat:"bath",   k:"floor", w:1, d:1, p:130, c:2, l:6, at:["bathroom"] },
  { id:"bath_sink",     n:"Раковина",              cat:"bath",   k:"floor", w:1, d:1, p:120, c:2, l:6, cols:C.appl, at:["bathroom"] },
  { id:"washer",        n:"Стиральная машина",     cat:"bath",   k:"floor", w:1, d:1, p:270, c:4, l:6, cols:C.appl, at:["bathroom"] },
  // мишкин штаб
  { id:"roach_table",   n:"Стол переговоров",      cat:"roach",  k:"floor", w:2, d:1, p:450, c:11, l:10, cols:C.wood, at:["attic"] },
  { id:"roach_bunk",    n:"Кроватки для мишек",    cat:"roach",  k:"floor", w:1, d:1, p:320, c:9,  l:10, cols:C.wood, at:["attic"] },
  { id:"plan_board",    n:"План «Операция Саша»",  cat:"roach",  k:"floor", w:1, d:1, p:280, c:9,  l:10, at:["attic"] },
  { id:"roach_throne",  n:"Трон Главного мишки",cat:"roach",  k:"floor", w:1, d:1, p:0, h:15, c:18, l:10, cols:["#C0392B", "#9B7BFF"], at:["attic"] },
  // на стену
  { id:"window",        n:"Окно",                  cat:"wall", k:"wall", w:1, d:1, p:120, c:3,  l:1, cols:C.fabric, at:"in" },
  { id:"window_big",    n:"Большое окно",          cat:"wall", k:"wall", w:2, d:1, p:230, c:6,  l:3, cols:C.fabric, at:"in" },
  { id:"calendar",      n:"Наш календарь",         cat:"wall", k:"wall", w:1, d:1, p:0,   c:3,  l:1, cols:C.soft, at:"in", max:1 },
  { id:"clock",         n:"Часы",                  cat:"wall", k:"wall", w:1, d:1, p:75,  c:2,  l:1, cols:C.soft, at:"in" },
  { id:"picture_heart", n:"Картина «Сердце»",      cat:"wall", k:"wall", w:1, d:1, p:55,  c:2,  l:1, cols:C.soft, at:"in" },
  { id:"shelf",         n:"Полка с книгами",       cat:"wall", k:"wall", w:1, d:1, p:55,  c:2,  l:1, cols:C.wood, at:"in" },
  { id:"picture_land",  n:"Картина «Горы»",        cat:"wall", k:"wall", w:2, d:1, p:95,  c:3,  l:2, cols:["#9B7BFF", "#6EA8FF", "#3FC7B4"], at:"in" },
  { id:"garland",       n:"Гирлянда",              cat:"wall", k:"wall", w:2, d:1, p:85,  c:4,  l:2, at:"in" },
  { id:"mirror",        n:"Зеркало",               cat:"wall", k:"wall", w:1, d:1, p:95,  c:2,  l:2, cols:["#E7CFA9", "#FFC23D", "#FF6FA3"], at:"in" },
  { id:"photo_wall",    n:"Фотостена",             cat:"wall", k:"wall", w:2, d:1, p:0, h:4, c:9, l:2, at:"in" },
  { id:"tv_wall",       n:"Телевизор на стену",    cat:"wall", k:"wall", w:2, d:1, p:320, c:6,  l:4, at:"in" },
  { id:"neon",          n:"Неон «Кто где?»",       cat:"wall", k:"wall", w:2, d:1, p:0, h:6, c:12, l:5, cols:["#FF6FA3", "#6EE7FF", "#FFD84D"], at:"in" },
  { id:"spice_rack",    n:"Полка со специями",     cat:"wall", k:"wall", w:1, d:1, p:50,  c:1,  l:1, cols:C.wood, at:["kitchen"] },
  { id:"towel",         n:"Полотенце",             cat:"wall", k:"wall", w:1, d:1, p:30,  c:1,  l:6, cols:C.fabric, at:["bathroom"] },
  // сад
  { id:"garden_bed",    n:"Грядка",                cat:"farm",  k:"floor", w:1, d:1, p:25,  c:1,  l:1, at:"plot", fn:"plot", max:30 },
  { id:"tree_apple",    n:"Яблоня",                cat:"farm",  k:"floor", w:1, d:1, p:260, c:8,  l:3, at:["garden"], fn:"tree", fruit:"apple", draw:"tree" },
  { id:"tree_cherry",   n:"Вишня",                 cat:"farm",  k:"floor", w:1, d:1, p:320, c:9,  l:5, at:["garden"], fn:"tree", fruit:"cherry", draw:"tree" },
  { id:"tree_lemon",    n:"Лимонное дерево",       cat:"farm",  k:"floor", w:1, d:1, p:420, c:10, l:8, at:["greenhouse"], fn:"tree", fruit:"lemon", draw:"tree" },
  { id:"pond",          n:"Пруд",                  cat:"farm",  k:"floor", w:3, d:2, p:320, c:10, l:3, at:["garden"], fn:"pond", max:1 },
  { id:"well",          n:"Колодец",               cat:"farm",  k:"floor", w:1, d:1, p:220, c:6,  l:4, cols:C.soft, at:["garden"], fn:"well", max:1 },
  { id:"mailbox",       n:"Почтовый ящик",         cat:"farm",  k:"floor", w:1, d:1, p:60,  c:2,  l:2, cols:C.soft, at:["garden"], fn:"mail", max:1 },
  { id:"path",          n:"Дорожка",               cat:"yard",  k:"rug",   w:1, d:1, p:8,   c:0,  l:1, cols:["#C9C3D3", "#E7CFA9", "#FFB3CF"], at:"out" },
  { id:"fence",         n:"Забор",                 cat:"yard",  k:"floor", w:1, d:1, p:15,  c:1,  l:1, cols:C.wood, at:"out" },
  { id:"bush",          n:"Куст",                  cat:"yard",  k:"floor", w:1, d:1, p:30,  c:1,  l:1, cols:GREENS, at:"out" },
  { id:"flower_bed",    n:"Клумба",                cat:"yard",  k:"floor", w:1, d:1, p:45,  c:3,  l:1, cols:C.flower, at:"out" },
  { id:"roses",         n:"Розовый куст",          cat:"yard",  k:"floor", w:1, d:1, p:70,  c:4,  l:2, cols:["#FF4F8B", "#FFFFFF", "#FFD84D", "#C9142F"], at:"out" },
  { id:"pine",          n:"Ёлочка",                cat:"yard",  k:"floor", w:1, d:1, p:120, c:4,  l:2, at:["garden"] },
  { id:"bench",         n:"Скамейка",              cat:"yard",  k:"floor", w:2, d:1, p:120, c:4,  l:2, cols:C.wood, at:"out" },
  { id:"lantern",       n:"Фонарь",                cat:"yard",  k:"floor", w:1, d:1, p:90,  c:3,  l:2, at:"out" },
  { id:"birdhouse",     n:"Скворечник",            cat:"yard",  k:"floor", w:1, d:1, p:70,  c:3,  l:3, cols:C.soft, at:["garden"] },
  { id:"scarecrow",     n:"Пугало-мишка",        cat:"yard",  k:"floor", w:1, d:1, p:90,  c:4,  l:3, cols:C.fabric, at:["garden"] },
  { id:"bbq",           n:"Гриль",                 cat:"yard",  k:"floor", w:1, d:1, p:240, c:5,  l:4, cols:["#2b2838", "#C0392B", "#5B5670"], at:"out" },
  { id:"swing",         n:"Качели",                cat:"yard",  k:"floor", w:2, d:1, p:380, c:12, l:5, cols:C.soft, at:["garden"] },
  { id:"hammock",       n:"Гамак",                 cat:"yard",  k:"floor", w:2, d:1, p:300, c:10, l:6, cols:C.fabric, at:["garden", "balcony"] },
  { id:"gazebo",        n:"Беседка",               cat:"yard",  k:"floor", w:3, d:3, p:980, c:24, l:9, cols:C.soft, at:["garden"] },
  // балкон и общее
  { id:"plant_out",     n:"Кадка с цветами",       cat:"yard",  k:"floor", w:1, d:1, p:40,  c:2,  l:1, cols:C.pot, at:"out", draw:"plant_small" },
  { id:"chair_out",     n:"Садовое кресло",        cat:"yard",  k:"floor", w:1, d:1, p:70,  c:3,  l:2, cols:C.soft, at:"out", draw:"armchair" }
];
var ITEM = {}; ITEMS.forEach(function(i){ ITEM[i.id] = i; });
var CATS = [
  { id:"seat", n:"Диваны и кресла" }, { id:"table", n:"Столы" }, { id:"light", n:"Свет" }, { id:"plant", n:"Растения" }, { id:"decor", n:"Декор" },
  { id:"store", n:"Хранение" }, { id:"fun", n:"Досуг" }, { id:"wall", n:"На стену" }, { id:"kitchen", n:"Кухня" }, { id:"bed", n:"Спальня" },
  { id:"bath", n:"Ванная" }, { id:"roach", n:"Мишкин штаб" }, { id:"farm", n:"Хозяйство" }, { id:"yard", n:"Двор" }
];

/* ---------- культуры (часы — время роста при поливе) ---------- */
var CROPS = [
  { id:"radish",     n:"Редиска",   e:"🌱", seed:10, hrs:1,   sell:22,  l:1 },
  { id:"lettuce",    n:"Салат",     e:"🥬", seed:14, hrs:1.5, sell:30,  l:1 },
  { id:"carrot",     n:"Морковь",   e:"🥕", seed:18, hrs:2,   sell:38,  l:1 },
  { id:"potato",     n:"Картофель", e:"🥔", seed:22, hrs:3,   sell:50,  l:2 },
  { id:"cucumber",   n:"Огурец",    e:"🥒", seed:28, hrs:4,   sell:62,  l:2 },
  { id:"tomato",     n:"Помидор",   e:"🍅", seed:32, hrs:5,   sell:74,  l:3 },
  { id:"strawberry", n:"Клубника",  e:"🍓", seed:42, hrs:6,   sell:96,  l:3 },
  { id:"pepper",     n:"Перец",     e:"🫑", seed:38, hrs:6,   sell:88,  l:4 },
  { id:"corn",       n:"Кукуруза",  e:"🌽", seed:48, hrs:8,   sell:115, l:4 },
  { id:"sunflower",  n:"Подсолнух", e:"🌻", seed:36, hrs:8,   sell:92,  l:5 },
  { id:"lavender",   n:"Лаванда",   e:"💜", seed:55, hrs:10,  sell:140, l:5 },
  { id:"pumpkin",    n:"Тыква",     e:"🎃", seed:70, hrs:12,  sell:190, l:6 },
  { id:"watermelon", n:"Арбуз",     e:"🍉", seed:90, hrs:16,  sell:260, l:8, only:"greenhouse" }
];
var CROP = {}; CROPS.forEach(function(c){ CROP[c.id] = c; });
var FRUITS = {
  apple:  { n:"Яблоко", e:"🍎", sell:25, hrs:18, color:"#FF4F4F", yield:3 },
  cherry: { n:"Вишня",  e:"🍒", sell:30, hrs:20, color:"#B3123A", yield:4 },
  lemon:  { n:"Лимон",  e:"🍋", sell:40, hrs:24, color:"#FFE04D", yield:3 }
};

/* ---------- рыба (w — шанс, z — ширина зоны в игре) ---------- */
var FISH = [
  { id:"boot",     n:"Старый ботинок",      e:"🥾", w:10, sell:2,   l:1, z:40, junk:true },
  { id:"crucian",  n:"Карась",              e:"🐟", w:30, sell:18,  l:1, z:34 },
  { id:"roachfish",n:"Плотва",              e:"🐟", w:26, sell:20,  l:1, z:32 },
  { id:"perch",    n:"Окунь",               e:"🐠", w:22, sell:26,  l:1, z:28 },
  { id:"ruffe",    n:"Ёрш",                 e:"🐡", w:16, sell:24,  l:1, z:28 },
  { id:"bream",    n:"Лещ",                 e:"🐟", w:14, sell:34,  l:2, z:24 },
  { id:"crayfish", n:"Рак",                 e:"🦞", w:9,  sell:40,  l:2, z:22, notfish:true },
  { id:"carp",     n:"Карп",                e:"🐟", w:10, sell:48,  l:3, z:20 },
  { id:"pike",     n:"Щука",                e:"🐊", w:8,  sell:62,  l:3, z:17 },
  { id:"trout",    n:"Форель",              e:"🐟", w:7,  sell:70,  l:4, z:16 },
  { id:"catfish",  n:"Сом",                 e:"🐋", w:4,  sell:110, l:5, z:13 },
  { id:"eel",      n:"Угорь",               e:"🐍", w:3,  sell:130, l:6, z:11 },
  { id:"goldfish", n:"Золотая рыбка",       e:"✨", w:1,  sell:400, l:4, z:9 },
  { id:"bottle",   n:"Бутылка с запиской",  e:"🍾", w:2,  sell:0,   l:2, z:26, junk:true, note:true }
];
var FISHI = {}; FISH.forEach(function(f){ FISHI[f.id] = f; });
var NOTES = [
  "«Если ты это читаешь — значит, мишки опять что-то задумали. Обними того, кто рядом» — записка без подписи",
  "«Самый вкусный ужин — тот, что готовили вдвоём» — Мишкин кулинарный совет",
  "«План на выходные: проснуться, улыбнуться, найти друг друга» — Главный мишка",
  "«Чем больше общих окон в календаре, тем теплее в доме» — древняя медвежья мудрость",
  "«Секретный рецепт: сыр, мука и мёд. Мишки одобряют» — неизвестный повар"
];

/* ---------- лавка ---------- */
var GOODS = [
  { id:"flour",  n:"Мука",   e:"🌾", p:12 }, { id:"egg",    n:"Яйцо",   e:"🥚", p:8 },  { id:"milk",   n:"Молоко", e:"🥛", p:10 },
  { id:"sugar",  n:"Сахар",  e:"🧂", p:8 },  { id:"butter", n:"Масло",  e:"🧈", p:14 }, { id:"cheese", n:"Сыр",    e:"🧀", p:22 },
  { id:"honey",  n:"Мёд",    e:"🍯", p:26 }, { id:"rice",   n:"Рис",    e:"🍚", p:10 }, { id:"tea",    n:"Чай",    e:"🫖", p:12 }
];
var GOOD = {}; GOODS.forEach(function(g){ GOOD[g.id] = g; });

/* ---------- рецепты (fish — любая рыба) ---------- */
var RECIPES = [
  { id:"pancakes",      n:"Блинчики",              e:"🥞", need:{ flour:1, milk:1, egg:1 },                  sell:80,  l:1 },
  { id:"radish_salad",  n:"Салат с редиской",      e:"🥗", need:{ radish:2, lettuce:1 },                     sell:110, l:1 },
  { id:"fries",         n:"Картошка фри",          e:"🍟", need:{ potato:2, butter:1 },                      sell:150, l:2 },
  { id:"carrot_cake",   n:"Морковный торт",        e:"🍰", need:{ carrot:2, flour:1, egg:1, sugar:1 },       sell:210, l:2 },
  { id:"omelet",        n:"Омлет с помидорами",    e:"🍳", need:{ egg:2, milk:1, tomato:1 },                 sell:170, l:3 },
  { id:"salad",         n:"Овощной салат",         e:"🥗", need:{ lettuce:1, tomato:1, cucumber:1 },         sell:220, l:3 },
  { id:"fish_soup",     n:"Уха",                   e:"🍲", need:{ fish:2, carrot:1, potato:1 },              sell:230, l:3 },
  { id:"fish_mash",     n:"Рыба с пюре",           e:"🐟", need:{ fish:1, potato:2, butter:1 },              sell:210, l:3 },
  { id:"charlotte",     n:"Шарлотка",              e:"🍏", need:{ apple:3, flour:1, egg:1, sugar:1 },        sell:240, l:3 },
  { id:"strawberry_pie",n:"Клубничный пирог",      e:"🥧", need:{ strawberry:2, flour:1, egg:1, sugar:1 },   sell:330, l:4 },
  { id:"stuffed_pepper",n:"Фаршированный перец",   e:"🫑", need:{ pepper:2, rice:1, cheese:1 },              sell:300, l:4 },
  { id:"popcorn",       n:"Попкорн к кино",        e:"🍿", need:{ corn:2, butter:1 },                        sell:260, l:4 },
  { id:"crayfish_boil", n:"Раки с укропом",        e:"🦞", need:{ crayfish:3, butter:1 },                    sell:200, l:4 },
  { id:"cookies",       n:"Печенье с семечками",   e:"🍪", need:{ sunflower:1, flour:1, sugar:1, butter:1 }, sell:230, l:5 },
  { id:"lavender_tea",  n:"Лавандовый чай",        e:"🍵", need:{ lavender:1, tea:1, honey:1 },              sell:260, l:5 },
  { id:"cherry_compote",n:"Вишнёвый компот",       e:"🍒", need:{ cherry:3, sugar:1 },                       sell:220, l:5 },
  { id:"pumpkin_soup",  n:"Тыквенный суп",         e:"🎃", need:{ pumpkin:1, carrot:1, milk:1 },             sell:360, l:6 },
  { id:"lemonade",      n:"Домашний лимонад",      e:"🍋", need:{ lemon:2, sugar:1, honey:1 },               sell:300, l:8 },
  { id:"trout_lemon",   n:"Форель с лимоном",      e:"🍽", need:{ trout:1, lemon:1, butter:1 },              sell:380, l:8 },
  { id:"melon_smoothie",n:"Арбузный смузи",        e:"🍉", need:{ watermelon:1, milk:1, honey:1 },           sell:420, l:8 },
  { id:"roach_pie",     n:"Медовый пирог для мишек", e:"🍯", need:{ cheese:1, flour:1, honey:1 },              sell:500, l:2, secret:true }
];
var RECIPE = {}; RECIPES.forEach(function(r){ RECIPE[r.id] = r; });

/* ---------- улучшения ---------- */
var UPGRADES = [
  { id:"rod", n:"Удочка",   e:"🎣", lv:[{ p:0 }, { p:300, l:3 }, { p:900, l:6 }], d:["10 забросов в день", "13 забросов, чаще редкая рыба", "16 забросов, ещё чаще редкая рыба"] },
  { id:"can", n:"Лейка",    e:"🚿", lv:[{ p:0 }, { p:220, l:2 }, { p:700, l:5 }], d:["полив держится 4 ч", "полив держится 6 ч", "полив держится 8 ч"] },
  { id:"pan", n:"Сковорода", e:"🍳", lv:[{ p:0 }, { p:260, l:3 }, { p:800, l:6 }], d:["обычная зона в готовке", "зона шире на 25%", "зона шире на 50%"] }
];

/* ---------- уровни дома (по уюту) ---------- */
var LEVELS = [0, 25, 60, 110, 180, 270, 380, 520, 690, 900, 1150, 1450, 1800, 2200, 2700];
function levelOf(c){ var l = 1; for (var i = 1; i < LEVELS.length; i++) if (c >= LEVELS[i]) l = i + 1; if (c >= LEVELS[LEVELS.length - 1]) l += Math.floor((c - LEVELS[LEVELS.length - 1]) / 600); return l; }
function levelNeed(l){ return l - 1 < LEVELS.length ? LEVELS[l - 1] : LEVELS[LEVELS.length - 1] + (l - LEVELS.length) * 600; }

/* ---------- сюжет ---------- */
var Q = [
  { id:1,  t:"Новоселье",          g:"Купи и поставь диван",                 r:{ coins:60 },              s:"Привет! Я — Главный мишка. Мы с ребятами, плюшевыми мишками, наконец переезжаем в настоящий дом Артура и Саши. Только тут пусто, как в холодильнике студента. Начнём с дивана: мишкам нужно где-то обниматься." },
  { id:2,  t:"Да будет свет",      g:"Поставь лампу",                        r:{ coins:40 },              s:"Мы, плюшевые, темноты немножко боимся, да и вам нужен уют. Лампа — и сразу теплее." },
  { id:3,  t:"Окно в мир",         g:"Повесь на стены 2 предмета",           r:{ coins:50, hearts:1 },    s:"Голые стены грустят. Окно, картина, часы — что угодно, лишь бы с любовью." },
  { id:4,  t:"Уютно!",             g:"Дом 2-го уровня",                      r:{ coins:80 },              s:"Каждая вещь добавляет уюта. Наберите 25 уюта — и дом подрастёт." },
  { id:5,  t:"Свой огород",        g:"Открой сад и поставь 2 грядки",        r:{ coins:60, items:{ "s:radish":3 } }, s:"Мишки — за здоровое питание (и за мёд). Во дворе полно земли: откройте сад и сделайте грядки." },
  { id:6,  t:"Первое семечко",     g:"Посади что-нибудь",                    r:{ coins:30 },              s:"Нажми на грядку и посади семечко. Я дал вам три редиски — хватит на старт." },
  { id:7,  t:"Вода — жизнь",       g:"Полей грядку",                         r:{ coins:30 },              s:"Растения растут, только пока политы. Поливайте по очереди — так честно." },
  { id:8,  t:"Урожай!",            g:"Собери 5 урожая",                      r:{ coins:100, hearts:1 },   s:"Когда над грядкой блестит звёздочка — пора собирать." },
  { id:9,  t:"Календарь — наше всё",g:"Заполни 10 слотов расписания",        r:{ coins:120, hearts:2 },   s:"Чтобы видеться чаще, надо знать, когда вы свободны. Заполните расписание на сайте — дом это чувствует." },
  { id:10, t:"Кухня",              g:"Открой кухню",                         r:{ coins:50 },              s:"Где дом, там и ужин. Пора открыть кухню." },
  { id:11, t:"Плита",              g:"Поставь плиту на кухне",               r:{ coins:40 },              s:"Без плиты ни блинчиков, ни ухи. Ставьте!" },
  { id:12, t:"Шеф-повар",          g:"Приготовь блюдо",                      r:{ coins:120, hearts:1 },   s:"Нажмите на плиту. Блинчики можно сделать из продуктов из лавки." },
  { id:13, t:"Свидание",           g:"Подтвердите встречу в календаре",      r:{ coins:150, hearts:3 },   s:"Самое ценное в доме — время вдвоём. Забронируйте встречу на сайте, и пусть вторая половинка её примет." },
  { id:14, t:"Пруд",               g:"Построй пруд в саду",                  r:{ coins:80 },              s:"Ребята мечтают о рыбалке. Пруд в саду — и можно закидывать удочку." },
  { id:15, t:"Рыбак",              g:"Поймай 5 рыб",                         r:{ coins:150 },             s:"Нажмите на пруд. Ловите момент, когда поплавок нырнёт!" },
  { id:16, t:"Добрые соседи",      g:"Выполни 3 заказа",                     r:{ coins:200, hearts:2 },   s:"Соседи-мишки просят продукты. Доска заказов — во вкладке «Задания»." },
  { id:17, t:"Мишкины прятки",     g:"Найди всех мишек в прятках",       r:{ coins:120, hearts:2 },   s:"Мы любим прятаться. Найдёте всех пятерых — получите награду." },
  { id:18, t:"Балкон",             g:"Открой балкон и поставь там 3 вещи",   r:{ coins:150 },             s:"Вечером на балконе особенно хорошо. Кресло, цветы, гирлянда..." },
  { id:19, t:"Спальня",            g:"Открой спальню и поставь кровать",     r:{ coins:250, hearts:3 },   s:"Даже плюшевым мишкам нужен отдых. А уж вам — тем более." },
  { id:20, t:"Уровень 5",          g:"Дом 5-го уровня",                      r:{ coins:300, hearts:3 },   s:"Дом растёт вместе с вами. Ещё немного уюта!" },
  { id:21, t:"Коллекционер",       g:"Поймай 8 разных видов",                r:{ coins:300, hearts:3 },   s:"В пруду водится много кто. Даже ботинок считается." },
  { id:22, t:"Гурман",             g:"Приготовь 6 разных блюд",              r:{ coins:350, hearts:3 },   s:"Пробуйте новые рецепты. Мишки оценят." },
  { id:23, t:"Ванная",             g:"Открой ванную",                        r:{ coins:200 },             s:"Пена, уточки и тишина. Нужна ванная!" },
  { id:24, t:"Три звезды",         g:"Приготовь блюдо на ★★★",               r:{ coins:200, hearts:2 },   s:"Идеальное блюдо — это точность. Ловите зелёную зону." },
  { id:25, t:"Фруктовый сад",      g:"Собери плоды с дерева",                r:{ coins:250 },             s:"Посадите яблоню. Плоды созревают сами — просто заглядывайте." },
  { id:26, t:"Уровень 8",          g:"Дом 8-го уровня",                      r:{ coins:500, hearts:5 },   s:"Это уже не квартира, а настоящее гнёздышко." },
  { id:27, t:"Теплица",            g:"Открой теплицу",                       r:{ coins:300 },             s:"В теплице всё растёт в полтора раза быстрее. И там можно вырастить арбуз!" },
  { id:28, t:"Арбуз",              g:"Вырасти арбуз",                        r:{ coins:400, hearts:4 },   s:"Большой, полосатый, сладкий. Как ваше лето." },
  { id:29, t:"Золотая рыбка",      g:"Поймай золотую рыбку",                 r:{ coins:500, hearts:5 },   s:"Говорят, в пруду живёт золотая рыбка. Она исполняет одно желание — то, которое вы загадаете вдвоём." },
  { id:30, t:"Мишкин штаб",     g:"Открой штаб и поставь трон",           r:{ coins:800, hearts:10 },  s:"Последняя просьба. У нас должен быть штаб — там мы планируем самые важные операции. Например, «Навсегда вместе»." }
];
var DAILY = [
  { id:"both",    t:"Загляните домой оба",        r:{ coins:30, hearts:2 } },
  { id:"water",   t:"Полейте 3 грядки",           r:{ coins:40 }, need:3 },
  { id:"harvest", t:"Соберите 5 урожая",          r:{ coins:50 }, need:5 },
  { id:"fish",    t:"Поймайте 3 рыбы",            r:{ coins:50 }, need:3, req:"pond" },
  { id:"cook",    t:"Приготовьте блюдо",          r:{ coins:60 }, need:1, req:"stove" },
  { id:"order",   t:"Выполните заказ",            r:{ coins:50, hearts:1 }, need:1 },
  { id:"hunt",    t:"Сыграйте в прятки с мишками",r:{ coins:40 }, need:1 },
  { id:"decor",   t:"Купите или переставьте вещь",r:{ coins:30 }, need:1 },
  { id:"sell",    t:"Продайте что-нибудь",        r:{ coins:30 }, need:1 },
  { id:"cal",     t:"Заполните сегодня в календаре", r:{ coins:40, hearts:1 }, need:1 }
];

window.DOM_DATA = {
  ROOMS:ROOMS, ROOM:ROOM, WHERE:WHERE, ITEMS:ITEMS, ITEM:ITEM, CATS:CATS, CROPS:CROPS, CROP:CROP, FRUITS:FRUITS,
  FISH:FISH, FISHI:FISHI, NOTES:NOTES, GOODS:GOODS, GOOD:GOOD, RECIPES:RECIPES, RECIPE:RECIPE, UPGRADES:UPGRADES,
  LEVELS:LEVELS, levelOf:levelOf, levelNeed:levelNeed, Q:Q, DAILY:DAILY
};
})();
