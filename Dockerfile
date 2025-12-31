# Phonics App Docker Image
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（只安装生产依赖）
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p data/audio data/phonics-audio

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server/index.js"]
