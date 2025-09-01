#!/bin/bash

set -e

export KUBECONFIG=/etc/kubernetes/admin.conf

echo "Fixing ArgoCD ingress configuration..."

# Delete the current ingress
kubectl delete ingress argocd-server -n argocd

# Create a new ingress with proper annotations
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
EOF

echo "ArgoCD ingress fixed!"
echo "You can now access ArgoCD at: http://172.89.0.240 (using the IP directly)"
echo "Or add '172.89.0.240 argocd.example.com' to your /etc/hosts file" 