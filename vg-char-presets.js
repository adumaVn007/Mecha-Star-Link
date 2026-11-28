/* Cosmetic adult human appearances; independent of origins, stats, and skills. */
(function (g) {
  'use strict';
  var VG = g.VG = g.VG || {};
  var list = [
    {
      id: 'nam_01', gender: 'nam', number: 1, style: 'traveler',
      name: 'Lữ khách Thanh Vân',
      desc: 'Nam trưởng thành, tóc rẽ ngôi, áo khoác chàm, khăn choàng và túi da.',
      colors: { primary: '#345c70', secondary: '#243549', accent: '#d6b778', hair: '#25232a', skin: '#bd8c6b' }
    },
    {
      id: 'nam_02', gender: 'nam', number: 2, style: 'martial',
      name: 'Võ phục Xích Sa',
      desc: 'Nam trưởng thành, tóc búi cao, võ phục đỏ đất, quần rộng và đai vải.',
      colors: { primary: '#924a43', secondary: '#343344', accent: '#e0bc7a', hair: '#211e25', skin: '#c79774' }
    },
    {
      id: 'nam_03', gender: 'nam', number: 3, style: 'scholar',
      name: 'Trường bào Mặc Lam',
      desc: 'Nam trưởng thành, tóc dài buộc nửa, trường bào xanh mực, tay áo rộng.',
      colors: { primary: '#374b76', secondary: '#b1b9b3', accent: '#c5ac75', hair: '#302b30', skin: '#d5ab8c' }
    },
    {
      id: 'nam_04', gender: 'nam', number: 4, style: 'engineer',
      name: 'Kỹ sư Đồng Phong',
      desc: 'Nam trưởng thành, tóc ngắn, kính trán, áo xắn tay và tạp dề da đồng.',
      colors: { primary: '#9c7148', secondary: '#354e57', accent: '#72c6c3', hair: '#49362e', skin: '#b88462' }
    },
    {
      id: 'nam_05', gender: 'nam', number: 5, style: 'guardian',
      name: 'Giáp nhẹ Ngân Vệ',
      desc: 'Nam trưởng thành, tóc buộc thấp, giáp bạc gọn trên áo dài xanh than.',
      colors: { primary: '#344d5b', secondary: '#88989f', accent: '#d9bd7e', hair: '#25252a', skin: '#c49a7d' }
    },
    {
      id: 'nu_01', gender: 'nu', number: 1, style: 'traveler',
      name: 'Lữ khách Lam Khê',
      desc: 'Nữ trưởng thành, tóc ngang vai lệch ngôi, áo choàng lam và túi da.',
      colors: { primary: '#3c727b', secondary: '#303d54', accent: '#e0bf83', hair: '#35292c', skin: '#c89a7b' }
    },
    {
      id: 'nu_02', gender: 'nu', number: 2, style: 'martial',
      name: 'Võ phục Chu Tước',
      desc: 'Nữ trưởng thành, tóc đuôi ngựa cao, võ phục đỏ son kín đáo và đai vải.',
      colors: { primary: '#a04c56', secondary: '#3c354c', accent: '#e6c28a', hair: '#29222b', skin: '#d0a07f' }
    },
    {
      id: 'nu_03', gender: 'nu', number: 3, style: 'scholar',
      name: 'Trường bào Ngọc Trúc',
      desc: 'Nữ trưởng thành, tóc búi cài trâm, trường bào ngọc xanh với tay áo rộng.',
      colors: { primary: '#416d69', secondary: '#c0c8b8', accent: '#d7bb80', hair: '#27262b', skin: '#d8b295' }
    },
    {
      id: 'nu_04', gender: 'nu', number: 4, style: 'engineer',
      name: 'Kỹ sư Tinh Đồng',
      desc: 'Nữ trưởng thành, tóc tém, kính trán, áo xắn tay và tạp dề nhiều túi.',
      colors: { primary: '#aa7b51', secondary: '#36545e', accent: '#84d1c9', hair: '#603f32', skin: '#b88768' }
    },
    {
      id: 'nu_05', gender: 'nu', number: 5, style: 'guardian',
      name: 'Giáp nhẹ Nguyệt Vệ',
      desc: 'Nữ trưởng thành, tóc tết dài, giáp bạc nhẹ và vạt áo tím than viền vàng.',
      colors: { primary: '#56516f', secondary: '#96a8ac', accent: '#e1c48a', hair: '#322b36', skin: '#cda88b' }
    }
  ];

  VG.charPresets = {
    version: 1,
    list: list,
    find: function (id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },
    forGender: function (gender) {
      return list.filter(function (preset) { return preset.gender === gender; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
