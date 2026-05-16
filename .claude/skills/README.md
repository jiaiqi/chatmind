# Claude Code Skills - ChatMind

本目录存放本项目启用的 Claude Code skills。Claude Code 启动时会自动从该目录加载，团队成员 clone 后即可获得相同的 skill 支持。

## 项目栈速览

Vue 3.5 + TypeScript 6 + Vite 8 + Pinia 3 + Naive UI + ECharts 6 + Dexie 4（IndexedDB）+ 自实现 OpenAI 兼容 AI 客户端（DeepSeek/Kimi/Ollama）。npm 包管理，SPA（无 vue-router），目前无测试。

---

## 已安装的 Vendor Skills（共 18 个，按相关度分组）

### 核心栈匹配（强相关，写代码时高频触发）

| Skill | 用途 |
|------|------|
| `vue-best-practices` | Vue.js 任务的强制工作流，组合式 API + `<script setup>` + TS |
| `vue` | Vue 3 SFC、`defineProps/defineEmits/defineModel`、reactivity |
| `pinia` | Store 定义、state/getters/actions、组合式 store |
| `vite` | Vite 8 配置、插件 API、Rolldown 迁移、manualChunks |
| `vueuse-functions` | VueUse 组合式函数（Dexie + IndexedDB 反应式标配） |
| `ui-ux-pro-max` | UI/UX 设计智能（67 风格、96 配色、57 字体配对） |

### 项目优化方向（按需触发）

| Skill | 用途 |
|------|------|
| `web-design-guidelines` | UI/无障碍/UX 审查 |
| `vue-testing-best-practices` | Vue 测试（Vitest + VTU + Playwright） |
| `vitest` | 单元测试框架（项目后续补单测时用） |

### 未来扩展（条件触发）

| Skill | 触发条件 |
|------|---------|
| `vue-router-best-practices` | 若引入 vue-router |
| `nuxt` | 若迁移到 Nuxt 全栈 |
| `pnpm` | 若改用 pnpm |
| `unocss` | 若引入 UnoCSS 原子化 CSS |
| `turborepo` | 若拆 monorepo |
| `antfu` | 若采用 Anthony Fu 工具链（ESLint Flat Config 等） |
| `tsdown` | 若把 analyzer 抽成独立库发布 |
| `vitepress` | 若搭文档站 |
| `slidev` | 若做技术演示 |

---

## Claude Code 内置 Skills（无源文件，自动可用）

| Skill | 用途 |
|------|------|
| `simplify` | 审查变更代码，做复用 / 质量 / 效率改进 |
| `fewer-permission-prompts` | 扫描会话，自动生成 `.claude/settings.json` 权限白名单 |
| `update-config` | 配置 settings.json：hooks、permissions、env vars |
| `keybindings-help` | 自定义键盘快捷键 |
| `loop` | 周期性运行某个 prompt / slash command |
| `claude-api` | Anthropic SDK 应用开发（本项目暂不触发） |
| `init` | 初始化 CLAUDE.md |
| `review` | PR review |
| `security-review` | 当前分支变更的安全审查 |

---

## Skills 是怎么被触发的

Claude Code 在每轮对话开始时把所有 skill 的 `description` 字段注入到系统提示里。当 Claude 判断你的请求和某个 skill 的描述匹配时，会自动调用对应 skill 加载详细指令。**你不需要手动 `/<skill-name>`**——除非你想强制使用。

## 升级与同步

vendor skills 来自 [antfu/skills](https://github.com/antfu/skills) 等仓库，每个 skill 目录下的 `SYNC.md` 记录了同步来源和 git SHA。需要升级时：

```bash
# 比对用户级（最新）与项目级
diff -r ~/.claude/skills/<skill-name> .claude/skills/<skill-name>

# 整体覆盖项目级
cp -r ~/.claude/skills/<skill-name> .claude/skills/
```

## 移除某个 skill

```bash
rm -rf .claude/skills/<skill-name>
git rm -r .claude/skills/<skill-name>
git commit -m "chore(claude): remove <skill-name> skill"
```
