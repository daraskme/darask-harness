import { fileURLToPath } from 'node:url';
import { loadSkillFile } from './skill-media.mjs';
export const COMPUTER_SKILL_FILE = fileURLToPath(new URL('../skills/computer-use/SKILL.md', import.meta.url));
export function registerComputerSkill(ctx) {
  ctx.inject(['skills'], scope => scope.skills.register(loadSkillFile(COMPUTER_SKILL_FILE)));
}
export const COMPUTER_PROMPT = '画面操作では computer-use スキルを読み込む。PC アプリには darask_computer、Web には Kitesurf を使う。画像入力に非対応のモデルも windows → inspect → 要素 ID による操作を利用できる。pcs で接続先を選び、リモート操作では毎回 node を渡す。node: local は実行中ワークスペースの PC。';
