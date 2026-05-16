import type { RawMessage } from '../types/message'

// 生成模拟恋爱聊天记录，覆盖多种场景和情绪变化
export function generateDemoMessages(): RawMessage[] {
  const messages: RawMessage[] = []
  let currentTime = new Date('2024-03-01T09:00:00').getTime()

  const selfName = '小宇'
  const otherName = '小雨'
  const selfOldName = '宇哥' // 曾用名，测试改名识别

  function add(sender: string, content: string, delayMinutes = 5) {
    currentTime += delayMinutes * 60 * 1000
    messages.push({
      id: `demo-${messages.length}`,
      timestamp: currentTime,
      senderName: sender,
      content,
      type: 'text',
    })
  }

  // === 第一阶段：蜜月期 (3月初) ===
  add(selfName, '早安呀！今天天气好好 ☀️', 1)
  add(otherName, '早！我也刚醒，昨晚梦到你了', 3)
  add(selfName, '真的假的？梦到什么了？', 2)
  add(otherName, '梦到我们一起去了海边，你在给我拍照', 8)
  add(selfName, '哈哈哈那下次真带你去！我已经在看攻略了', 5)
  add(otherName, '好呀好呀！我想去吃海鲜 🦐', 10)
  add(selfName, '没问题，包在我身上', 15)
  add(otherName, '爱你爱你 💕', 3)
  add(selfName, '我也爱你！今天工作加油哦', 2)

  // === 第二阶段：日常 (3月中) ===
  currentTime = new Date('2024-03-15T12:00:00').getTime()
  add(otherName, '吃饭了吗？', 1)
  add(selfName, '刚吃完，你呢？', 30)
  add(otherName, '在吃呢，今天食堂有红烧肉', 5)
  add(selfName, '羡慕了，我这只有沙拉 😭', 10)
  add(otherName, '哈哈哈哈减肥呢你', 3)

  // === 改名测试 ===
  currentTime = new Date('2024-03-20T20:00:00').getTime()
  add(otherName, '你怎么改名字了？', 1)
  add(selfOldName, '想换个风格，不好看吗？', 5)
  add(otherName, '好看好看，宇哥 😎', 3)
  add(selfOldName, '哈哈哈别闹', 2)

  // === 第三阶段：第一次争吵 (4月初) ===
  currentTime = new Date('2024-04-05T21:00:00').getTime()
  add(otherName, '你今晚又去哪儿了？', 1)
  add(selfName, '和朋友吃饭啊，不是跟你说过了', 15)
  add(otherName, '但你也没说这么晚啊', 10)
  add(selfName, '我也没办法，大家聊得开心就多待了会儿', 20)
  add(otherName, '每次都是这个借口', 5)
  add(selfName, '那你想怎样？', 30)
  add(otherName, '我不想怎样，你随便吧', 10)
  add(selfName, '能不能别这样，有话好好说', 60)
  add(otherName, '我说了你听吗？', 30)
  add(selfName, '我在听啊', 15)
  add(otherName, '算了，我睡了', 10)

  // === 冷战期 ===
  currentTime = new Date('2024-04-06T10:00:00').getTime()
  add(selfName, '早安', 1)
  // 对方很久不回
  currentTime = new Date('2024-04-06T18:00:00').getTime()
  add(selfName, '还在生气吗？', 1)
  add(otherName, '没', 120)
  add(selfName, '那晚上一起吃饭？', 30)
  add(otherName, '不了，有安排了', 60)
  add(selfName, '什么安排？', 30)
  add(otherName, '朋友', 120)

  // === 和好 ===
  currentTime = new Date('2024-04-08T19:00:00').getTime()
  add(selfName, '对不起，那天是我不对，没考虑你的感受', 1)
  add(otherName, '……', 30)
  add(selfName, '我不该让你担心的，以后我会提前说', 10)
  add(otherName, '你知道就好', 60)
  add(selfName, '别生气了好不好 🥺', 10)
  add(otherName, '哼', 30)
  add(selfName, '请你吃你最爱的火锅赔罪？', 15)
  add(otherName, '……两顿', 60)
  add(selfName, '成交！周末就去！', 5)
  add(otherName, '这还差不多 😤', 3)

  // === 稳定期 (5月) ===
  currentTime = new Date('2024-05-10T14:00:00').getTime()
  add(otherName, '在干嘛', 1)
  add(selfName, '在工作呢，你呢', 45)
  add(otherName, '我也是，好烦', 10)
  add(selfName, '怎么了', 20)
  add(otherName, '项目 deadline 要到了', 5)
  add(selfName, '加油，我相信你', 15)
  add(otherName, '嗯嗯', 30)
  add(selfName, '晚上给你带奶茶', 60)
  add(otherName, '好～', 30)

  // === 倦怠信号 (6月) ===
  currentTime = new Date('2024-06-20T20:00:00').getTime()
  add(selfName, '今天怎么样', 1)
  add(otherName, '还行', 120)
  add(selfName, '就是还行？', 30)
  add(otherName, '嗯', 60)
  add(selfName, '你最近是不是有心事', 30)
  add(otherName, '没有', 90)
  add(selfName, '感觉你回消息越来越慢了', 30)
  add(otherName, '忙', 60)
  add(selfName, '好吧', 10)

  currentTime = new Date('2024-06-21T09:00:00').getTime()
  add(selfName, '早安', 1)
  add(otherName, '早', 180)

  currentTime = new Date('2024-06-22T15:00:00').getTime()
  add(otherName, '在吗', 1)
  add(selfName, '在，怎么了', 90)
  add(otherName, '没事', 120)

  // === 尝试修复 (6月底) ===
  currentTime = new Date('2024-06-25T21:00:00').getTime()
  add(selfName, '我们聊聊吧', 1)
  add(otherName, '聊什么', 60)
  add(selfName, '最近感觉你不太开心，是我哪里做得不好吗', 10)
  add(otherName, '不是你的问题', 120)
  add(selfName, '那是怎么了，你可以跟我说', 15)
  add(otherName, '就是最近压力大，不太想说话', 60)
  add(selfName, '我理解，那我陪你，不用说话也行', 15)
  add(otherName, '嗯', 30)
  add(selfName, '周末我带你去散散心吧', 60)
  add(otherName, '好', 120)

  // === 回暖 (7月) ===
  currentTime = new Date('2024-07-05T10:00:00').getTime()
  add(otherName, '昨晚睡得好吗', 1)
  add(selfName, '挺好的，你呢', 15)
  add(otherName, '也挺好的，周末去哪玩？', 30)
  add(selfName, '去植物园怎么样，你不是说想拍照', 10)
  add(otherName, '好啊！我要穿那条白裙子', 5)
  add(selfName, '期待 😍', 5)

  return messages
}

export function getDemoParticipants() {
  return [
    { name: '小宇', wxid: 'wxid_demo_self' },
    { name: '小雨', wxid: 'wxid_demo_other' },
    { name: '宇哥', wxid: 'wxid_demo_self' }, // 曾用名
  ]
}
