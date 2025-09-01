#!/bin/bash

set -e

export KUBECONFIG=/etc/kubernetes/admin.conf

echo "Waiting for all worker nodes to be ready..."

# Wait for all worker nodes to join the cluster
while true; do
    READY_NODES=$(kubectl get nodes --no-headers | grep -c "Ready")
    TOTAL_WORKERS=2  # Adjust this number based on your worker count
    
    echo "Ready nodes: $READY_NODES (expecting $TOTAL_WORKERS workers + 1 master)"
    
    if [ "$READY_NODES" -ge "$((TOTAL_WORKERS + 1))" ]; then
        echo "All nodes are ready! Proceeding with post-cluster setup..."
        break
    fi
    
    echo "Waiting 30 seconds for more nodes to join..."
    sleep 30
done

# Run the post-cluster setup
echo "Starting post-cluster setup..."
bash /vagrant/post-cluster-setup.sh 