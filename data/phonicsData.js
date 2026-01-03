/**
 * 自然拼读核心数据
 * 
 * 包含发音模式和例词
 * 每个发音模式（sound pattern）包含：
 * - pattern: 目标发音模式 (如 "a", "ox", "ai")
 * - pronunciation: IPA 发音 (如 "/æ/")
 * - category: 分类 (letter/short_vowel/long_vowel/consonant_blend/r_controlled/other)
 * - words: 例词列表，每个词标注目标发音的位置
 */

const phonicsData = {
    // ==========================================
    // 分类教学说明
    // ==========================================
    categoryDescriptions: {
        letters: {
            name: '26个字母基础发音',
            description: '每个字母都有一个最常见的基础发音。掌握这26个发音是自然拼读的第一步。',
            tip: '元音有5个：A E I O U，其余都是辅音。'
        },
        short_vowels: {
            name: '短元音组合',
            description: '辅音+元音+辅音（CVC结构），中间的元音发"短音"。短音是元音最基础、最常见的发音。',
            tip: '短音听起来短促有力，如 cat 的 /æ/、dog 的 /ɒ/。'
        },
        long_vowels: {
            name: '长元音',
            description: '长元音就是元音字母"说出自己的名字"。有两种方式让元音变长音：魔法E（Magic-E）和元音组合（Vowel Teams）。',
            tip: 'A说/eɪ/，E说/iː/，I说/aɪ/，O说/oʊ/，U说/juː/。'
        },
        consonant_blends: {
            name: '辅音组合',
            description: '两个辅音字母组合在一起，发出一个全新的、独立的音（Digraphs）。注意：这不是两个音拼起来，而是一个新的音。',
            tip: 'sh、ch、th、ng 各发一个独立的音，需要单独记忆。'
        },
        r_controlled: {
            name: 'R控制元音（Bossy R）',
            description: '当元音后面跟着字母r时，r会"霸道"地改变元音的发音，形成独特的音。',
            tip: 'er, ir, ur 这三个发音完全一样，都是 /ɜːr/。'
        },
        other_vowels: {
            name: '其他元音组合',
            description: '一些特殊的元音组合，发出的是"双元音"——发音时嘴型会有明显的变化。',
            tip: 'ou/ow 发 /aʊ/（啊呜），oi/oy 发 /ɔɪ/（哦伊）。'
        }
    },

    // ==========================================
    // 第一部分：26个字母的基本发音
    // ==========================================
    letters: [
        {
            pattern: 'a', pronunciation: '/æ/',
            words: [
                { word: 'apple', highlight: 'a', prefix: '', suffix: 'pple' },
                { word: 'ant', highlight: 'a', prefix: '', suffix: 'nt' },
                { word: 'alligator', highlight: 'a', prefix: '', suffix: 'lligator' },
                { word: 'ax', highlight: 'a', prefix: '', suffix: 'x' },
            ]
        },
        {
            pattern: 'b', pronunciation: '/b/',
            words: [
                { word: 'bag', highlight: 'b', prefix: '', suffix: 'ag' },
                { word: 'bike', highlight: 'b', prefix: '', suffix: 'ike' },
                { word: 'bus', highlight: 'b', prefix: '', suffix: 'us' },
                { word: 'boy', highlight: 'b', prefix: '', suffix: 'oy' },
            ]
        },
        {
            pattern: 'c', pronunciation: '/k/',
            words: [
                { word: 'cat', highlight: 'c', prefix: '', suffix: 'at' },
                { word: 'cup', highlight: 'c', prefix: '', suffix: 'up' },
                { word: 'car', highlight: 'c', prefix: '', suffix: 'ar' },
                { word: 'cow', highlight: 'c', prefix: '', suffix: 'ow' },
            ]
        },
        {
            pattern: 'd', pronunciation: '/d/',
            words: [
                { word: 'dog', highlight: 'd', prefix: '', suffix: 'og' },
                { word: 'doll', highlight: 'd', prefix: '', suffix: 'oll' },
                { word: 'duck', highlight: 'd', prefix: '', suffix: 'uck' },
                { word: 'dinosaur', highlight: 'd', prefix: '', suffix: 'inosaur' },
            ]
        },
        {
            pattern: 'e', pronunciation: '/ɛ/',
            words: [
                { word: 'egg', highlight: 'e', prefix: '', suffix: 'gg' },
                { word: 'elephant', highlight: 'e', prefix: '', suffix: 'lephant' },
                { word: 'elk', highlight: 'e', prefix: '', suffix: 'lk' },
                { word: 'elf', highlight: 'e', prefix: '', suffix: 'lf' },
            ]
        },
        {
            pattern: 'f', pronunciation: '/f/',
            words: [
                { word: 'fish', highlight: 'f', prefix: '', suffix: 'ish' },
                { word: 'frog', highlight: 'f', prefix: '', suffix: 'rog' },
                { word: 'farm', highlight: 'f', prefix: '', suffix: 'arm' },
                { word: 'flower', highlight: 'f', prefix: '', suffix: 'lower' },
            ]
        },
        {
            pattern: 'g', pronunciation: '/g/',
            words: [
                { word: 'gorilla', highlight: 'g', prefix: '', suffix: 'orilla' },
                { word: 'goat', highlight: 'g', prefix: '', suffix: 'oat' },
                { word: 'goose', highlight: 'g', prefix: '', suffix: 'oose' },
                { word: 'garden', highlight: 'g', prefix: '', suffix: 'arden' },
            ]
        },
        {
            pattern: 'h', pronunciation: '/h/',
            words: [
                { word: 'horse', highlight: 'h', prefix: '', suffix: 'orse' },
                { word: 'hen', highlight: 'h', prefix: '', suffix: 'en' },
                { word: 'house', highlight: 'h', prefix: '', suffix: 'ouse' },
                { word: 'hippo', highlight: 'h', prefix: '', suffix: 'ippo' },
            ]
        },
        {
            pattern: 'i', pronunciation: '/ɪ/',
            words: [
                { word: 'iguana', highlight: 'i', prefix: '', suffix: 'guana' },
                { word: 'insect', highlight: 'i', prefix: '', suffix: 'nsect' },
                { word: 'igloo', highlight: 'i', prefix: '', suffix: 'gloo' },
                { word: 'India', highlight: 'I', prefix: '', suffix: 'ndia' },
            ]
        },
        {
            pattern: 'j', pronunciation: '/dʒ/',
            words: [
                { word: 'jam', highlight: 'j', prefix: '', suffix: 'am' },
                { word: 'jacket', highlight: 'j', prefix: '', suffix: 'acket' },
                { word: 'jeep', highlight: 'j', prefix: '', suffix: 'eep' },
                { word: 'juice', highlight: 'j', prefix: '', suffix: 'uice' },
            ]
        },
        {
            pattern: 'k', pronunciation: '/k/',
            words: [
                { word: 'koala', highlight: 'k', prefix: '', suffix: 'oala' },
                { word: 'kangaroo', highlight: 'k', prefix: '', suffix: 'angaroo' },
                { word: 'kite', highlight: 'k', prefix: '', suffix: 'ite' },
                { word: 'kid', highlight: 'k', prefix: '', suffix: 'id' },
            ]
        },
        {
            pattern: 'l', pronunciation: '/l/',
            words: [
                { word: 'lion', highlight: 'l', prefix: '', suffix: 'ion' },
                { word: 'lamb', highlight: 'l', prefix: '', suffix: 'amb' },
                { word: 'lake', highlight: 'l', prefix: '', suffix: 'ake' },
                { word: 'ladybug', highlight: 'l', prefix: '', suffix: 'adybug' },
            ]
        },
        {
            pattern: 'm', pronunciation: '/m/',
            words: [
                { word: 'monkey', highlight: 'm', prefix: '', suffix: 'onkey' },
                { word: 'milk', highlight: 'm', prefix: '', suffix: 'ilk' },
                { word: 'music', highlight: 'm', prefix: '', suffix: 'usic' },
                { word: 'mango', highlight: 'm', prefix: '', suffix: 'ango' },
            ]
        },
        {
            pattern: 'n', pronunciation: '/n/',
            words: [
                { word: 'nurse', highlight: 'n', prefix: '', suffix: 'urse' },
                { word: 'neck', highlight: 'n', prefix: '', suffix: 'eck' },
                { word: 'nail', highlight: 'n', prefix: '', suffix: 'ail' },
                { word: 'nose', highlight: 'n', prefix: '', suffix: 'ose' },
            ]
        },
        {
            pattern: 'o', pronunciation: '/ɒ/',
            words: [
                { word: 'octopus', highlight: 'o', prefix: '', suffix: 'ctopus' },
                { word: 'ostrich', highlight: 'o', prefix: '', suffix: 'strich' },
                { word: 'otter', highlight: 'o', prefix: '', suffix: 'tter' },
                { word: 'ox', highlight: 'o', prefix: '', suffix: 'x' },
            ]
        },
        {
            pattern: 'p', pronunciation: '/p/',
            words: [
                { word: 'panda', highlight: 'p', prefix: '', suffix: 'anda' },
                { word: 'penguin', highlight: 'p', prefix: '', suffix: 'enguin' },
                { word: 'parrot', highlight: 'p', prefix: '', suffix: 'arrot' },
                { word: 'pencil', highlight: 'p', prefix: '', suffix: 'encil' },
            ]
        },
        {
            pattern: 'q', pronunciation: '/kw/',
            words: [
                { word: 'queen', highlight: 'qu', prefix: '', suffix: 'een' },
                { word: 'question', highlight: 'qu', prefix: '', suffix: 'estion' },
                { word: 'quail', highlight: 'qu', prefix: '', suffix: 'ail' },
                { word: 'quiz', highlight: 'qu', prefix: '', suffix: 'iz' },
            ]
        },
        {
            pattern: 'r', pronunciation: '/r/',
            words: [
                { word: 'robot', highlight: 'r', prefix: '', suffix: 'obot' },
                { word: 'rhino', highlight: 'r', prefix: '', suffix: 'hino' },
                { word: 'rabbit', highlight: 'r', prefix: '', suffix: 'abbit' },
                { word: 'rat', highlight: 'r', prefix: '', suffix: 'at' },
            ]
        },
        {
            pattern: 's', pronunciation: '/s/',
            words: [
                { word: 'sun', highlight: 's', prefix: '', suffix: 'un' },
                { word: 'sand', highlight: 's', prefix: '', suffix: 'and' },
                { word: 'soap', highlight: 's', prefix: '', suffix: 'oap' },
                { word: 'sea', highlight: 's', prefix: '', suffix: 'ea' },
            ]
        },
        {
            pattern: 't', pronunciation: '/t/',
            words: [
                { word: 'tiger', highlight: 't', prefix: '', suffix: 'iger' },
                { word: 'turtle', highlight: 't', prefix: '', suffix: 'urtle' },
                { word: 'turkey', highlight: 't', prefix: '', suffix: 'urkey' },
                { word: 'tent', highlight: 't', prefix: '', suffix: 'ent' },
            ]
        },
        {
            pattern: 'u', pronunciation: '/ʌ/',
            words: [
                { word: 'umbrella', highlight: 'u', prefix: '', suffix: 'mbrella' },
                { word: 'under', highlight: 'u', prefix: '', suffix: 'nder' },
                { word: 'up', highlight: 'u', prefix: '', suffix: 'p' },
                { word: 'uncle', highlight: 'u', prefix: '', suffix: 'ncle' },
            ]
        },
        {
            pattern: 'v', pronunciation: '/v/',
            words: [
                { word: 'volcano', highlight: 'v', prefix: '', suffix: 'olcano' },
                { word: 'village', highlight: 'v', prefix: '', suffix: 'illage' },
                { word: 'valley', highlight: 'v', prefix: '', suffix: 'alley' },
                { word: 'video', highlight: 'v', prefix: '', suffix: 'ideo' },
            ]
        },
        {
            pattern: 'w', pronunciation: '/w/',
            words: [
                { word: 'wolf', highlight: 'w', prefix: '', suffix: 'olf' },
                { word: 'witch', highlight: 'w', prefix: '', suffix: 'itch' },
                { word: 'web', highlight: 'w', prefix: '', suffix: 'eb' },
                { word: 'wig', highlight: 'w', prefix: '', suffix: 'ig' },
            ]
        },
        {
            pattern: 'x', pronunciation: '/ks/',
            words: [
                { word: 'fox', highlight: 'x', prefix: 'fo', suffix: '' },
                { word: 'box', highlight: 'x', prefix: 'bo', suffix: '' },
                { word: 'six', highlight: 'x', prefix: 'si', suffix: '' },
                { word: 'sax', highlight: 'x', prefix: 'sa', suffix: '' },
            ]
        },
        {
            pattern: 'y', pronunciation: '/j/',
            words: [
                { word: 'yo-yo', highlight: 'y', prefix: '', suffix: 'o-yo' },
                { word: 'yellow', highlight: 'y', prefix: '', suffix: 'ellow' },
                { word: 'yogurt', highlight: 'y', prefix: '', suffix: 'ogurt' },
                { word: 'yak', highlight: 'y', prefix: '', suffix: 'ak' },
            ]
        },
        {
            pattern: 'z', pronunciation: '/z/',
            words: [
                { word: 'zebra', highlight: 'z', prefix: '', suffix: 'ebra' },
                { word: 'zone', highlight: 'z', prefix: '', suffix: 'one' },
                { word: 'zero', highlight: 'z', prefix: '', suffix: 'ero' },
                { word: 'zoo', highlight: 'z', prefix: '', suffix: 'oo' },
            ]
        },
    ],

    // ==========================================
    // 第二部分：短音字母组合
    // ==========================================
    short_vowels: [
        {
            pattern: 'ad', pronunciation: '/æd/',
            words: [
                { word: 'dad', highlight: 'ad', prefix: 'd', suffix: '' },
                { word: 'mad', highlight: 'ad', prefix: 'm', suffix: '' },
                { word: 'sad', highlight: 'ad', prefix: 's', suffix: '' },
            ]
        },
        {
            pattern: 'ag', pronunciation: '/æg/',
            words: [
                { word: 'bag', highlight: 'ag', prefix: 'b', suffix: '' },
                { word: 'tag', highlight: 'ag', prefix: 't', suffix: '' },
                { word: 'rag', highlight: 'ag', prefix: 'r', suffix: '' },
            ]
        },
        {
            pattern: 'at', pronunciation: '/æt/',
            words: [
                { word: 'cat', highlight: 'at', prefix: 'c', suffix: '' },
                { word: 'mat', highlight: 'at', prefix: 'm', suffix: '' },
                { word: 'hat', highlight: 'at', prefix: 'h', suffix: '' },
                { word: 'rat', highlight: 'at', prefix: 'r', suffix: '' },
            ]
        },
        {
            pattern: 'am', pronunciation: '/æm/',
            words: [
                { word: 'dam', highlight: 'am', prefix: 'd', suffix: '' },
                { word: 'ham', highlight: 'am', prefix: 'h', suffix: '' },
                { word: 'jam', highlight: 'am', prefix: 'j', suffix: '' },
            ]
        },
        {
            pattern: 'an', pronunciation: '/æn/',
            words: [
                { word: 'man', highlight: 'an', prefix: 'm', suffix: '' },
                { word: 'fan', highlight: 'an', prefix: 'f', suffix: '' },
                { word: 'pan', highlight: 'an', prefix: 'p', suffix: '' },
            ]
        },
        {
            pattern: 'ap', pronunciation: '/æp/',
            words: [
                { word: 'map', highlight: 'ap', prefix: 'm', suffix: '' },
                { word: 'cap', highlight: 'ap', prefix: 'c', suffix: '' },
                { word: 'nap', highlight: 'ap', prefix: 'n', suffix: '' },
            ]
        },
        {
            pattern: 'ed', pronunciation: '/ɛd/',
            words: [
                { word: 'Ted', highlight: 'ed', prefix: 'T', suffix: '' },
                { word: 'red', highlight: 'ed', prefix: 'r', suffix: '' },
                { word: 'bed', highlight: 'ed', prefix: 'b', suffix: '' },
            ]
        },
        {
            pattern: 'eg', pronunciation: '/ɛg/',
            words: [
                { word: 'Meg', highlight: 'eg', prefix: 'M', suffix: '' },
                { word: 'leg', highlight: 'eg', prefix: 'l', suffix: '' },
                { word: 'peg', highlight: 'eg', prefix: 'p', suffix: '' },
            ]
        },
        {
            pattern: 'en', pronunciation: '/ɛn/',
            words: [
                { word: 'hen', highlight: 'en', prefix: 'h', suffix: '' },
                { word: 'pen', highlight: 'en', prefix: 'p', suffix: '' },
                { word: 'ten', highlight: 'en', prefix: 't', suffix: '' },
            ]
        },
        {
            pattern: 'ig', pronunciation: '/ɪg/',
            words: [
                { word: 'big', highlight: 'ig', prefix: 'b', suffix: '' },
                { word: 'pig', highlight: 'ig', prefix: 'p', suffix: '' },
                { word: 'wig', highlight: 'ig', prefix: 'w', suffix: '' },
            ]
        },
        {
            pattern: 'in', pronunciation: '/ɪn/',
            words: [
                { word: 'tin', highlight: 'in', prefix: 't', suffix: '' },
                { word: 'pin', highlight: 'in', prefix: 'p', suffix: '' },
                { word: 'bin', highlight: 'in', prefix: 'b', suffix: '' },
            ]
        },
        {
            pattern: 'ip', pronunciation: '/ɪp/',
            words: [
                { word: 'sip', highlight: 'ip', prefix: 's', suffix: '' },
                { word: 'zip', highlight: 'ip', prefix: 'z', suffix: '' },
                { word: 'lip', highlight: 'ip', prefix: 'l', suffix: '' },
            ]
        },
        {
            pattern: 'it', pronunciation: '/ɪt/',
            words: [
                { word: 'sit', highlight: 'it', prefix: 's', suffix: '' },
                { word: 'hit', highlight: 'it', prefix: 'h', suffix: '' },
                { word: 'kit', highlight: 'it', prefix: 'k', suffix: '' },
            ]
        },
        {
            pattern: 'ox', pronunciation: '/ɒks/',
            words: [
                { word: 'ox', highlight: 'ox', prefix: '', suffix: '' },
                { word: 'fox', highlight: 'ox', prefix: 'f', suffix: '' },
                { word: 'box', highlight: 'ox', prefix: 'b', suffix: '' },
            ]
        },
        {
            pattern: 'og', pronunciation: '/ɒg/',
            words: [
                { word: 'fog', highlight: 'og', prefix: 'f', suffix: '' },
                { word: 'jog', highlight: 'og', prefix: 'j', suffix: '' },
                { word: 'frog', highlight: 'og', prefix: 'fr', suffix: '' },
            ]
        },
        {
            pattern: 'op', pronunciation: '/ɒp/',
            words: [
                { word: 'hop', highlight: 'op', prefix: 'h', suffix: '' },
                { word: 'mop', highlight: 'op', prefix: 'm', suffix: '' },
                { word: 'top', highlight: 'op', prefix: 't', suffix: '' },
            ]
        },
        {
            pattern: 'ot', pronunciation: '/ɒt/',
            words: [
                { word: 'dot', highlight: 'ot', prefix: 'd', suffix: '' },
                { word: 'hot', highlight: 'ot', prefix: 'h', suffix: '' },
                { word: 'pot', highlight: 'ot', prefix: 'p', suffix: '' },
            ]
        },
        {
            pattern: 'ub', pronunciation: '/ʌb/',
            words: [
                { word: 'tub', highlight: 'ub', prefix: 't', suffix: '' },
                { word: 'cub', highlight: 'ub', prefix: 'c', suffix: '' },
                { word: 'rub', highlight: 'ub', prefix: 'r', suffix: '' },
            ]
        },
        {
            pattern: 'ug', pronunciation: '/ʌg/',
            words: [
                { word: 'bug', highlight: 'ug', prefix: 'b', suffix: '' },
                { word: 'mug', highlight: 'ug', prefix: 'm', suffix: '' },
                { word: 'rug', highlight: 'ug', prefix: 'r', suffix: '' },
            ]
        },
        {
            pattern: 'un', pronunciation: '/ʌn/',
            words: [
                { word: 'fun', highlight: 'un', prefix: 'f', suffix: '' },
                { word: 'sun', highlight: 'un', prefix: 's', suffix: '' },
                { word: 'bun', highlight: 'un', prefix: 'b', suffix: '' },
            ]
        },
        {
            pattern: 'ut', pronunciation: '/ʌt/',
            words: [
                { word: 'hut', highlight: 'ut', prefix: 'h', suffix: '' },
                { word: 'nut', highlight: 'ut', prefix: 'n', suffix: '' },
                { word: 'cut', highlight: 'ut', prefix: 'c', suffix: '' },
            ]
        },
    ],

    // ==========================================
    // 第三部分：长音字母组合 (Magic-E & 元音组合)
    // ==========================================
    long_vowels: [
        {
            pattern: 'a_e', pronunciation: '/eɪ/',
            rule: '魔法E（Magic-E）：结尾的e不发音，但让前面的a发长音 /eɪ/（字母A的名字）。',
            tip: '对比：cap（帽子）→ cape（披风），加了e，a就变长音了。',
            words: [
                { word: 'cake', highlight: 'a_e', prefix: 'c', suffix: '' },
                { word: 'bake', highlight: 'a_e', prefix: 'b', suffix: '' },
                { word: 'game', highlight: 'a_e', prefix: 'g', suffix: '' },
                { word: 'name', highlight: 'a_e', prefix: 'n', suffix: '' },
                { word: 'tape', highlight: 'a_e', prefix: 't', suffix: '' },
                { word: 'cape', highlight: 'a_e', prefix: 'c', suffix: '' },
            ]
        },
        {
            pattern: 'i_e', pronunciation: '/aɪ/',
            rule: '魔法E：结尾的e让i发长音 /aɪ/（字母I的名字）。',
            tip: '对比：kit（工具包）→ kite（风筝）。',
            words: [
                { word: 'bike', highlight: 'i_e', prefix: 'b', suffix: '' },
                { word: 'kite', highlight: 'i_e', prefix: 'k', suffix: '' },
                { word: 'time', highlight: 'i_e', prefix: 't', suffix: '' },
                { word: 'lime', highlight: 'i_e', prefix: 'l', suffix: '' },
                { word: 'ride', highlight: 'i_e', prefix: 'r', suffix: '' },
                { word: 'five', highlight: 'i_e', prefix: 'f', suffix: '' },
                { word: 'nine', highlight: 'i_e', prefix: 'n', suffix: '' },
                { word: 'pine', highlight: 'i_e', prefix: 'p', suffix: '' },
            ]
        },
        {
            pattern: 'o_e', pronunciation: '/oʊ/',
            rule: '魔法E：结尾的e让o发长音 /oʊ/（字母O的名字）。',
            tip: '对比：hop（跳）→ hope（希望）。',
            words: [
                { word: 'bone', highlight: 'o_e', prefix: 'b', suffix: '' },
                { word: 'cone', highlight: 'o_e', prefix: 'c', suffix: '' },
                { word: 'home', highlight: 'o_e', prefix: 'h', suffix: '' },
                { word: 'rope', highlight: 'o_e', prefix: 'r', suffix: '' },
                { word: 'hole', highlight: 'o_e', prefix: 'h', suffix: '' },
                { word: 'note', highlight: 'o_e', prefix: 'n', suffix: '' },
                { word: 'rose', highlight: 'o_e', prefix: 'r', suffix: '' },
                { word: 'hose', highlight: 'o_e', prefix: 'h', suffix: '' },
            ]
        },
        {
            pattern: 'u_e', pronunciation: '/juː/',
            rule: '魔法E：结尾的e让u发长音 /juː/（字母U的名字）。',
            tip: '对比：cub（幼兽）→ cube（立方体）。',
            words: [
                { word: 'cube', highlight: 'u_e', prefix: 'c', suffix: '' },
                { word: 'tube', highlight: 'u_e', prefix: 't', suffix: '' },
                { word: 'cute', highlight: 'u_e', prefix: 'c', suffix: '' },
                { word: 'mute', highlight: 'u_e', prefix: 'm', suffix: '' },
                { word: 'tune', highlight: 'u_e', prefix: 't', suffix: '' },
                { word: 'mule', highlight: 'u_e', prefix: 'm', suffix: '' },
            ]
        },
        {
            pattern: 'ai', pronunciation: '/eɪ/',
            rule: '元音组合：两个元音在一起，第一个发长音，第二个不发音。',
            tip: '口诀：When two vowels go walking, the first one does the talking.',
            words: [
                { word: 'rain', highlight: 'ai', prefix: 'r', suffix: 'n' },
                { word: 'tail', highlight: 'ai', prefix: 't', suffix: 'l' },
                { word: 'wait', highlight: 'ai', prefix: 'w', suffix: 't' },
                { word: 'snail', highlight: 'ai', prefix: 'sn', suffix: 'l' },
            ]
        },
        {
            pattern: 'ay', pronunciation: '/eɪ/',
            rule: '元音组合：ay和ai发音相同，ay通常出现在词尾。',
            tip: 'ai在词中，ay在词尾，如 rain vs play。',
            words: [
                { word: 'bay', highlight: 'ay', prefix: 'b', suffix: '' },
                { word: 'day', highlight: 'ay', prefix: 'd', suffix: '' },
                { word: 'May', highlight: 'ay', prefix: 'M', suffix: '' },
                { word: 'play', highlight: 'ay', prefix: 'pl', suffix: '' },
            ]
        },
        {
            pattern: 'ee', pronunciation: '/iː/',
            rule: '双元音组合：两个e在一起，发字母E的名字 /iː/。',
            tip: '这是最常见的长 E 音组合。',
            words: [
                { word: 'bee', highlight: 'ee', prefix: 'b', suffix: '' },
                { word: 'tree', highlight: 'ee', prefix: 'tr', suffix: '' },
                { word: 'green', highlight: 'ee', prefix: 'gr', suffix: 'n' },
                { word: 'sheep', highlight: 'ee', prefix: 'sh', suffix: 'p' },
            ]
        },
        {
            pattern: 'ea', pronunciation: '/iː/',
            rule: '元音组合：ea通常发 /iː/，e发音，a不发音。',
            tip: '注意：ea有时也发 /ɛ/，如 bread, head。',
            words: [
                { word: 'tea', highlight: 'ea', prefix: 't', suffix: '' },
                { word: 'sea', highlight: 'ea', prefix: 's', suffix: '' },
                { word: 'pea', highlight: 'ea', prefix: 'p', suffix: '' },
                { word: 'leaf', highlight: 'ea', prefix: 'l', suffix: 'f' },
            ]
        },
        {
            pattern: 'oa', pronunciation: '/oʊ/',
            rule: '元音组合：o发长音 /oʊ/，a不发音。',
            tip: '第一个元音说话，第二个不出声。',
            words: [
                { word: 'coat', highlight: 'oa', prefix: 'c', suffix: 't' },
                { word: 'goat', highlight: 'oa', prefix: 'g', suffix: 't' },
                { word: 'road', highlight: 'oa', prefix: 'r', suffix: 'd' },
                { word: 'toad', highlight: 'oa', prefix: 't', suffix: 'd' },
            ]
        },
        {
            pattern: 'ow', pronunciation: '/oʊ/',
            rule: 'ow有两种发音：/oʊ/（如snow）或 /aʊ/（如cow）。这里是 /oʊ/。',
            tip: '词尾ow发 /oʊ/ 还是 /aʊ/ 需要记忆，没有固定规则。',
            words: [
                { word: 'snow', highlight: 'ow', prefix: 'sn', suffix: '' },
                { word: 'row', highlight: 'ow', prefix: 'r', suffix: '' },
                { word: 'crow', highlight: 'ow', prefix: 'cr', suffix: '' },
                { word: 'window', highlight: 'ow', prefix: 'wind', suffix: '' },
            ]
        },
        {
            pattern: 'igh', pronunciation: '/aɪ/',
            rule: '特殊组合：igh中只有i发音，gh完全不发音。',
            tip: 'gh是沉默字母，不发任何声音。',
            words: [
                { word: 'light', highlight: 'igh', prefix: 'l', suffix: 't' },
                { word: 'high', highlight: 'igh', prefix: 'h', suffix: '' },
                { word: 'night', highlight: 'igh', prefix: 'n', suffix: 't' },
            ]
        },
        {
            pattern: 'oo', pronunciation: '/uː/',
            rule: '双O组合：通常发长音 /uː/，但有时发短音 /ʊ/。',
            tip: '短音的词需要单独记：book, look, good, foot, wood。',
            words: [
                { word: 'moon', highlight: 'oo', prefix: 'm', suffix: 'n' },
                { word: 'zoo', highlight: 'oo', prefix: 'z', suffix: '' },
                { word: 'food', highlight: 'oo', prefix: 'f', suffix: 'd' },
                { word: 'boot', highlight: 'oo', prefix: 'b', suffix: 't' },
            ]
        },
    ],

    // ==========================================
    // 第四部分：辅音字母组合
    // ==========================================
    consonant_blends: [
        {
            pattern: 'sh', pronunciation: '/ʃ/',
            rule: '辅音组合（Digraph）：sh发一个全新的音，像让人安静的“嘘”声。',
            tip: 's和h合起来发一个音，不是两个音拼起来。',
            words: [
                { word: 'ship', highlight: 'sh', prefix: '', suffix: 'ip' },
                { word: 'shop', highlight: 'sh', prefix: '', suffix: 'op' },
                { word: 'sheep', highlight: 'sh', prefix: '', suffix: 'eep' },
                { word: 'fish', highlight: 'sh', prefix: 'fi', suffix: '' },
            ]
        },
        {
            pattern: 'ch', pronunciation: '/tʃ/',
            rule: '辅音组合：ch发类似“吐”的音，独立的一个音。',
            tip: '发音时舌头抵住上颅然后释放。',
            words: [
                { word: 'chip', highlight: 'ch', prefix: '', suffix: 'ip' },
                { word: 'chop', highlight: 'ch', prefix: '', suffix: 'op' },
                { word: 'check', highlight: 'ch', prefix: '', suffix: 'eck' },
                { word: 'church', highlight: 'ch', prefix: '', suffix: 'urch' },
            ]
        },
        {
            pattern: 'th', pronunciation: '/θ/',
            rule: '辅音组合：舔头放在上下齿之间吹气。',
            tip: 'th有清音/θ/（think）和浊音/ð/（the）两种。',
            words: [
                { word: 'think', highlight: 'th', prefix: '', suffix: 'ink' },
                { word: 'thank', highlight: 'th', prefix: '', suffix: 'ank' },
                { word: 'three', highlight: 'th', prefix: '', suffix: 'ree' },
                { word: 'bath', highlight: 'th', prefix: 'ba', suffix: '' },
            ]
        },
        {
            pattern: 'ng', pronunciation: '/ŋ/',
            rule: '辅音组合：鼻音，气流从鼻子出来。',
            tip: '注意不要发成 n + g 两个音。',
            words: [
                { word: 'king', highlight: 'ng', prefix: 'ki', suffix: '' },
                { word: 'sing', highlight: 'ng', prefix: 'si', suffix: '' },
                { word: 'swing', highlight: 'ng', prefix: 'swi', suffix: '' },
                { word: 'song', highlight: 'ng', prefix: 'so', suffix: '' },
            ]
        },
        {
            pattern: 'nk', pronunciation: '/ŋk/',
            rule: '辅音组合：ng + k，先发鼻音再加/k/。',
            tip: '这个nk比ng多了一个/k/的结尾。',
            words: [
                { word: 'ink', highlight: 'nk', prefix: 'i', suffix: '' },
                { word: 'bank', highlight: 'nk', prefix: 'ba', suffix: '' },
                { word: 'think', highlight: 'nk', prefix: 'thi', suffix: '' },
                { word: 'pink', highlight: 'nk', prefix: 'pi', suffix: '' },
            ]
        },
    ],

    // ==========================================
    // 第五部分：R控制元音
    // ==========================================
    r_controlled: [
        {
            pattern: 'ar', pronunciation: '/ɑːr/',
            rule: 'R控制元音（Bossy R）：r让前面的a发开口的卷舔音。',
            tip: 'ar是最常见的R控制元音，像海盗说的“ARRR”。',
            words: [
                { word: 'star', highlight: 'ar', prefix: 'st', suffix: '' },
                { word: 'card', highlight: 'ar', prefix: 'c', suffix: 'd' },
                { word: 'park', highlight: 'ar', prefix: 'p', suffix: 'k' },
                { word: 'yard', highlight: 'ar', prefix: 'y', suffix: 'd' },
            ]
        },
        {
            pattern: 'ir', pronunciation: '/ɜːr/',
            rule: 'R控制元音：er, ir, ur发音完全相同。',
            tip: '这三个组合都发 /ɜːr/，只是拼写不同。',
            words: [
                { word: 'bird', highlight: 'ir', prefix: 'b', suffix: 'd' },
                { word: 'girl', highlight: 'ir', prefix: 'g', suffix: 'l' },
                { word: 'skirt', highlight: 'ir', prefix: 'sk', suffix: 't' },
                { word: 'dirty', highlight: 'ir', prefix: 'd', suffix: 'ty' },
            ]
        },
        {
            pattern: 'ur', pronunciation: '/ɜːr/',
            rule: 'R控制元音：ur和er, ir发音相同。',
            tip: '记住：er, ir, ur是“三胞胎”，声音一样。',
            words: [
                { word: 'nurse', highlight: 'ur', prefix: 'n', suffix: 'se' },
                { word: 'purple', highlight: 'ur', prefix: 'p', suffix: 'ple' },
                { word: 'burn', highlight: 'ur', prefix: 'b', suffix: 'n' },
                { word: 'purse', highlight: 'ur', prefix: 'p', suffix: 'se' },
            ]
        },
        {
            pattern: 'or', pronunciation: '/ɔːr/',
            rule: 'R控制元音：or发圆唇的卷舔音。',
            tip: 'or的发音和ar不同，嘴唇更圆。',
            words: [
                { word: 'horse', highlight: 'or', prefix: 'h', suffix: 'se' },
                { word: 'fork', highlight: 'or', prefix: 'f', suffix: 'k' },
                { word: 'corner', highlight: 'or', prefix: 'c', suffix: 'ner' },
                { word: 'tractor', highlight: 'or', prefix: 'tract', suffix: '' },
            ]
        },
        {
            pattern: 'er', pronunciation: '/ər/',
            rule: 'R控制元音：er在非重读音节发弱化的 /ər/。',
            tip: '词尾的er通常发轻音，不像词中的er那么重。',
            words: [
                { word: 'water', highlight: 'er', prefix: 'wat', suffix: '' },
                { word: 'sister', highlight: 'er', prefix: 'sist', suffix: '' },
                { word: 'letter', highlight: 'er', prefix: 'lett', suffix: '' },
                { word: 'doctor', highlight: 'or', prefix: 'doct', suffix: '' },
            ]
        },
    ],

    // ==========================================
    // 第六部分：其他元音组合
    // ==========================================
    other_vowels: [
        {
            pattern: 'ou', pronunciation: '/aʊ/',
            rule: '双元音：嘴巴张大，从“啊”滑向“呜”。',
            tip: '像的到疼时喊的“ouch”。',
            words: [
                { word: 'mouse', highlight: 'ou', prefix: 'm', suffix: 'se' },
                { word: 'house', highlight: 'ou', prefix: 'h', suffix: 'se' },
                { word: 'out', highlight: 'ou', prefix: '', suffix: 't' },
                { word: 'shout', highlight: 'ou', prefix: 'sh', suffix: 't' },
            ]
        },
        {
            pattern: 'ow', pronunciation: '/aʊ/',
            rule: '双元音：ow在这里发 /aʊ/（和ou相同）。',
            tip: 'ow有两个发音：/aʊ/（cow）和 /oʊ/（snow），需要分别记忆。',
            words: [
                { word: 'cow', highlight: 'ow', prefix: 'c', suffix: '' },
                { word: 'owl', highlight: 'ow', prefix: '', suffix: 'l' },
                { word: 'down', highlight: 'ow', prefix: 'd', suffix: 'n' },
                { word: 'town', highlight: 'ow', prefix: 't', suffix: 'n' },
            ]
        },
        {
            pattern: 'oi', pronunciation: '/ɔɪ/',
            rule: '双元音：像惊讶地喚“哦伊”。',
            tip: 'oi通常在词中，oy通常在词尾。',
            words: [
                { word: 'coin', highlight: 'oi', prefix: 'c', suffix: 'n' },
                { word: 'soil', highlight: 'oi', prefix: 's', suffix: 'l' },
                { word: 'noise', highlight: 'oi', prefix: 'n', suffix: 'se' },
                { word: 'join', highlight: 'oi', prefix: 'j', suffix: 'n' },
            ]
        },
        {
            pattern: 'oy', pronunciation: '/ɔɪ/',
            rule: '双元音：oy和oi发音相同，通常出现在词尾。',
            tip: 'oi在词中，oy在词尾，如 coin vs boy。',
            words: [
                { word: 'toy', highlight: 'oy', prefix: 't', suffix: '' },
                { word: 'boy', highlight: 'oy', prefix: 'b', suffix: '' },
                { word: 'oyster', highlight: 'oy', prefix: '', suffix: 'ster' },
                { word: 'joy', highlight: 'oy', prefix: 'j', suffix: '' },
            ]
        },
        {
            pattern: 'aw', pronunciation: '/ɔː/',
            rule: '元音组合：嘴巴张圆，发“奥”的音。',
            tip: 'aw和au发音相同，都是 /ɔː/。',
            words: [
                { word: 'law', highlight: 'aw', prefix: 'l', suffix: '' },
                { word: 'saw', highlight: 'aw', prefix: 's', suffix: '' },
                { word: 'paw', highlight: 'aw', prefix: 'p', suffix: '' },
                { word: 'draw', highlight: 'aw', prefix: 'dr', suffix: '' },
            ]
        },
        {
            pattern: 'au', pronunciation: '/ɔː/',
            rule: '元音组合：au和aw发音相同。',
            tip: 'au通常在词中，aw通常在词尾。',
            words: [
                { word: 'August', highlight: 'Au', prefix: '', suffix: 'gust' },
                { word: 'auto', highlight: 'au', prefix: '', suffix: 'to' },
            ]
        },
    ],
};

module.exports = phonicsData;
