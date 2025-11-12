# NOFX 开发流程规范

## 📋 分支策略

```
upstream (官方项目 NoFxAiOS/nofx)
    ↓ 定期同步
  dev (开发分支)
    ↓ 测试通过后合并
  release (生产分支,服务器自动部署)
    ↑ 功能开发
  feature/* (功能分支)
```

### 分支说明

- **dev**: 开发主分支,定期同步 upstream,所有功能在此集成测试
- **release**: 生产分支,服务器自动拉取并部署,只接受经过验证的代码
- **feature/***: 功能开发分支,命名格式: `feature/功能名称`

## 🔄 标准开发流程

### 1️⃣ 同步原项目更新 (每周一次或开发前)

```bash
# 切换到 dev 分支
git checkout dev

# 拉取 upstream 最新代码
git fetch upstream
git merge upstream/dev

# 解决冲突(如有)
# ... 解决冲突后 ...
git add .
git commit -m "chore: sync upstream"

# 推送到远程
git push origin dev
```

### 2️⃣ 开发新功能

```bash
# 确保 dev 是最新的
git checkout dev
git pull origin dev

# 创建功能分支
git checkout -b feature/your-feature-name

# 进行开发
# ... 编码、测试 ...

# 提交代码
git add .
git commit -m "feat: 功能描述"

# 推送功能分支
git push origin feature/your-feature-name
```

### 3️⃣ 合并到开发分支

```bash
# 同步最新的 dev
git checkout feature/your-feature-name
git fetch origin
git rebase origin/dev  # 保持历史清晰

# 解决冲突(如有)
# ... 解决冲突 ...
git add .
git rebase --continue

# 推送更新后的功能分支
git push origin feature/your-feature-name --force-with-lease

# 切换到 dev 并合并
git checkout dev
git merge feature/your-feature-name

# 推送到远程
git push origin dev
```

### 4️⃣ 部署到生产环境

```bash
# 在 dev 分支充分测试后
git checkout release
git pull origin release

# 合并 dev 到 release
git merge dev

# 推送到远程 (触发服务器自动部署)
git push origin release
```

### 5️⃣ 清理功能分支 (可选)

```bash
# 删除本地功能分支
git branch -d feature/your-feature-name

# 删除远程功能分支
git push origin --delete feature/your-feature-name
```

## 🚀 服务器自动部署配置

### 方式1: 使用 crontab 定时拉取

```bash
# 编辑 crontab
crontab -e

# 添加定时任务 (每5分钟检查一次)
*/5 * * * * cd /path/to/nofx && git pull origin release && docker-compose up -d --build >> /var/log/nofx-deploy.log 2>&1
```

### 方式2: 使用 Git Hooks

在服务器上创建 `/path/to/nofx/.git/hooks/post-merge`:

```bash
#!/bin/bash
echo "$(date): Deploying NOFX..." >> /var/log/nofx-deploy.log
docker-compose up -d --build >> /var/log/nofx-deploy.log 2>&1
echo "$(date): Deployment completed" >> /var/log/nofx-deploy.log
```

```bash
# 赋予执行权限
chmod +x /path/to/nofx/.git/hooks/post-merge
```

### 方式3: 使用 GitHub Actions + Webhook

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches:
      - release

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/nofx
            git pull origin release
            docker-compose up -d --build
```

## 📝 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整(不影响功能)
- `refactor:` 重构(不增加功能也不修复 bug)
- `perf:` 性能优化
- `test:` 添加或修改测试
- `chore:` 构建过程或辅助工具的变动

示例:
```bash
git commit -m "feat: 添加自动交易策略选择功能"
git commit -m "fix: 修复价格计算精度问题"
git commit -m "docs: 更新 API 文档"
```

## 🔍 常用命令速查

```bash
# 查看远程仓库配置
git remote -v

# 查看所有分支
git branch -a

# 查看当前分支状态
git status

# 查看与 upstream 的差异
git log origin/dev..upstream/dev

# 查看具体文件变化
git diff upstream/dev

# 放弃本地修改
git checkout -- <file>
git reset --hard HEAD

# 暂存当前修改
git stash
git stash pop
```

## ⚠️ 注意事项

1. **不要直接在 dev 和 release 分支开发**,始终使用功能分支
2. **release 分支只接受来自 dev 的合并**,不要直接提交
3. **合并到 release 前务必在 dev 充分测试**
4. **定期同步 upstream**,避免代码差异过大
5. **解决冲突时要小心**,确保不破坏原有功能
6. **重要修改前先创建备份分支**: `git checkout -b backup-yyyymmdd`

## 🆘 问题排查

### 问题1: 合并时出现冲突

```bash
# 查看冲突文件
git status

# 编辑冲突文件,手动解决冲突
# 搜索 <<<<<<< 、 ======= 、 >>>>>>> 标记

# 解决后标记为已解决
git add <resolved-file>

# 完成合并
git commit  # 或 git rebase --continue
```

### 问题2: 误提交到错误分支

```bash
# 撤销最后一次提交(保留修改)
git reset --soft HEAD~1

# 切换到正确分支
git checkout correct-branch

# 重新提交
git commit -m "your message"
```

### 问题3: 需要回滚 release

```bash
git checkout release
git log  # 找到要回滚的 commit

# 回滚到指定版本
git reset --hard <commit-hash>

# 强制推送 (谨慎使用!)
git push origin release --force
```

## 📞 联系方式

如有问题,请联系项目维护者或查看:
- 原项目: https://github.com/NoFxAiOS/nofx
- 你的 Fork: https://github.com/thinkupp/nofx
