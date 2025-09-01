#!/bin/bash

set -e

export KUBECONFIG=/etc/kubernetes/admin.conf

echo "Starting post-cluster setup..."

# Install MetalLB
echo "Installing MetalLB..."
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready before applying configuration
sleep 30
echo "Waiting for MetalLB pods to be ready..."
kubectl wait --for=condition=ready pod -l app=metallb -n metallb-system --timeout=300s

# Apply MetalLB configuration
kubectl apply -f /vagrant/metallb-config.yaml

# Install Helm
echo "Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# Add Helm repos
echo "Adding Helm repositories..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install NGINX Ingress Controller via Helm
echo "Installing NGINX Ingress Controller..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer

# Install cert-manager via Helm
# echo "Installing cert-manager..."
# helm upgrade --install cert-manager jetstack/cert-manager \
#   --namespace cert-manager --create-namespace \
#   --set installCRDs=true

# Install ArgoCD via Helm
echo "Installing ArgoCD..."
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd --create-namespace \
  --set server.ingress.enabled=true \
  --set server.ingress.ingressClassName=nginx \
  --set server.insecure=true \
  --set server.extraArgs="{--insecure}"

# Wait for all pods to be ready
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx --timeout=300s
# kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=cert-manager -n cert-manager --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Apply ClusterIssuer for cert-manager
# kubectl apply -f /vagrant/cluster-issuer.yaml

# Get ArgoCD admin password
echo "ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo

# Fix ArgoCD ingress for HTTP access
echo "Fixing ArgoCD ingress configuration..."
kubectl delete ingress argocd-server -n argocd --ignore-not-found=true

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
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
              number: 80
EOF

echo "Post-cluster setup completed successfully!"
echo "ArgoCD is accessible at: http://172.89.0.240"
echo "Or add '172.89.0.240 argocd.example.com' to your /etc/hosts file" 