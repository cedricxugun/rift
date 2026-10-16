// Source copy and six-language overrides; applied only by add-missing-keys.mjs.
const rows = [
  ['Ordinary packs are scarce, expire after 40 seconds, and stop dropping above 85% integrity. Elite rewards remain guaranteed.','普通血包稀少，40 秒后消失；耐久高于 85% 时不再掉落。精英治疗奖励保留。','Les soins ordinaires sont rares, disparaissent après 40 s et ne tombent plus au-dessus de 85 % d’intégrité. Les récompenses élites restent garanties.','通常の回復包は希少で40秒後に消える。耐久85%超では落ちない。エリートの回復報酬は必ず残る。','Обычные аптечки редки, исчезают через 40 с и не выпадают при прочности выше 85%. Награды элит гарантированы.','Túi hồi phục thường khá hiếm, biến mất sau 40 giây và không rơi khi độ bền trên 85%. Phần thưởng hồi phục từ tinh anh vẫn được bảo đảm.'],
  ['Calls a blast under your core. Leave the marked circle.','交替释放扩散震波与连锁根脉。跨过波环，避开依次点亮的落点。','Alterne onde circulaire et racines en chaîne. Traversez l’anneau et évitez les impacts successifs.','拡散波と連鎖する根を交互に放つ。波の輪を越え、順に光る着弾点を避けよう。','Чередует кольцевую волну и цепь корней. Пересекайте кольцо и обходите последовательные удары.','Luân phiên sóng vòng và chuỗi rễ. Vượt qua vòng sóng, tránh các điểm nổ nối tiếp.'],
  ['Slow rings hide fast aimed shots. Save a dash for the overlap.','释放带缺口的双重花瓣环，再横扫扇形弹。找到通道，等收招时反击。','Double anneau de pétales ajouré, puis balayage en éventail. Cherchez le passage et ripostez après la salve.','隙間のある二重花びら弾と扇状掃射。通路を探し、攻撃後に反撃しよう。','Двойные кольца лепестков с просветом и веерный обстрел. Ищите проход, затем контратакуйте.','Hai vòng cánh hoa có khe, rồi quét đạn quạt. Tìm lối và phản công sau loạt bắn.'],
  ['Three phases: fans, bombardment, spiral rings. Its final broken form can be swallowed.','三阶段交替横扫、错位花瓣环、锁定射线与根脉震波。最终破防后可吞噬。','Trois phases : balayages, anneaux décalés, rayons verrouillés et ondes de racines. Avalez sa forme brisée.','3段階で掃射、ずれた弾環、固定ビーム、根の衝撃波を使う。最後に防御を崩せば飲みこめる。','Три фазы: вееры, смещённые кольца, фиксированные лучи и корневые волны. Ослабленного короля можно поглотить.','Ba giai đoạn: quét đạn, vòng lệch, tia khóa hướng và sóng rễ. Phá phòng thủ cuối để nuốt.'],
  ['Nexus modification','中枢改装','Module du noyau','中枢改装','Модификация ядра','Cải tạo lõi'],
  ['Nexus capacitor','中枢聚能器','Condensateur du noyau','中枢コンデンサー','Конденсатор ядра','Tụ năng lượng lõi'],
  ['Swallowed resources grant 16% more home charge.','吞噬物资提供的家园蓄能提高 16%。','Les ressources avalées donnent 16 % de charge de foyer en plus.','飲みこんだ資源による家園チャージが16%増える。','Поглощённые ресурсы дают на 16% больше заряда дому.','Vật tư nuốt vào tăng thêm 16% năng lượng nhà.'],
  ['Living core shell','活性中枢外壳','Coque vivante du noyau','活性中枢シェル','Живая оболочка ядра','Vỏ lõi sống'],
  ['The nexus absorbs 18 damage. Its shell recharges every 12 seconds after a hit.','中枢抵挡 18 点伤害；受击后 12 秒重建外壳。','Le noyau absorbe 18 dégâts. Sa coque se recharge 12 s après un impact.','中枢が18ダメージを吸収。被弾から12秒後に外殻が再生する。','Ядро поглощает 18 урона. Оболочка восстанавливается через 12 с после попадания.','Lõi hấp thụ 18 sát thương; vỏ tái tạo 12 giây sau khi trúng đòn.'],
  ['Region I · Bellwind Meadow','第一关 · 风铃草甸','Région I · Prairie des carillons','第1地域・風鈴の草原','Регион I · Луг колокольчиков','Vùng I · Đồng cỏ chuông gió'],
  ['Harvest awakening','丰收苏醒','Éveil des récoltes','収穫の目覚め','Пробуждение урожая','Mùa gặt thức giấc'],
  ['Meadow patrol','草甸巡卫','Patrouille des prés','草原の巡回兵','Луговой патруль','Tuần vệ đồng cỏ'],
  ['Lantern crossfire','铃灯交火','Feux des lanternes','鈴灯の交差射撃','Перекрёстный огонь фонарей','Hỏa lực đèn chuông'],
  ['Rootguard siege','根卫围攻','Siège des gardes-racines','根の守衛の包囲','Осада корневых стражей','Vệ rễ vây thành'],
  ['The elder guard','古树禁卫','Garde des anciens arbres','古樹の近衛','Гвардия древних деревьев','Cận vệ cổ thụ'],
  ['Salvage interlude','回收整备','Halte de récupération','回収と整備','Передышка для сбора','Thu hồi và chỉnh trang'],
  ['Sweep through the stacked supplies. Fill your first skill bar before the guards arrive.','扫过成堆物资，守卫抵达前攒满第一条技能能量。','Avalez les piles de provisions. Remplissez votre première jauge avant l’arrivée des gardes.','積まれた物資を飲みこもう。守衛が来る前に最初のスキルゲージを満たそう。','Поглощайте груды припасов. Заполните первую шкалу навыка до прихода стражей.','Nuốt các chồng vật tư. Nạp đầy thanh kỹ năng đầu tiên trước khi lính gác tới.'],
  ['The glowing nexus is your hitbox. It grows with the city. Dash through danger.','发光中枢是受击范围，会随城市长大；冲刺可穿越危险。','Le noyau lumineux est votre zone de collision. Il grandit avec la ville. Esquivez en ruée.','光る中枢が当たり判定。街と共に大きくなる。ダッシュで危険を抜けよう。','Светящийся узел — зона попадания. Он растёт вместе с городом. Используйте рывок.','Lõi sáng là vùng trúng đòn, lớn theo thành phố. Lướt xuyên nguy hiểm.'],
  ['The visible energy nexus grows with the city. Its rim is the collision boundary.','能量中枢随城市成长，发光外缘就是受击边界。','Le noyau visible grandit avec la ville. Son contour est la limite de collision.','エネルギー中枢は街と共に成長する。光る縁が当たり判定の境界。','Энергетический узел растёт вместе с городом. Его край обозначает границу попадания.','Lõi năng lượng lớn theo thành phố. Viền sáng chính là ranh giới va chạm.'],
  ['Break the guards, then swallow their wreckage to recharge.','击破守卫，再吞下残骸为下一轮攻击蓄能。','Brisez les gardes, puis avalez leurs débris pour recharger.','守衛を倒し、残骸を飲みこんで次の攻撃を充填しよう。','Разбейте стражей и поглотите обломки для перезарядки.','Hạ lính gác rồi nuốt phế tích để nạp cho đợt tấn công tiếp.'],
  ['Silence the lantern keepers and dodge the petal volleys.','优先拆掉铃灯护盾链，穿过花瓣弹的空隙。','Éliminez les gardiens des lanternes et évitez les salves de pétales.','鈴灯の守り手を倒し、花びら弾の隙間を抜けよう。','Уничтожайте хранителей фонарей и уклоняйтесь от лепестковых залпов.','Hạ người giữ đèn và né qua khe đạn cánh hoa.'],
  ['Dodge the root waves. Strike while heavy guardians recover.','躲开根脉震波，趁重装守卫收招时反击。','Évitez les ondes de racines. Frappez pendant la récupération des gardes lourds.','根の衝撃波を避け、重装守衛の攻撃後の隙を狙おう。','Уходите от корневых волн и бейте тяжёлых стражей во время восстановления.','Né sóng rễ, phản công lúc vệ binh hạng nặng hồi chiêu.'],
  ['Branch returns after two upgrades.','两次强化后再选分支','Branches après deux améliorations.','強化2回後に分岐を再選択。','Ветви вернутся через два улучшения.','Chọn nhánh lại sau hai nâng cấp.'],
  ['Star seed','星铃种子','Graine étoilée','星鈴の種','Звёздное семя','Hạt chuông sao'],
  ['One extra skill reroll.','技能重选次数 +1。','Une relance de compétence en plus.','スキル再抽選が1回増える。','Ещё одна смена выбора навыков.','Thêm một lần đổi lựa chọn kỹ năng.'],
  ['Wind fruit','乘风果','Fruit du vent','風乗りの実','Плод ветра','Quả cưỡi gió'],
  ['Move and gather faster for 12 seconds.','移速与吸附范围提升，持续 12 秒。','Déplacement et collecte améliorés pendant 12 secondes.','12秒間、移動速度と吸引範囲が上がる。','Движение и сбор ускоряются на 12 секунд.','Tăng tốc di chuyển và phạm vi hút trong 12 giây.'],
  ['Salvage sustain','吞残骸 → 续攻速','Débris → cadence','残骸回収→攻撃加速','Обломки → скорость атак','Nuốt phế tích → tốc đánh'],
  ['Ward breaker','雷电标记 → 炮击破盾','Marque → brise-barrière','雷の標示→砲撃で結界破壊','Метка → пробой щита','Sét đánh dấu → pháo phá khiên'],
  ['Dash counter','近敌冲刺 → 放电消弹','Ruée proche → décharge','接近ダッシュ→放電・弾消し','Рывок вблизи → разряд','Lướt gần địch → phóng điện'],
  ['Interrupt burst','冰火交汇 → 打断蓄力','Feu + givre → interruption','氷と炎→予備動作を中断','Лёд + огонь → прерывание','Băng lửa → ngắt tụ chiêu'],
  ['Copper scarab','铜叶甲虫','Scarabée cuivré','銅葉甲虫','Меднолистый жук','Bọ lá đồng'],
  ['Iron tusk','木槌冲锋卫','Garde au bélier','木槌の突撃衛','Страж-таран','Vệ binh búa gỗ'],
  ['Siege walker','种荚投弹手','Lanceur de graines','種莢の砲撃手','Метатель семян','Xạ thủ hạt nổ'],
  ['Rune weaver','风铃织术师','Tisseur de carillons','風鈴の術師','Ткач колокольчиков','Pháp sư chuông gió'],
  ['Rootbound colossus','根脉石卫','Garde de pierre-racine','根脈の石衛','Корневой каменный страж','Thạch vệ mạch rễ'],
  ['The gilded hunter','鎏金角卫','Garde aux cornes dorées','黄金角の守衛','Златорогий страж','Hộ vệ sừng vàng'],
  ['The clockwork oracle','铃灯观测者','Oracle des lanternes','鈴灯の観測者','Смотритель фонарей','Kẻ quan sát đèn chuông'],
  ['The hollow king','空洞树王','Roi de l’arbre creux','空洞樹の王','Король полого дерева','Vua cây rỗng'],
];
const locales=['en','zh','fr','ja','ru','vi'];
export const sourceKeys=rows.map(row=>row[0]);
export const newKeys=Object.fromEntries(locales.map((locale,index)=>[locale,Object.fromEntries(rows.map(row=>[row[0],row[index]]))]));
newKeys.en['Calls a blast under your core. Leave the marked circle.']='Alternates expanding root waves and sequential ground blasts. Cross the wave and avoid the marked impacts.';
newKeys.en['Slow rings hide fast aimed shots. Save a dash for the overlap.']='Twin petal rings leave a shifting gap. A sweeping fan follows; counterattack during recovery.';
newKeys.en['Three phases: fans, bombardment, spiral rings. Its final broken form can be swallowed.']='Three phases alternate sweeps, offset petal rings, locked rays and root waves. Devour its final broken form.';
