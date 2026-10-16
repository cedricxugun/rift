// Active ability copy. Applied last so earlier dash descriptions cannot leak into V6.5.
const rows = [
  ['Bullet time', '子弹时间', 'Ralenti', 'バレットタイム', 'Замедление', 'Chậm thời gian'],
  ['Bullet time ready', '子弹时间就绪', 'Ralenti prêt', 'バレットタイム使用可能', 'Замедление готово', 'Chậm thời gian sẵn sàng'],
  ['Bullet time active: {{seconds}}s', '子弹时间剩余 {{seconds}} 秒', 'Ralenti : {{seconds}} s', '残り{{seconds}}秒', 'Замедление: {{seconds}} с', 'Còn {{seconds}} giây'],
  ['Drag to move. Tap for bullet time.', '拖动移动，点击时钟开启子弹时间。', 'Glissez pour bouger. Touchez pour ralentir le temps.', 'ドラッグで移動。タップでバレットタイム。', 'Тяните для движения. Нажмите для замедления времени.', 'Kéo để di chuyển. Chạm để làm chậm thời gian.'],
  ['Press Space or right click for bullet time. On touch, tap the clock button.', '空格或右键开启子弹时间；触屏点击时钟按钮。', 'Espace ou clic droit : ralenti. Sur écran tactile, touchez l’horloge.', 'スペースか右クリックで発動。タッチ操作では時計ボタンを押そう。', 'Пробел или правая кнопка мыши включают замедление. На сенсорном экране нажмите часы.', 'Nhấn Space hoặc chuột phải để làm chậm thời gian. Trên màn hình cảm ứng, chạm nút đồng hồ.'],
  ['Slow the world for 4 seconds. You move and attack normally, but can still take damage. Cooldown: 24 seconds.', '让世界以 20% 速度运行 4 秒，自身移动与攻击正常，仍会受伤。从开启时计算冷却 24 秒。', 'Le monde passe à 20 % pendant 4 s. Vous bougez et attaquez normalement, mais restez vulnérable. Recharge : 24 s dès l’activation.', '世界が4秒間、20%の速度になる。自分の移動と攻撃は通常通り。被弾には注意。発動から24秒で再使用可能。', 'Мир замедляется до 20% на 4 с. Вы двигаетесь и атакуете как обычно, но всё ещё получаете урон. Перезарядка: 24 с с момента активации.', 'Thế giới chạy ở tốc độ 20% trong 4 giây. Bạn di chuyển và tấn công bình thường nhưng vẫn chịu sát thương. Hồi chiêu 24 giây tính từ lúc kích hoạt.'],
  ['The world slows. Keep moving and attacking; avoid touching enemy fire.', '世界变慢了。趁机走位、集火，仍要避开敌弹。', 'Le monde ralentit. Bougez et attaquez, mais évitez toujours les projectiles ennemis.', '世界が遅くなる。移動と攻撃を続け、敵弾は避けよう。', 'Мир замедлен. Двигайтесь и атакуйте, но не касайтесь вражеских пуль.', 'Thế giới chậm lại. Tiếp tục di chuyển và tấn công, vẫn phải tránh đạn địch.'],
  ['Activate bullet time near enemies to discharge lightning and erase up to six nearby shots.', '靠近敌人开启子弹时间，释放连锁闪电并清除附近最多 6 发敌弹。', 'Activez le ralenti près des ennemis pour libérer des éclairs et effacer jusqu’à six tirs proches.', '敵の近くでバレットタイムを使うと連鎖雷撃を放ち、周囲の敵弾を最大6発消す。', 'Включите замедление рядом с врагами: разрядите молнии и уничтожьте до шести ближайших пуль.', 'Kích hoạt chậm thời gian gần địch để phóng sét và xóa tối đa sáu viên đạn gần đó.'],
  ['Time counter', '时间反击', 'Riposte temporelle', '時間カウンター', 'Ответ временем', 'Phản công thời gian'],
  ['Temporal discharge', '时域放电', 'Décharge temporelle', '時間放電', 'Временной разряд', 'Phóng điện thời gian'],
  ['Activate bullet time to release', '开启子弹时间释放冰片', 'Activez le ralenti pour libérer les éclats', 'バレットタイムで氷片を放つ', 'Включите замедление для выпуска осколков', 'Kích hoạt chậm thời gian để phóng băng'],
  ['Swallowing gathers guardian ice. Bullet time releases the stored shards.', '吞噬积攒守护冰片，开启子弹时间时释放储存的冰片。', 'Avaler accumule de la glace gardienne. Le ralenti libère les éclats stockés.', '飲みこんで守護の氷片をため、バレットタイムで放つ。', 'Поглощение копит защитный лёд. Замедление выпускает запасённые осколки.', 'Nuốt để tích băng hộ vệ. Chậm thời gian phóng các mảnh đã trữ.'],
  ['Bullet time releases stronger piercing ice lances. Shards no longer absorb hits.', '开启子弹时间释放更强的贯穿冰矛，冰片不再减伤。', 'Le ralenti libère de puissantes lances perforantes. Les éclats ne protègent plus.', 'バレットタイムで強力な貫通氷槍を放つ。氷片の被弾軽減は失われる。', 'Замедление выпускает усиленные пробивающие копья. Осколки больше не защищают.', 'Chậm thời gian phóng thương băng xuyên thấu mạnh hơn. Mảnh băng không còn đỡ đòn.'],
  ['Approach the broken king and swallow it to finish the battle.', '靠近破防的王，吞噬它结束战斗。', 'Approchez du roi brisé et avalez-le pour terminer le combat.', '崩れた王に近づき、飲みこんで決着をつけよう。', 'Подойдите к сломленному королю и поглотите его, чтобы завершить бой.', 'Tiến đến vị vua đã vỡ phòng thủ và nuốt để kết thúc trận chiến.'],
  ['The glowing nexus is your hitbox. It grows with the city. Use bullet time to find a gap.', '发光中枢是受击区域，会随城堡长大。用子弹时间寻找弹幕空隙。', 'Le cœur lumineux est votre zone vulnérable. Il grandit avec la cité. Utilisez le ralenti pour trouver un passage.', '光る中枢が当たり判定。城とともに大きくなる。バレットタイムで弾の隙間を探そう。', 'Светящееся ядро — ваша уязвимая область. Она растёт вместе с городом. Замедление поможет найти просвет.', 'Lõi phát sáng là vùng trúng đòn và lớn theo thành phố. Dùng chậm thời gian để tìm khe giữa làn đạn.'],
  ['Traveling home', '起始城堡', 'Château de départ', '初期の城', 'Начальный замок', 'Lâu đài khởi đầu'],
  ['Choose your traveling home', '选择开局玩法', 'Choisir son style de départ', '最初の戦い方を選ぶ', 'Выберите начальный стиль', 'Chọn lối chơi khởi đầu'],
  ['Compare', '查看区别', 'Comparer', '違いを見る', 'Сравнить', 'So sánh'],
  ['Cannon castle', '炮击城堡', 'Château à canons', '砲撃の城', 'Пушечный замок', 'Lâu đài đại bác'],
  ['Flame castle', '火焰城堡', 'Château de flammes', '炎の城', 'Огненный замок', 'Lâu đài lửa'],
  ['Frost castle', '冰霜城堡', 'Château de givre', '氷霜の城', 'Ледяной замок', 'Lâu đài băng'],
  ['Ranged · First-run pick', '远程稳健 · 初次推荐', 'À distance · Pour débuter', '遠距離・初回におすすめ', 'Дальний бой · Для новичков', 'Tầm xa · Hợp người mới'],
  ['Close-range burst', '靠近怪群 · 爆发清场', 'Explosion à courte portée', '近距離・範囲火力', 'Взрывной ближний бой', 'Bùng nổ cận chiến'],
  ['Control and defense', '减速控场 · 冰片护身', 'Contrôle et défense', '減速と防御', 'Контроль и защита', 'Khống chế và phòng thủ'],
  ['Automatic cannon fire.', '自动炮击，远距离打敌人。', 'Tirs de canon automatiques.', '大砲が自動で遠距離攻撃。', 'Автоматический пушечный огонь.', 'Tự động bắn đại bác.'],
  ['Automatic fireballs.', '自动火球轰炸。', 'Boules de feu automatiques.', '火球で自動攻撃。', 'Автоматические огненные шары.', 'Tự động bắn cầu lửa.'],
  ['Automatic slowing ice bolts.', '自动冰箭，命中让敌人减速。', 'Éclats automatiques qui ralentissent.', '自動の氷矢が敵を減速。', 'Автоматические замедляющие ледяные стрелы.', 'Tự động bắn tên băng làm chậm địch.'],
  ['Fill the charge bar to fire a broadside automatically.', '填满蓄能条，自动追加一轮齐射。', 'Remplissez la jauge pour déclencher une salve.', 'チャージ満タンで一斉射撃を追加。', 'Заполните шкалу заряда для автоматического залпа.', 'Tích đầy thanh năng lượng để tự động bắn loạt pháo.'],
  ['Fill the heat bar to erupt around you. Burning wreckage charges faster.', '蓄满热量向周围喷发；燃烧残骸蓄热更快。', 'À pleine chaleur, éruption autour de vous. Les débris brûlants chargent plus vite.', '熱が満タンで周囲に噴火。燃える残骸なら早くたまる。', 'Полная шкала тепла вызывает извержение вокруг вас. Горящие обломки заряжают быстрее.', 'Đầy nhiệt sẽ phun lửa quanh bạn. Phế tích cháy tích nhiệt nhanh hơn.'],
  ['Store ice shards to soften hits. Activate bullet time to launch them.', '积攒冰片抵挡部分伤害；开子弹时间射出冰片。', 'Stockez des éclats pour réduire les dégâts. Le ralenti les projette.', '氷片をためて被害を軽減。バレットタイムで放つ。', 'Копите осколки для снижения урона. Замедление выпускает их.', 'Trữ mảnh băng để giảm sát thương. Chậm thời gian phóng chúng ra.'],
  ['Attack', '攻击', 'Attaque', '攻撃', 'Атака', 'Tấn công'],
  ['After swallowing', '吞噬后', 'Après absorption', '飲みこむと', 'После поглощения', 'Sau khi nuốt'],
  ['Selected', '已选用', 'Sélectionné', '選択中', 'Выбрано', 'Đã chọn'],
  ['Use this castle', '使用这座城堡', 'Choisir ce château', 'この城を使う', 'Выбрать этот замок', 'Dùng lâu đài này'],
  ['Choose your starting weapon and how swallowing powers your castle. All homes can learn other weapons during the run.', '决定起始武器，以及吞噬后的额外效果。局内仍能学习其他武器、自由搭配。', 'Choisissez votre arme de départ et l’effet des ressources avalées. Chaque château peut apprendre d’autres armes en partie.', '初期武器と飲みこんだ時の効果が変わる。冒険中は、どの城でも他の武器を学べる。', 'Выберите начальное оружие и эффект поглощения. Любой замок может освоить другое оружие в ходе забега.', 'Chọn vũ khí ban đầu và hiệu ứng khi nuốt. Mọi lâu đài đều có thể học vũ khí khác trong lượt chơi.'],
  ['Try the cannon castle first. You can switch castles before every expedition.', '第一次建议选炮击；每次开局前都能更换。', 'Essayez d’abord les canons. Vous pouvez changer avant chaque expédition.', '初回は砲撃がおすすめ。冒険を始めるたびに変更できる。', 'Для начала попробуйте пушки. Замок можно менять перед каждым походом.', 'Lần đầu nên thử đại bác. Có thể đổi lâu đài trước mỗi chuyến đi.'],
  ['Castle and weapon growth', '城体与武器成长', 'Évolution du château et des armes', '城体と武器の成長', 'Рост замка и оружия', 'Phát triển lâu đài và vũ khí'],
  ['Wandering cottage', '流浪小屋', 'Petite maison errante', '旅する小屋', 'Странствующий домик', 'Nhà nhỏ lang thang'],
  ['Armed homestead', '武装宅邸', 'Maison fortifiée', '武装の館', 'Вооружённая усадьба', 'Dinh thự vũ trang'],
  ['Traveling keep', '行走要塞', 'Donjon itinérant', '歩く要塞', 'Шагающая крепость', 'Pháo đài di động'],
  ['Roaming citadel', '巡游巨城', 'Citadelle nomade', '巡る大城塞', 'Кочующая цитадель', 'Thành trì du hành'],
  ['A small chassis with the first weapon mount.', '小底盘，装上第一座武器。', 'Petit châssis et premier affût.', '小さな土台に最初の武器を搭載。', 'Небольшое шасси с первым оружием.', 'Khung nhỏ với bệ vũ khí đầu tiên.'],
  ['Side decks and an upper floor make room for mixed weapons.', '扩建侧甲板和二层，容纳混搭武器。', 'Ponts latéraux et étage pour combiner les armes.', '側面デッキと二階に追加武器を搭載。', 'Боковые палубы и второй этаж для сочетаний оружия.', 'Thêm boong bên và tầng trên để kết hợp vũ khí.'],
  ['Reinforced wings and a lookout tower support heavier equipment.', '加固双翼和瞭望塔，支撑重型装备。', 'Ailes renforcées et tour pour l’armement lourd.', '両翼と見張り塔を補強し、重装備を支える。', 'Усиленные крылья и башня для тяжёлого вооружения.', 'Gia cố hai cánh và tháp canh để đỡ trang bị nặng.'],
  ['Layered bastions and a raised rear platform complete the fortress.', '多层堡垒与后部高台，形成完整巨城。', 'Bastions superposés et plateforme arrière surélevée.', '多層の堡塁と後方高台で大城塞が完成。', 'Многоярусные бастионы и высокая задняя платформа.', 'Thành lũy nhiều tầng và bệ sau trên cao hoàn thiện thành trì.'],
  ['Swallowing expands the chassis. Skill ranks upgrade its equipment. Both are visible on the same castle.', '吞噬成长扩建城体，技能升级改装武器；两条成长线都体现在同一座城上。', 'Avaler agrandit le châssis. Les niveaux de compétence améliorent l’équipement. Les deux se voient sur le même château.', '飲みこみで城体が拡張し、スキル強化で武器が進化。同じ城に両方が反映される。', 'Поглощение расширяет шасси, а уровни навыков улучшают оружие. Оба вида роста видны на одном замке.', 'Nuốt mở rộng thân thành, cấp kỹ năng nâng trang bị. Cả hai đều hiện trên cùng một lâu đài.'],
  ['Illustrated build examples. Extra weapon mounts do not grant skills; equipment appears only after you learn it.', '图中是搭配示例。扩建不会凭空送技能；学会对应武器，挂点才会装上装备。', 'Exemples illustrés. Les nouveaux affûts n’accordent pas de compétences : les armes apparaissent après leur apprentissage.', '図は構成例。拡張だけではスキルは増えず、習得した武器だけが搭載される。', 'На рисунках — примеры сборок. Новые крепления не дают навыков: оружие появляется после изучения.', 'Đây là ví dụ phối hợp. Bệ mới không tự cho kỹ năng; trang bị chỉ xuất hiện sau khi học.'],
  ['Cannon: one barrel, twin barrels, then a heavy three-gun battery. Each gun fires from its own muzzle.', '火炮：单管 → 双炮 → 三门重炮；每门炮都从自己的炮口开火。', 'Canons : un, puis deux, puis trois canons lourds. Chaque tir part de sa bouche réelle.', '大砲は単砲から双砲、三門の重砲へ。各砲口から実際に発射。', 'Пушки: одна, две, затем три тяжёлых. Каждая стреляет из собственного ствола.', 'Đại bác: một nòng → hai pháo → ba pháo hạng nặng. Mỗi khẩu bắn từ đúng miệng nòng.'],
  ['Frost projectors, wind rotors, lightning coils and fire mortars upgrade in three visual tiers. Mixed skills share the same chassis.', '冰霜喷口、风轮、雷电线圈、火焰迫击炮各有三档形态；混搭装备共用城体平台。', 'Projecteurs de givre, rotors, bobines et mortiers ont trois formes. Les armes combinées partagent le châssis.', '氷の投射器、風車、雷コイル、火炎迫撃砲は各3段階。同じ城体の台座に混載できる。', 'Ледяные излучатели, роторы, катушки и огненные мортиры имеют по три формы и используют общее шасси.', 'Bộ phóng băng, cánh quạt, cuộn sét và súng cối lửa có ba hình thái, cùng dùng bệ trên thân thành.'],
];

export const sourceKeys = rows.map(row => row[0]);
export const newKeys = { en: {}, zh: {}, fr: {}, ja: {}, ru: {}, vi: {} };
const locales = Object.keys(newKeys);
for (const row of rows) {
  if (row.length !== 6 || Object.hasOwn(newKeys.en, row[0])) throw new Error(`Invalid V6.5 translation: ${row[0]}`);
  for (let i = 0; i < locales.length; i++) newKeys[locales[i]][row[0]] = row[i];
}
newKeys.en['Slow the world for 4 seconds. You move and attack normally, but can still take damage. Cooldown: 24 seconds.'] = 'The world runs at 20% speed for 4 seconds. You move and attack normally but can still take damage. Cooldown: 24 seconds from activation.';
newKeys.en['Traveling home'] = 'Starting castle';
newKeys.en['Choose your traveling home'] = 'Choose your starting playstyle';
