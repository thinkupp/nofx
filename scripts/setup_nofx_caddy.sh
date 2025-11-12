#!/usr/bin/env bash
set -euo pipefail

echo "=== [NOFX + Caddy | 简化版 无隐藏后缀 + 自签 HTTPS] ==="

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 运行此脚本" >&2
  exit 1
fi

########################################
# 1/6 检测本机 IP（用于自签证书 CN/SAN）
########################################

DEFAULT_IP="$(hostname -I 2>/dev/null | awk 'NF{print $1; exit}')"
if [[ -z "${DEFAULT_IP:-}" ]]; then
  echo "无法自动获取 IP，请手动指定 YOUR_IP" >&2
  exit 1
fi
YOUR_IP="$DEFAULT_IP"
echo "使用 IP: $YOUR_IP 生成自签证书"

########################################
# 2/6 停止可能占用 80/443 的 nginx
########################################

echo "[2/6] 停止可能占用 80/443 的 nginx..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

########################################
# 3/6 创建 Docker 网络并连接容器
########################################

echo "[3/6] 配置 Docker 网络 nofx-net..."
docker network create nofx-net 2>/dev/null || true

for name in nofx-frontend nofx-trading; do
  if docker ps --format '{{.Names}}' | grep -qw "$name"; then
    docker network connect nofx-net "$name" 2>/dev/null || true
  else
    echo "⚠ 容器 $name 未运行，请确认它们已启动"
  fi
done

########################################
# 4/6 清理旧 Caddy 容器
########################################

docker rm -f caddy 2>/dev/null || true

########################################
# 5/6 生成自签证书 + Caddyfile
########################################

mkdir -p /etc/caddy

cat > /etc/caddy/selfsigned-openssl.cnf <<EOF
[ req ]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[ req_distinguished_name ]
CN = $YOUR_IP
[ v3_req ]
subjectAltName = @alt_names
[ alt_names ]
IP.1 = $YOUR_IP
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/caddy/selfsigned.key \
  -out /etc/caddy/selfsigned.crt \
  -config /etc/caddy/selfsigned-openssl.cnf >/dev/null 2>&1

echo "[5/6] 写入 Caddyfile..."

cat > /etc/caddy/Caddyfile <<'EOF'
{
    auto_https off
}

:80 {
    redir https://{host}{uri}
}

:443 {
    tls /etc/caddy/selfsigned.crt /etc/caddy/selfsigned.key
    encode gzip

    # API 转发到后端
    @api path /api/* /swagger/* /healthz
    handle @api {
        reverse_proxy nofx-trading:8080
    }

    # 其它请求转前端
    handle {
        reverse_proxy nofx-frontend:80
    }
}
EOF

########################################
# 6/6 启动 Caddy 容器
########################################

echo "[6/6] 启动 Caddy 容器..."
docker run -d \
  --name caddy \
  --network nofx-net \
  -p 80:80 -p 443:443 \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /etc/caddy/selfsigned.crt:/etc/caddy/selfsigned.crt:ro \
  -v /etc/caddy/selfsigned.key:/etc/caddy/selfsigned.key:ro \
  caddy:latest >/dev/null

sleep 3
echo
echo "✅ 部署完成"
echo "访问地址:  https://$YOUR_IP"
echo "API 地址:  https://$YOUR_IP/api/..."
echo
echo "浏览器提示证书不受信任属正常，可导入 /etc/caddy/selfsigned.crt 以信任。"
