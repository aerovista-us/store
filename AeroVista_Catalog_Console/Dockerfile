# Serve Catalog Console v1.1 (static HTML/JS) with nginx
FROM nginx:alpine

# Serve v1.1 at document root
COPY v1.1 /usr/share/nginx/html

# Optional: custom nginx config for SPA / 404 fallback (uncomment if needed)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
