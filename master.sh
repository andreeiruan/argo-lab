#!/bin/bash

set -e
cat > kubeadm-config.yml <<EOF
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 172.89.0.11
  bindPort: 6443
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: 10.244.0.0/16
---
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
cgroupDriver: systemd
EOF

kubeadm init --config kubeadm-config.yml

export KUBECONFIG=/etc/kubernetes/admin.conf

kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

echo "Kubernetes cluster initialized successfully!"
echo "Now join the worker nodes using the join command in /vagrant/join-command.sh"
echo "After all workers are ready, run: sudo bash /vagrant/post-cluster-setup.sh"

kubeadm token create --print-join-command > /vagrant/join-command.sh
chmod +x /vagrant/join-command.sh