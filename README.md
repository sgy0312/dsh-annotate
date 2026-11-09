# dsh-annotate

划词批注 —— 给 DeepSeek Harness Web 的对话加一层「引用 + 批注」的上下文。

在已完成的回复里选中一段文字，浮层里写一句可选批注，确认后作为引用块进入输入框，
随消息一起发给模型。模型同时看到「你在说哪句话」和「你想说什么」。

## 交互

1. 在已结束的回复里**选中文字** → 选区上方浮出批注卡片（最多展示 3 行摘录 + 评论输入框 + 确认按钮）。
2. 评论可以留空，留空即纯引用。
3. `Enter` 提交，`Esc` 取消，焦点不在输入框时 `⌘C / Ctrl+C` 复制选中原文。

选中态不会被浮层抢走：浮层出现时不自动聚焦输入框，卡片上除输入框以外的位置按下鼠标也不会
清掉选区。只有你主动点进输入框，焦点才会转移。

## 发送出去的样子

```
> 所以，如果你说的"联系人"是"联系人姓名、岗位、联系人手机"等，
> ↳ 批注：这条和 KNVK 字段对不上，再核一遍
```

模型读到的是普通 Markdown 引用块，不依赖任何私有格式。已发送的消息里这段会折叠成引用卡片。

## 安装

```bash
dsh plugin --profile <你的 profile> add /path/to/dsh-annotate
```

也可以走 npm / git 地址。装完重启 DSH（或让 HMR 重新组合）后，刷新浏览器页面。

### 手动挂载

profile 的 `cordis.patch.yml` 里加一行，并把包放进 profile 的 `node_modules`：

```yaml
- insert:
    - id: dsh-annotate
      name: dsh-annotate
```

### 关于内置的「引用文本」按钮

`@deepseek-ai/dsh-message-quotes` 同样抢对话选区的 `selection` 手势。交互注册表只保留第一个
`open()` 的处理器，两者同时启用时，出现哪个按钮取决于注册顺序。本包的
[cordis.patch.yml](./cordis.patch.yml) 会把那一行 `disabled: true`，让批注面板接手。
如果你更想保留官方引用按钮，删掉该行即可。

## 已知限制

- **不支持流式中的回复**。宿主只给 `settled` 状态的回复加选区源，这是配合虚拟滚动的有意设计。
- **输入框里是引用块，不是独立胶囊**。草稿的 quote 节点只存文本，没有 comment 字段，
  所以没有 ChatGPT 那种 `💬 1 annotation` 汇总条和序号角标。要那个效果需要 fork
  `dsh-client-ui-conversation` 增加节点类型。
- **草稿冻结时提交会被拒绝**（该轮仍在生成、或还有未发送的块）。此时卡片保持打开并提示，
  已输入的批注不会丢。

## 包结构

| 文件 | 作用 |
|---|---|
| `lib/index.js` | 宿主半（空实现，纯浏览器插件） |
| `lib/client.js` | 全部浏览器逻辑：选区浮层、引用规则、样式 |
| `cordis.patch.yml` | bundle 挂载层 |
| `locale/*.json` | 插件市场里的标题与简介 |

## 兼容性

`dsh >= 0.2.0`。依赖的公开扩展点：`ctx.uiConversation.interactions`、
`ctx.uiConversation.userText`、`conversation.chat.text-interaction`、
`conversation.user.text.node`。

## License

MIT
